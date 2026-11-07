package com.complianceos.compliance.api.services;

import com.agentengine.util.common.query.PaginatedResult;
import com.agentengine.util.common.query.Query;
import com.agentengine.util.ms.client.MicroService;
import com.complianceos.compliance.api.beans.ExMineMineralPrice;
import com.complianceos.compliance.api.beans.Mineral;
import com.complianceos.compliance.api.beans.ProductionEntry;
import com.complianceos.compliance.api.beans.Sale;
import com.complianceos.compliance.api.beans.StockBalance;
import java.util.List;
import java.util.Map;

/**
 * A mine's mineral grades — their opening stock and opening ex-mine price baselines — and the
 * stock/ex-mine-price derived from them plus every {@link ProductionEntry}/{@link Sale} recorded
 * since.
 */
@MicroService("compliance")
public interface MineralService {

  /** Saves {@code mineId}'s mineral grades — their opening stock and ex-mine price baselines. */
  Mineral saveMineral(String mineId, Mineral mineral, boolean skipVersion);

  /** The ids among {@code ids} that are {@code mineId}'s own; empty if the caller may not read it. */
  Map<String, Mineral> getMinerals(String mineId, List<String> ids);

  /** {@code mineId}'s own records matching {@code query}; empty if the caller may not read it. */
  PaginatedResult<Mineral> findMinerals(String mineId, Query query);

  /**
   * The mine's current opening/closing stock of {@code mineral}'s {@code grade}: the grade's
   * opening stock (see {@link Mineral}) plus every {@link ProductionEntry} and {@link Sale}
   * ever recorded for it — never stored, and deliberately not scoped to any one month.
   */
  StockBalance getStockBalance(String mineId, String mineral, String grade);

  /**
   * {@code mineral}'s {@code grade} current ex-mine price: every {@link Sale} ever recorded for
   * it averaged out, else its opening ex-mine price (see {@link Mineral}) — never stored, and
   * deliberately not scoped to any one month.
   */
  ExMineMineralPrice getExMineMineralPrice(String mineId, String mineral, String grade);

  /**
   * The platform's full mineral catalog (see {@code minerals.json}) — each entry's own id is its
   * mineral name, since it has no mine to be scoped to.
   */
  List<Mineral> getPlatformMinerals();

  /** {@code mineral}'s standard grades, or empty if it isn't one of the platform's minerals. */
  List<String> getPlatformMineralGrades(String mineral);
}
