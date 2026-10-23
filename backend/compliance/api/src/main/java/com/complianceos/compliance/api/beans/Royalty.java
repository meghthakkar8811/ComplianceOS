package com.complianceos.compliance.api.beans;

/**
 * A mine's royalty liability for one period — {@code quantity} is the sum of every
 * {@link Sale} for the period, and the paise amounts are that quantity against the
 * applicable {@link RoyaltyRate}, {@code DmfRate}, and {@code NmetRate}. Computed fresh on every
 * read, never stored: at this product's scale, caching this and recalculating it on every write
 * that could affect it is a correctness risk (a write path that forgets to trigger it goes
 * silently stale) for a performance gain nobody needs. {@code id} is still deterministic
 * ({@link #id}) so {@link MinePayment#getRoyaltyId()} has a stable value to reference even
 * though no document exists at that id.
 */
public record Royalty(
    String id,
    String mineId,
    int year,
    String month,
    String royaltyRateId,
    double quantity,
    long baseAmount,
    long dmfAmount,
    long nmetAmount,
    long grossLiability) {

  /** The deterministic id of the royalty for {@code mineId}, {@code year}, {@code month}. */
  public static String id(final String mineId, final int year, final String month) {
    return mineId + ":" + year + ":" + Month.valueOfOrDefault(month).name();
  }
}
