"""Amass passive DNS/subdomain enumeration adapter for registered domain assets."""
import re
import shutil
import subprocess

from app.integrations.adapters.base import BaseIntegrationAdapter, ExecutionResult, IntegrationInfo


class AmassAdapter(BaseIntegrationAdapter):
    info = IntegrationInfo(
        tool_id="amass", display_name="OWASP Amass",
        description="Penemuan aset domain melalui enumerasi pasif.",
        official_repo="https://github.com/owasp-amass/amass", required_env_vars=[],
        capability_summary="Passive domain asset discovery", binary_name="amass",
    )

    def is_configured(self) -> bool:
        # Adapter siap tanpa secret; status configured hanya true bila binary tersedia.
        return shutil.which("amass") is not None

    def execute(self, asset_identifier: str, parameters: dict, timeout_seconds: int = 180) -> ExecutionResult:
        domain = asset_identifier.strip().lower().rstrip(".")
        if len(domain) > 253 or not re.fullmatch(r"(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}", domain):
            return ExecutionResult(False, "Amass membutuhkan domain valid sebagai identifier aset.")
        binary = shutil.which("amass")
        if not binary:
            return ExecutionResult(False, "Amass tidak ditemukan di PATH. Instal Amass lalu coba lagi.")
        # Passive mode only; no active probing and no user-controlled command arguments.
        try:
            proc = subprocess.run(
                [binary, "enum", "-passive", "-d", domain], capture_output=True, text=True,
                timeout=max(10, min(int(timeout_seconds), 300)), shell=False,
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(False, "Enumerasi Amass melewati batas waktu.")
        except Exception as exc:
            return ExecutionResult(False, f"Gagal menjalankan Amass: {exc.__class__.__name__}")
        output = (proc.stdout or "").strip()
        if proc.returncode != 0:
            return ExecutionResult(False, f"Amass keluar dengan kode {proc.returncode}.", (proc.stderr or output)[:2000])
        return ExecutionResult(True, f"Enumerasi pasif Amass selesai untuk {domain}.", output[:2000] or "Tidak ada hasil pada output standar.")
