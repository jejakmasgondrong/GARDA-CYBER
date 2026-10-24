"""Nuclei CLI adapter for authorized vulnerability assessment of registered assets."""
import re
import shutil
import subprocess
from urllib.parse import urlparse

from app.integrations.adapters.base import BaseIntegrationAdapter, ExecutionResult, IntegrationInfo


def _valid_target(value: str) -> bool:
    if not value or len(value) > 253 or any(ch.isspace() for ch in value):
        return False
    parsed = urlparse(value if "://" in value else f"https://{value}")
    host = parsed.hostname or ""
    return bool(host and re.fullmatch(r"[A-Za-z0-9.-]+", host) and ".." not in host)


class NucleiAdapter(BaseIntegrationAdapter):
    info = IntegrationInfo(
        tool_id="nuclei", display_name="Nuclei",
        description="Pemindaian kerentanan berbasis template pada aset terdaftar dan diotorisasi.",
        official_repo="https://github.com/projectdiscovery/nuclei", required_env_vars=[],
        capability_summary="Template-based vulnerability assessment", binary_name="nuclei",
    )

    def is_configured(self) -> bool:
        # Adapter siap tanpa secret; status configured hanya true bila binary tersedia.
        return shutil.which("nuclei") is not None

    def execute(self, asset_identifier: str, parameters: dict, timeout_seconds: int = 180) -> ExecutionResult:
        if not _valid_target(asset_identifier):
            return ExecutionResult(False, "Target harus berupa hostname, IP, atau URL valid yang terdaftar sebagai aset.")
        binary = shutil.which("nuclei")
        if not binary:
            return ExecutionResult(False, "Nuclei tidak ditemukan di PATH. Instal Nuclei lalu coba lagi.")
        # No arbitrary flags/templates from request: fixed safe defaults, only the registered asset is scanned.
        target = asset_identifier if "://" in asset_identifier else f"https://{asset_identifier}"
        try:
            proc = subprocess.run(
                [binary, "-u", target, "-silent", "-no-color", "-timeout", "5", "-retries", "1"],
                capture_output=True, text=True, timeout=max(10, min(int(timeout_seconds), 300)), shell=False,
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(False, "Pemindaian Nuclei melewati batas waktu.")
        except Exception as exc:
            return ExecutionResult(False, f"Gagal menjalankan Nuclei: {exc.__class__.__name__}")
        output = (proc.stdout or "").strip()
        if proc.returncode != 0:
            return ExecutionResult(False, f"Nuclei keluar dengan kode {proc.returncode}.", (proc.stderr or output)[:2000])
        return ExecutionResult(True, f"Nuclei selesai untuk aset terdaftar {asset_identifier}.", output[:2000] or "Tidak ada temuan pada output standar.")
