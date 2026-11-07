package com.complianceos.compliance.api.beans;

/**
 * The GST owed under reverse charge on a mine's royalty for one mineral's grade, for one period —
 * against the applicable {@link GstRate} for that mineral, on that {@link Royalty}'s own amount.
 * One row per (mineral, grade) the mine dispatched that period, matching {@link Royalty}'s own
 * breakdown — never a single combined figure for the whole mine. {@code grade} is carried through
 * only for traceability back to the {@link Royalty} row it was computed from: {@link GstRate}
 * itself is not grade-differentiated. Computed fresh on every read, never stored, for the same
 * reason {@link Royalty} is: {@code id} is still deterministic ({@link #id}) so a {@link
 * MinePayment#getReferenceId()} has a stable value to reference even though no document exists
 * at that id.
 */
public record RoyaltyGst(
    String id,
    String mineId,
    int year,
    String month,
    String mineral,
    String grade,
    String gstRateId,
    double amount) {

  /**
   * The deterministic id of the RCM liability for {@code mineId}, {@code year}, {@code month},
   * {@code mineral}, {@code grade}.
   */
  public static String id(
      final String mineId, final int year, final String month, final String mineral, final String grade) {
    return mineId + ":" + year + ":" + Month.valueOfOrDefault(month).name() + ":" + mineral + ":" + grade;
  }
}
