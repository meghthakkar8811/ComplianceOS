package com.complianceos.interfaces.rest.handlers;

import com.agentengine.interfaces.rest.services.SchemaDTOProvider;
import com.complianceos.compliance.api.beans.AssetClass;
import com.complianceos.compliance.api.beans.Mine;
import jakarta.inject.Singleton;
import java.util.Map;

/** This module's own schema-resolvable asset types. */
@Singleton
public class MineSchemaDTOProvider implements SchemaDTOProvider {

  @Override
  public Map<String, Class<?>> assetClasses() {
    return Map.of(AssetClass.MINE, Mine.class);
  }
}
