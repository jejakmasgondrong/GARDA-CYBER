"""
Kontrak dasar untuk setiap adapter tool eksternal.

status() membedakan secara eksplisit:
- implemented   : kode adapter sudah ditulis
- installed     : binary/dependency tool terdeteksi ADA di sistem (cek nyata, bukan asumsi)
- configured    : environment variable yang dibutuhkan sudah terisi
- executable    : implemented AND installed AND configured -> baru boleh dieksekusi lewat Job Manager

Empat flag ini SENGAJA dipisah supaya UI tidak pernah menyamakan "kode ada"
dengan "tool terpasang", atau "terpasang" dengan "siap dieksekusi".
"""
import shutil
from abc import ABC, abstractmethod
from dataclasses import dataclass


@dataclass
class IntegrationInfo:
    tool_id: str
    display_name: str
    description: str
    official_repo: str
    required_env_vars: list[str]
    capability_summary: str
    implemented: bool = True
    # Nama binary CLI untuk dicek lewat shutil.which(), mis. "nmap". None = tidak relevan
    # (tool berbasis API/HTTP, bukan CLI lokal -- mis. GitHub, IP reputation provider).
    binary_name: str | None = None


@dataclass
class ExecutionResult:
    success: bool
    summary: str
    raw_output_excerpt: str | None = None  # dipotong -- lihat MAX_OUTPUT_CHARS di job_manager


class BaseIntegrationAdapter(ABC):
    info: IntegrationInfo

    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    def is_installed(self) -> bool:
        """Default: jika adapter mendefinisikan binary_name, cek PATH sungguhan via shutil.which."""
        if self.info.binary_name is None:
            return False  # tool berbasis API: "installed" tidak relevan, default aman = False
        return shutil.which(self.info.binary_name) is not None

    def is_executable(self) -> bool:
        return self.info.implemented and self.is_installed() and self.is_configured()

    def execute(self, asset_identifier: str, parameters: dict, timeout_seconds: int = 60) -> ExecutionResult:
        """
        Eksekusi nyata. Default: belum diimplementasikan.
        Adapter yang sudah siap eksekusi (mis. NmapAdapter) meng-override ini.
        HARUS menangani timeout & error sendiri -- tidak boleh melempar exception
        yang membuat endpoint Job Manager error 500.
        """
        return ExecutionResult(success=False, summary=f"Eksekusi {self.info.tool_id} belum diimplementasikan.")

    def status(self) -> dict:
        return {
            "tool_id": self.info.tool_id,
            "display_name": self.info.display_name,
            "implemented": self.info.implemented,
            "installed": self.is_installed(),
            "configured": self.is_configured(),
            "executable": self.is_executable(),
            "required_env_vars": self.info.required_env_vars,
            "official_repo": self.info.official_repo,
            "capability_summary": self.info.capability_summary,
        }
