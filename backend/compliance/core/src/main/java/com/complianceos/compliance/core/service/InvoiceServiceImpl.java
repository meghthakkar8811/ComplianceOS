package com.complianceos.compliance.core.service;

import com.agentengine.util.cloudstorage.CloudStorageService;
import com.agentengine.util.common.codec.JsonUtils;
import com.agentengine.util.common.exception.AssetNotFoundException;
import com.agentengine.util.common.exception.DuplicateAssetException;
import com.agentengine.util.common.exception.StaleStateException;
import com.agentengine.util.common.exception.UnauthorizedException;
import com.agentengine.util.common.query.Filters;
import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Page;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.common.query.Sort;
import com.agentengine.util.common.beans.FileDetails;
import com.agentengine.util.common.repository.DocumentBackend;
import com.agentengine.util.common.utils.StringUtils;
import com.agentengine.util.common.validation.ValidationService;
import com.agentengine.util.context.Context;
import com.agentengine.util.mongodb.mongo.SequenceRepository;
import com.agentengine.util.tenancy.Permission;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.Buyer;
import com.complianceos.compliance.api.beans.GstRate;
import com.complianceos.compliance.api.beans.Invoice;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.Mineral;
import com.complianceos.compliance.api.beans.Sale;
import com.complianceos.compliance.api.beans.SaleType;
import com.complianceos.compliance.api.services.InvoiceService;
import com.complianceos.compliance.api.services.MineralService;
import com.complianceos.compliance.core.repository.BuyerRepository;
import com.complianceos.compliance.core.repository.GstRateRepository;
import com.complianceos.compliance.core.repository.InvoiceRepository;
import com.complianceos.compliance.core.repository.MineRepository;
import com.complianceos.compliance.core.repository.SaleRepository;
import jakarta.inject.Inject;
import jakarta.inject.Singleton;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Singleton
public class InvoiceServiceImpl implements InvoiceService {

  private static final int INVOICE_SEQUENCE_DIGITS = 5;
  private static final int FINANCIAL_YEAR_START_MONTH = 4;
  private static final String INVOICE_TEMPLATE_PATH = "templates/invoice.html";

  private final MineRepository mineRepository;
  private final BuyerRepository buyerRepository;
  private final SaleRepository saleRepository;
  private final InvoiceRepository invoiceRepository;
  private final GstRateRepository gstRateRepository;
  private final MineralService mineralService;
  private final SequenceRepository sequenceRepository;
  private final CloudStorageService cloudStorageService;

  @Inject
  public InvoiceServiceImpl(
      final MineRepository mineRepository,
      final BuyerRepository buyerRepository,
      final SaleRepository saleRepository,
      final InvoiceRepository invoiceRepository,
      final GstRateRepository gstRateRepository,
      final MineralService mineralService,
      final DocumentBackend documentBackend,
      final ValidationService validationService,
      final CloudStorageService cloudStorageService) {
    this.mineRepository = mineRepository;
    this.buyerRepository = buyerRepository;
    this.saleRepository = saleRepository;
    this.mineralService = mineralService;
    this.invoiceRepository = invoiceRepository;
    this.gstRateRepository = gstRateRepository;
    this.sequenceRepository = new SequenceRepository(documentBackend, validationService);
    this.cloudStorageService = cloudStorageService;
  }

  @Override
  public Map<String, Invoice> getInvoices(final List<String> ids) {
    return invoiceRepository.findByIds(ids);
  }

  @Override
  public PaginatedResult<Invoice> findInvoices(final Query query) {
    return invoiceRepository.findByQuery(query == null ? new Query() : query);
  }

  @Override
  public Invoice getOrCreateInvoice(final String saleId) {
    final Sale sale = saleRepository.findById(saleId);
    if (sale == null) {
      throw new AssetNotFoundException(AssetClass.SALE, saleId);
    }
    requireMineEdit(sale.getMineId());
    final Mine mine = mineRepository.findById(sale.getMineId());
    final Buyer buyer =
        StringUtils.isBlank(sale.getBuyerId()) ? null : buyerRepository.findById(sale.getBuyerId());
    if (!requiresInvoice(sale, mine, buyer)) {
      return null;
    }
    final Invoice invoice = invoiceRepository.findById(sale.getId());
    return invoice == null ? createInvoice(sale, mine, buyer) : ensureInvoiceFileUploaded(invoice, sale, mine, buyer);
  }

  private static boolean requiresInvoice(final Sale sale, final Mine mine, final Buyer buyer) {
    return switch (SaleType.valueOfOrDefault(sale.getType())) {
      case DOMESTIC, TRANSFER, EXPORT -> true;
      case CONSUMPTION -> !Objects.equals(mine.getGstin(), buyer.getGstin());
      case UNKNOWN -> false;
    };
  }

  /**
   * Inserts the invoice record for a sale that doesn't have one yet, then ensures its PDF is
   * uploaded. The invoice's id is always set to the sale's own id, so {@code Invoice}'s unique
   * primary key is what actually decides a race between two concurrent requests for the same
   * sale: the loser's insert fails with {@link DuplicateAssetException} before it computes or
   * uploads anything, so it never creates an orphaned invoice or file — it finishes whichever
   * invoice the winner inserted instead (which may itself still be missing its PDF, e.g. if the
   * winner's own request crashed between inserting the record and uploading the file).
   */
  private Invoice createInvoice(final Sale sale, final Mine mine, final Buyer buyer) {
    if (SaleType.valueOfOrDefault(sale.getType()) == SaleType.CONSUMPTION) {
      // requiresInvoice() already established the mine and buyer GSTINs differ for a CONSUMPTION
      // sale to reach here — open-market valuation under Rule 28, which this plan doesn't design.
      throw new UnsupportedOperationException(
          "Rule 28 open-market valuation for deemed-supply CONSUMPTION sales is not yet implemented");
    }

    final boolean interState = !mine.getState().equals(buyer.getState());
    final GstRate gstRate = Objects.requireNonNull(getGstRate(mineralNameFor(sale), sale.getDispatchedOn()));
    final double rate = gstRate.getRate();
    final double totalGst = sale.getSaleValue() * rate;
    final double cgstAmount = interState ? 0 : totalGst / 2;
    final double sgstAmount = interState ? 0 : totalGst - cgstAmount;
    final double igstAmount = interState ? totalGst : 0;

    final Invoice invoice = new Invoice();
    invoice.setId(sale.getId());
    invoice.setMineId(mine.getId());
    invoice.setBuyerId(buyer.getId());
    invoice.setInvoiceNumber(nextInvoiceNumber(mine, sale.getDispatchedOn()));
    invoice.setInterState(interState);
    invoice.setCgstAmount(cgstAmount);
    invoice.setSgstAmount(sgstAmount);
    invoice.setIgstAmount(igstAmount);
    invoice.setGstRateId(gstRate.getId());

    final Invoice created;
    try {
      created = invoiceRepository.save(invoice);
    } catch (final DuplicateAssetException exception) {
      return ensureInvoiceFileUploaded(invoiceRepository.findById(sale.getId()), sale, mine, buyer);
    }

    return ensureInvoiceFileUploaded(created, sale, mine, buyer);
  }

  /**
   * Renders and uploads {@code invoice}'s PDF if it doesn't have one yet — covering both a
   * brand-new invoice and one left behind by a request that inserted the invoice record but
   * crashed before uploading its file. The version-guarded save is what decides a race between
   * two requests both recovering the same unfinished invoice: the loser's save fails with {@link
   * StaleStateException}, so it re-reads and returns whatever the winner actually stored instead
   * of uploading a second, orphaned file. Not cleaned up on loss — rare enough to accept.
   */
  private Invoice ensureInvoiceFileUploaded(final Invoice invoice, final Sale sale, final Mine mine, final Buyer buyer) {
    if (invoice.getInvoiceFile() != null) {
      return invoice;
    }
    final byte[] pdfBytes = renderInvoicePdf(invoice, mine, buyer, sale);
    invoice.setInvoiceFile(uploadInvoicePdf(invoice, sale, pdfBytes));
    try {
      return invoiceRepository.save(invoice);
    } catch (final StaleStateException exception) {
      return invoiceRepository.findById(invoice.getId());
    }
  }

  /**
   * Renders {@code invoice} to PDF bytes via {@link PDFUtils}, substituting its, {@code mine}'s,
   * {@code buyer}'s, and {@code sale}'s own fields into {@code templates/invoice.html}, which
   * formats dates and currency amounts itself. The one value the template can't reach on its
   * own — the mineral's display name, resolved from {@code sale.getMineral()} (a {@link
   * Mineral} id) via {@link MineralService} — is written back into the same {@code sale} map
   * the template dots into, rather than flattened out to a new top-level key.
   */
  private byte[] renderInvoicePdf(final Invoice invoice, final Mine mine, final Buyer buyer, final Sale sale) {
    try (InputStream pdf =
        PDFUtils.generatePDFFromHtml(INVOICE_TEMPLATE_PATH, invoiceTemplateContext(invoice, mine, buyer, sale))) {
      return pdf.readAllBytes();
    } catch (final IOException exception) {
      throw new UncheckedIOException("Failed to read invoice PDF bytes for invoice " + invoice.getId(), exception);
    }
  }

  private Map<String, Object> invoiceTemplateContext(
      final Invoice invoice, final Mine mine, final Buyer buyer, final Sale sale) {
    final Map<String, Object> mineMap = JsonUtils.toMap(mine);
    final Map<String, Object> buyerMap = JsonUtils.toMap(buyer);

    final Map<String, Object> saleMap = JsonUtils.toMap(sale);
    saleMap.put("mineral", mineralNameFor(sale));

    final Map<String, Object> invoiceMap = JsonUtils.toMap(invoice);

    return Map.of("mine", mineMap, "buyer", buyerMap, "sale", saleMap, "invoice", invoiceMap);
  }

  /** The display name of the mineral {@code sale.getMineral()} (a {@link Mineral} id) names. */
  private String mineralNameFor(final Sale sale) {
    final Mineral mineral = mineralService.getMinerals(sale.getMineId(), List.of(sale.getMineral())).get(sale.getMineral());
    return mineral == null ? null : mineral.getMineral();
  }

  private FileDetails uploadInvoicePdf(final Invoice invoice, final Sale sale, final byte[] pdfBytes) {
    final String key = "invoices/" + invoice.getMineId() + "/" + invoice.getId() + ".pdf";
    final String name = invoice.getInvoiceNumber().replace("/", "_") + ".pdf";
    return cloudStorageService.upload(
        key,
        name,
        new ByteArrayInputStream(pdfBytes),
        (long) pdfBytes.length,
        "application/pdf",
        Map.of("saleId", sale.getId(), "mineId", invoice.getMineId()));
  }

  /**
   * The next invoice number for {@code mine} in the financial year {@code dispatchedOn} falls in:
   * {@code "{gstin-or-mineId}/{financialYear}/{00001}"}, backed by the atomic Mongo counter {@link
   * SequenceRepository}, namespaced per mine and financial year so each resets to 1 every April.
   */
  private String nextInvoiceNumber(final Mine mine, final long dispatchedOn) {
    final String financialYear = financialYearLabel(dispatchedOn);
    final long sequence = sequenceRepository.increment("INVOICE:" + mine.getId() + ":" + financialYear);
    final String prefix = StringUtils.isNotBlank(mine.getGstin()) ? mine.getGstin() : mine.getId();
    return prefix + "/" + financialYear + "/" + zeroPaddedSequence(sequence);
  }

  /** The Indian financial-year label (April 1 - March 31) {@code epochMillis} falls in, e.g. {@code "2026-27"}. */
  private static String financialYearLabel(final long epochMillis) {
    final LocalDate date = Instant.ofEpochMilli(epochMillis).atZone(ZoneOffset.UTC).toLocalDate();
    final int startYear =
        date.getMonthValue() >= FINANCIAL_YEAR_START_MONTH ? date.getYear() : date.getYear() - 1;
    return startYear + "-" + zeroPaddedYearSuffix((startYear + 1) % 100);
  }

  private static String zeroPaddedSequence(final long sequence) {
    return String.format("%0" + INVOICE_SEQUENCE_DIGITS + "d", sequence);
  }

  private static String zeroPaddedYearSuffix(final int yearSuffix) {
    return String.format("%02d", yearSuffix);
  }

  /** The {@link GstRate} for {@code mineral} effective as of {@code asOf}, or null if none is. */
  private GstRate getGstRate(final String mineral, final long asOf) {
    return Context.asSystemCustomer()
        .get(
            () ->
                gstRateRepository
                    .findByQuery(
                        new Query()
                            .withFilter(
                                Filters.and(
                                    Filters.eq(GstRate.FIELD_MINERAL, mineral),
                                    Filters.lte(GstRate.FIELD_EFFECTIVE_FROM, asOf)))
                            .withSort(new Sort(GstRate.FIELD_EFFECTIVE_FROM, Sort.Order.DESC))
                            .withPage(new Page(0, 1)))
                    .getItems()
                    .stream()
                    .findFirst()
                    .orElse(null));
  }

  /**
   * Neither {@link Sale} nor {@link Invoice} is independently permissioned — both are reached
   * only through their mine — so reading or generating an invoice for a sale requires the caller
   * to hold {@code EDIT} on that mine, same as any other write to a {@link Sale}.
   */
  private void requireMineEdit(final String mineId) {
    if (!mineRepository.hasPermission(mineId, Permission.EDIT)) {
      throw new UnauthorizedException(AssetClass.MINE, mineId);
    }
  }
}
