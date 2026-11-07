package com.complianceos.compliance.core.service;

import com.agentengine.util.common.query.Filters;
import com.agentengine.util.common.query.Page;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.common.query.Sort;
import com.agentengine.util.context.Context;
import com.complianceos.compliance.api.beans.DmfRate;
import com.complianceos.compliance.api.beans.GstRate;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.Mineral;
import com.complianceos.compliance.api.beans.MiningConstants;
import com.complianceos.compliance.api.beans.NmetRate;
import com.complianceos.compliance.api.beans.RoyaltyRate;
import com.complianceos.compliance.api.beans.Sale;
import com.complianceos.compliance.api.beans.SaleLiability;
import com.complianceos.compliance.api.services.MineralService;
import com.complianceos.compliance.core.repository.DmfRateRepository;
import com.complianceos.compliance.core.repository.GstRateRepository;
import com.complianceos.compliance.core.repository.MineRepository;
import com.complianceos.compliance.core.repository.NmetRateRepository;
import com.complianceos.compliance.core.repository.RoyaltyRateRepository;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneOffset;
import java.util.List;

/**
 * Computes a {@link Sale}'s royalty, DMF, NMET, and GST-on-royalty liability against whichever
 * rates are currently in force for the sale's period, mineral, grade, and mine's lease tier.
 */
public final class LiabilityCalculator {

  private final Sale sale;
  private final MineRepository mineRepository;
  private final MineralService mineralService;
  private final RoyaltyRateRepository royaltyRateRepository;
  private final DmfRateRepository dmfRateRepository;
  private final NmetRateRepository nmetRateRepository;
  private final GstRateRepository gstRateRepository;

  public LiabilityCalculator(
      final Sale sale,
      final MineRepository mineRepository,
      final MineralService mineralService,
      final RoyaltyRateRepository royaltyRateRepository,
      final DmfRateRepository dmfRateRepository,
      final NmetRateRepository nmetRateRepository,
      final GstRateRepository gstRateRepository) {
    this.sale = sale;
    this.mineRepository = mineRepository;
    this.mineralService = mineralService;
    this.royaltyRateRepository = royaltyRateRepository;
    this.dmfRateRepository = dmfRateRepository;
    this.nmetRateRepository = nmetRateRepository;
    this.gstRateRepository = gstRateRepository;
  }

  /** Computes and returns the complete {@link SaleLiability} snapshot for the sale. */
  public SaleLiability calculate() {
    final Mine mine = mineRepository.findById(sale.getMineId());
    final Mineral mineral =
        mine == null
            ? null
            : mineralService.getMinerals(sale.getMineId(), List.of(sale.getMineral())).get(sale.getMineral());
    final String mineralName = mineral == null ? null : mineral.getMineral();

    final SaleLiability liability = new SaleLiability();

    // Royalty
    final RoyaltyRate royaltyRate =
        (mine == null || mineralName == null) ? null : royaltyRateFor(mine, mineralName);
    final double royaltyAmount =
        royaltyRate == null ? 0 : sale.getQuantity() * royaltyRate.getRatePerTonne();
    liability.setRoyaltyRateId(royaltyRate == null ? null : royaltyRate.getId());
    liability.setRoyaltyAmount(royaltyAmount);

    // DMF
    final DmfRate dmfRate =
        mine == null ? null : latestDmfRate(tierOf(mine), sale.getDispatchedOn());
    liability.setDmfRateId(dmfRate == null ? null : dmfRate.getId());
    liability.setDmfAmount(dmfRate == null ? 0 : royaltyAmount * dmfRate.getRate());

    // NMET
    final NmetRate nmetRate = latestNmetRate(sale.getDispatchedOn());
    liability.setNmetRateId(nmetRate == null ? null : nmetRate.getId());
    liability.setNmetAmount(nmetRate == null ? 0 : royaltyAmount * nmetRate.getRate());

    // GST
    final GstRate gstRate =
        mineralName == null ? null : latestGstRate(mineralName, sale.getDispatchedOn());
    liability.setGstRateId(gstRate == null ? null : gstRate.getId());
    liability.setGstAmount(gstRate == null ? 0 : royaltyAmount * gstRate.getRate());

    return liability;
  }

  private YearMonth getPeriod() {
    return YearMonth.from(Instant.ofEpochMilli(sale.getDispatchedOn()).atZone(ZoneOffset.UTC));
  }

  private static String tierOf(final Mine mine) {
    return mine.getLeaseStartOn() >= MiningConstants.DMF_RATE_CHANGE_CUTOFF
        ? MiningConstants.LEASE_TIER_POST_2015
        : MiningConstants.LEASE_TIER_PRE_2015;
  }

  private RoyaltyRate royaltyRateFor(final Mine resolvedMine, final String mineral) {
    final YearMonth resolvedPeriod = getPeriod();
    final String state = resolvedMine.getState();
    final String grade = sale.getGrade();
    return Context.asSystemCustomer()
        .get(
            () -> {
              final RoyaltyRate gradeRate =
                  royaltyRateRepository.findById(
                      RoyaltyRate.id(
                          state, mineral, grade, resolvedPeriod.getYear(), resolvedPeriod.getMonth().name()));
              return gradeRate != null
                  ? gradeRate
                  : royaltyRateRepository.findById(
                      RoyaltyRate.id(
                          state, mineral, null, resolvedPeriod.getYear(), resolvedPeriod.getMonth().name()));
            });
  }

  /** The {@link DmfRate} for {@code tier} effective as of {@code asOf}, or null if none is. */
  private DmfRate latestDmfRate(final String tier, final long asOf) {
    return Context.asSystemCustomer()
        .get(
            () ->
                dmfRateRepository
                    .findByQuery(
                        new Query()
                            .withFilter(
                                Filters.and(
                                    Filters.eq(DmfRate.FIELD_TIER, tier),
                                    Filters.lte(DmfRate.FIELD_EFFECTIVE_FROM, asOf)))
                            .withSort(new Sort(DmfRate.FIELD_EFFECTIVE_FROM, Sort.Order.DESC))
                            .withPage(new Page(0, 1)))
                    .getItems()
                    .stream()
                    .findFirst()
                    .orElse(null));
  }

  /** The {@link NmetRate} effective as of {@code asOf}, or null if none is. */
  private NmetRate latestNmetRate(final long asOf) {
    return Context.asSystemCustomer()
        .get(
            () ->
                nmetRateRepository
                    .findByQuery(
                        new Query()
                            .withFilter(Filters.lte(NmetRate.FIELD_EFFECTIVE_FROM, asOf))
                            .withSort(new Sort(NmetRate.FIELD_EFFECTIVE_FROM, Sort.Order.DESC))
                            .withPage(new Page(0, 1)))
                    .getItems()
                    .stream()
                    .findFirst()
                    .orElse(null));
  }

  /** The {@link GstRate} for {@code mineral} effective as of {@code asOf}, or null if none is. */
  private GstRate latestGstRate(final String mineral, final long asOf) {
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
}
