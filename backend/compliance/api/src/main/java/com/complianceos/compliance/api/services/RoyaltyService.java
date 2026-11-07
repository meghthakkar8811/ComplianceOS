package com.complianceos.compliance.api.services;

import com.agentengine.util.ms.client.MicroService;
import com.complianceos.compliance.api.beans.DmfContribution;
import com.complianceos.compliance.api.beans.NmetContribution;
import com.complianceos.compliance.api.beans.Royalty;
import com.complianceos.compliance.api.beans.RoyaltyGst;
import com.complianceos.compliance.api.beans.Sale;
import java.util.List;

/**
 * A mine's royalty-family liabilities for a period — royalty itself, the DMF and NMET
 * contributions owed on top of it, and the GST owed on it under reverse charge — each computed
 * fresh from its {@link Sale} records and the applicable rate cards, never stored.
 */
@MicroService("compliance")
public interface RoyaltyService {

  /**
   * The mine's royalty for every period that has a {@link Sale} — computed fresh from its
   * dispatches and the applicable rate on every call, never stored.
   */
  List<Royalty> getRoyaltiesByMine(String mineId);

  /**
   * The mine's royalty, one row per (mineral, grade), for the month {@code asOf} falls in —
   * empty if it had no dispatches then.
   */
  List<Royalty> getRoyalty(String mineId, long asOf);

  /**
   * The mine's DMF contribution for every period that has a {@link Sale} — computed fresh from
   * its dispatches and the applicable rates on every call, never stored.
   */
  List<DmfContribution> getDmfContributionsByMine(String mineId);

  /** The mine's DMF contribution for the month {@code asOf} falls in, or null if it had no dispatches then. */
  DmfContribution getDmfContribution(String mineId, long asOf);

  /**
   * The mine's NMET contribution for every period that has a {@link Sale} — computed fresh from
   * its dispatches and the applicable rates on every call, never stored.
   */
  List<NmetContribution> getNmetContributionsByMine(String mineId);

  /** The mine's NMET contribution for the month {@code asOf} falls in, or null if it had no dispatches then. */
  NmetContribution getNmetContribution(String mineId, long asOf);

  /**
   * The mine's GST-on-royalty RCM liability for every period that has a {@link Sale} — computed
   * fresh from its dispatches and the applicable rates on every call, never stored.
   */
  List<RoyaltyGst> getRoyaltyGstByMine(String mineId);

  /**
   * The mine's GST-on-royalty RCM liability, one row per (mineral, grade), for the month {@code
   * asOf} falls in — empty if it had no dispatches then.
   */
  List<RoyaltyGst> getRoyaltyGst(String mineId, long asOf);
}
