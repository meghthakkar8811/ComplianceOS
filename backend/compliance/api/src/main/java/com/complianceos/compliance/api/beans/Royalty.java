package com.complianceos.compliance.api.beans;

/**
 * A mine's base royalty liability for one mineral's grade, for one period — {@code quantity} is
 * the sum of every {@link Sale} of {@code mineral}'s {@code grade} for the period, and {@code
 * amount} is that quantity against the applicable {@link RoyaltyRate}. One row per (mineral,
 * grade) the mine dispatched that period: some minerals' Schedule rate is itself
 * grade-differentiated (see {@link RoyaltyRate}), so two grades of the same mineral can carry
 * different rates — never a single combined figure for the whole mineral, let alone the whole
 * mine. The DMF and NMET contributions owed on top of this, and the GST owed on it under reverse
 * charge, are separate figures — see {@link DmfContribution}, {@link NmetContribution}, and
 * {@link RoyaltyGst}. Computed fresh on every read, never stored: at this product's scale,
 * caching this and recalculating it on every write that could affect it is a correctness risk (a
 * write path that forgets to trigger it goes silently stale) for a performance gain nobody needs.
 * {@code id} is still deterministic ({@link #id}) so a {@link MinePayment#getReferenceId()} has a
 * stable value to reference even though no document exists at that id.
 */
public record Royalty(
    String id,
    String mineId,
    int year,
    String month,
    String mineral,
    String grade,
    String royaltyRateId,
    double quantity,
    double amount) {

  /**
   * The deterministic id of the royalty for {@code mineId}, {@code year}, {@code month}, {@code
   * mineral}, {@code grade}.
   */
  public static String id(
      final String mineId, final int year, final String month, final String mineral, final String grade) {
    return mineId + ":" + year + ":" + Month.valueOfOrDefault(month).name() + ":" + mineral + ":" + grade;
  }
}
