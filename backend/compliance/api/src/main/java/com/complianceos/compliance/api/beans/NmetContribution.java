package com.complianceos.compliance.api.beans;

/**
 * A mine's National Mineral Exploration Trust contribution for one period — a fraction of that
 * period's {@link Royalty#amount()}, against the applicable {@link NmetRate}. Computed fresh on
 * every read, never stored, for the same reason {@link Royalty} is: {@code id} is still
 * deterministic ({@link #id}) so a {@link MinePayment#getReferenceId()} has a stable value to
 * reference even though no document exists at that id.
 */
public record NmetContribution(
    String id,
    String mineId,
    int year,
    String month,
    String nmetRateId,
    double quantity,
    double amount) {

  /** The deterministic id of the contribution for {@code mineId}, {@code year}, {@code month}. */
  public static String id(final String mineId, final int year, final String month) {
    return mineId + ":" + year + ":" + Month.valueOfOrDefault(month).name();
  }
}
