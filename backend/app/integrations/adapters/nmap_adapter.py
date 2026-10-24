"""
Adapter Nmap -- SATU integrasi Red Team yang dibuat end-to-end dulu, sesuai
instruksi "implementasikan minimal satu integrasi nyata secara end-to-end
terlebih dahulu" sebelum memperluas ke tool lain.

is_installed() memakai pengecekan NYATA (shutil.which via BaseIntegrationAdapter),
bukan asumsi. Di sandbox tempat kode ini ditulis, nmap TIDAK terpasang dan TIDAK
ada akses internet untuk memasangnya -- jadi is_installed() akan jujur
mengembalikan False di sini. Di mesin Anda yang sudah menginstal nmap
(`apt install nmap` di Linux, atau nmap untuk Windows), hasilnya akan True
dan execute() benar-benar berjalan.
"""
import shutil
import subprocess

from app.core.config import get_settings
from app.integrations.adapters.base import BaseIntegrationAdapter, ExecutionResult, IntegrationInfo

# Hanya flag read-only/non-destruktif yang di-allowlist. Tidak ada flag yang
# memodifikasi target atau melakukan exploitation (mis. --script vuln dikecualikan
# dari daftar ini secara sengaja untuk Tahap ini).
ALLOWED_FLAGS = {"-sV", "-F", "-Pn", "-sT"}


class NmapAdapter(BaseIntegrationAdapter):
    info = IntegrationInfo(
        tool_id="nmap",
        display_name="Nmap",
        description="Pemindaian jaringan dan layanan untuk aset yang sudah diotorisasi.",
        official_repo="https://github.com/nmap/nmap",
        required_env_vars=["NMAP_BINARY"],
        capability_summary="Network & service discovery",
        binary_name="nmap",
    )

    def is_configured(self) -> bool:
        return bool(get_settings().NMAP_BINARY)

    def execute(self, asset_identifier: str, parameters: dict, timeout_seconds: int = 60) -> ExecutionResult:
        if not self.is_installed():
            return ExecutionResult(
                success=False,
                summary="Nmap tidak ditemukan di PATH sistem ini. Install nmap lalu coba lagi "
                        "(lihat docs/OWNER_SETUP_CHECKLIST.md).",
            )
        if not self.is_configured():
            return ExecutionResult(
                success=False,
                summary="NMAP_BINARY belum diisi di .env. Isi path binary nmap lalu restart backend.",
            )

        raw_flags = parameters.get("flags", [])
        safe_flags = [f for f in raw_flags if f in ALLOWED_FLAGS]
        binary = get_settings().NMAP_BINARY or shutil.which("nmap")

        try:
            proc = subprocess.run(
                [binary, *safe_flags, asset_identifier],
                capture_output=True, text=True, timeout=timeout_seconds, shell=False,
            )
        except subprocess.TimeoutExpired:
            return ExecutionResult(success=False, summary=f"Scan melebihi batas waktu {timeout_seconds} detik.")
        except Exception as exc:  # tidak boleh bocor sebagai 500 di endpoint
            return ExecutionResult(success=False, summary=f"Gagal menjalankan nmap: {exc.__class__.__name__}")

        if proc.returncode != 0:
            return ExecutionResult(
                success=False,
                summary=f"nmap keluar dengan kode {proc.returncode}.",
                raw_output_excerpt=(proc.stderr or "")[:2000],
            )
        return ExecutionResult(
            success=True,
            summary=f"Scan selesai terhadap {asset_identifier} (flags: {safe_flags or 'default'}).",
            raw_output_excerpt=(proc.stdout or "")[:2000],
        )
