package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.services.SchemaDTOProvider;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.Buyer;
import com.complianceos.compliance.api.beans.Mine;
import com.complianceos.compliance.api.beans.Sale;
import jakarta.inject.Singleton;
import java.util.Map;

/** This module's own schema-resolvable asset types. Invoice isn't user-facing, so it has none. */
@Singleton
public class MineSchemaDTOProvider implements SchemaDTOProvider {

  @Override
  public Map<String, Class<?>> assetClasses() {
    return Map.of(
        AssetClass.MINE, Mine.class,
        AssetClass.SALE, Sale.class,
        AssetClass.BUYER, Buyer.class);
  }
}
