package com.complianceos.compliance.core.service;

import com.agentengine.util.common.utils.ResourceUtils;
import com.agentengine.util.scripts.TemplateUtils;
import com.openhtmltopdf.pdfboxout.PdfRendererBuilder;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.UncheckedIOException;
import java.util.Map;

/**
 * Renders an HTML template (via the same Groovy-backed templating, {@link TemplateUtils}, {@code
 * MiningServiceImpl} uses for its DGMS registers and compliance deadlines) to a PDF, using
 * openhtmltopdf.
 */
public final class PDFUtils {

  private PDFUtils() {}

  public static InputStream generatePDFFromHtml(final String templatePath, final Map<String, Object> context) {
    final String html =
        TemplateUtils.renderTextTemplate(ResourceUtils.loadResourceAsString(templatePath), context);
    final ByteArrayOutputStream pdfBytes = new ByteArrayOutputStream();
    final PdfRendererBuilder builder = new PdfRendererBuilder();
    builder.withHtmlContent(html, null);
    builder.toStream(pdfBytes);
    try {
      builder.run();
    } catch (final IOException exception) {
      throw new UncheckedIOException("Failed to render PDF from template " + templatePath, exception);
    }
    return new ByteArrayInputStream(pdfBytes.toByteArray());
  }
}
