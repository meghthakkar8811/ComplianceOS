from __future__ import annotations

import json
from pathlib import Path
import pytest

from deploycos.stages.infraconfig import SeedInfraConfigStage
from deploycos.stages.provision import ProvisionStage
from deploycos.stages.seed import expand_json_vars


def test_infraconfig_orders_encryption_file_first(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("deploycos.stages.infraconfig.CONFIGS_DIR", tmp_path)
    infra_dir = tmp_path / "mining" / "infra"
    infra_dir.mkdir(parents=True)
    (infra_dir / "SQL.json").write_text("[]")
    (infra_dir / "ENCRYPTION.json").write_text("[]")
    (infra_dir / "MONGO.json").write_text("[]")

    stage = SeedInfraConfigStage(
        name="test-infra",
        chart_name="internal",
        tier="mining",
        environment="mining",
        namespace_override=None,
    )
    files = [f.name for f in stage._config_files()]
    assert files[0] == "ENCRYPTION.json"
    assert set(files) == {"ENCRYPTION.json", "SQL.json", "MONGO.json"}


def test_provision_payload_reads_rates(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr("deploycos.stages.provision.CONFIGS_DIR", tmp_path)
    env_dir = tmp_path / "mining"
    env_dir.mkdir(parents=True)
    (env_dir / "royalty_rates.json").write_text(json.dumps([{"rate": 5}]))

    stage = ProvisionStage(
        name="test-provision",
        chart_name="internal",
        tier="mining",
        environment="mining",
        namespace_override=None,
    )
    payload = stage._environment_payload()
    assert "royaltyRates" in payload
    assert payload["royaltyRates"] == [{"rate": 5}]


def test_expand_json_vars(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("MY_TEST_VAR", "test_value_123")
    test_file = tmp_path / "test.json"
    test_file.write_text('{"key": "${MY_TEST_VAR}"}')

    expanded = expand_json_vars(test_file)
    assert '"test_value_123"' in expanded
