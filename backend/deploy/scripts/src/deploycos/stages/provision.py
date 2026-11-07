"""Provisions the environment and each of its customers through the internal service.

The environment call sets up what all customers share; then one call per entry in the
environment's customers.json provisions that customer: its client configs and the databases,
indexes, event store, vector collections and buckets behind them. Every step is safe to run again.
"""

from __future__ import annotations

import json
from dataclasses import dataclass

import httpx

from deploycos.charts import CONFIGS_DIR
from deploycos.stages.internal import InternalEndpointStage
from deploycos.stages.seed import expand_json_vars

ENVIRONMENT_PATH = "/internal/provision/environment"
CUSTOMERS_PATH = "/internal/provision/customer"


@dataclass(eq=False, kw_only=True)
class ProvisionStage(InternalEndpointStage):
    environment: str

    def _execute(self, client: httpx.Client, service: str) -> None:
        self._provision(
            "environment",
            client.post(ENVIRONMENT_PATH, json=self._environment_payload()),
            service,
        )
        for customer in self._customers():
            self._provision(
                f"customer {customer['id']}", client.post(CUSTOMERS_PATH, json=customer), service
            )

    def _environment_payload(self) -> dict:
        """Royalty/DMF/NMET rates are environment-wide reference data, seeded once here — not
        threaded through every customer's own provisioning request. ComplianceProvisioningServiceImpl
        reads each back from ProvisioningRequest's catch-all `additional` map. Modeled as three
        separate files/keys, not one, because each is set by a separate, independently-amendable
        authority (state MMDR Act notifications for royalty; the DMF Rules, 2015 and the NMET
        Rules, 2015 respectively — two distinct central-government instruments) and so can change
        on its own schedule without touching the others.

        `permissionsConfig` (ComplianceOS's own permission catalog and standard roles, including
        the Mine-scoped permissions agent-engine's own bundled default doesn't have) is seeded the
        same way, read back by TenancyProvisioningServiceImpl — ComplianceOS never relies on
        agent-engine's bundled permissions.json."""
        payload = {}
        for key, filename in (
            ("royaltyRates", "royalty_rates.json"),
            ("dmfRates", "dmf_rates.json"),
            ("nmetRates", "nmet_rates.json"),
        ):
            path = CONFIGS_DIR / self.environment / filename
            rates = json.loads(expand_json_vars(path)) if path.is_file() else []
            if rates:
                payload[key] = rates
        permissions_path = CONFIGS_DIR / self.environment / "governance" / "permissions.json"
        if permissions_path.is_file():
            payload["permissionsConfig"] = json.loads(expand_json_vars(permissions_path))
        return payload

    def _customers(self) -> list[dict]:
        path = CONFIGS_DIR / self.environment / "customers.json"
        return json.loads(expand_json_vars(path)) if path.is_file() else []

    def _provision(self, target: str, response: httpx.Response, service: str) -> None:
        steps = self._succeeded(response, service).json()["steps"]
        failed = [step for step in steps if step.get("error")]
        for step in steps:
            print(f"Provisioned {target}: {step['name']}" + (f" FAILED: {step['error']}" if step.get("error") else ""))
        if failed:
            raise RuntimeError(
                f"Provisioning {target} failed: "
                + "; ".join(f"{step['name']}: {step['error']}" for step in failed)
            )
