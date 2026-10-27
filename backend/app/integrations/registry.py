"""Registry pusat seluruh adapter integrasi. Satu sumber kebenaran untuk halaman Integrations."""
from app.integrations.adapters.base import BaseIntegrationAdapter
from app.integrations.adapters.nmap_adapter import NmapAdapter
from app.integrations.adapters.nuclei_adapter import NucleiAdapter
from app.integrations.adapters.amass_adapter import AmassAdapter
from app.integrations.adapters.zap_adapter import ZapAdapter
from app.integrations.adapters.wazuh_adapter import WazuhAdapter
from app.integrations.adapters.suricata_adapter import SuricataAdapter
from app.integrations.adapters.sigma_adapter import SigmaAdapter
from app.integrations.adapters.osquery_adapter import OsqueryAdapter
from app.integrations.adapters.greenbone_adapter import GreenboneAdapter
from app.integrations.adapters.osint_adapter import OsintAdapter
from app.integrations.adapters.github_exposure_adapter import GithubExposureAdapter
from app.integrations.adapters.ip_reputation_adapter import IpReputationAdapter
from app.integrations.adapters.kartika_load_adapter import KartikaLoadAdapter
from app.integrations.adapters.kartika_sqli_probe_adapter import KartikaSqliProbeAdapter
from app.integrations.adapters.kartika_wa_phish_adapter import KartikaWaPhishAdapter
from app.integrations.adapters.wa_lookup_adapter import WaLookupAdapter

_ADAPTERS: list[BaseIntegrationAdapter] = [
    NmapAdapter(),
    NucleiAdapter(),
    AmassAdapter(),
    KartikaLoadAdapter(),
    KartikaSqliProbeAdapter(),
    KartikaWaPhishAdapter(),
    WaLookupAdapter(),
    ZapAdapter(),
    WazuhAdapter(),
    SuricataAdapter(),
    SigmaAdapter(),
    OsqueryAdapter(),
    GreenboneAdapter(),
    OsintAdapter(),
    GithubExposureAdapter(),
    IpReputationAdapter(),
]


def list_integration_statuses() -> list[dict]:
    return [adapter.status() for adapter in _ADAPTERS]


def get_adapter_by_id(tool_id: str) -> BaseIntegrationAdapter | None:
    """Ambil adapter berdasarkan ID tool untuk Job Manager."""
    for adapter in _ADAPTERS:
        if adapter.info.tool_id == tool_id:
            return adapter
    return None
