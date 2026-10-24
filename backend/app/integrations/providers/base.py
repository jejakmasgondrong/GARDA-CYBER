"""
Kontrak provider threat-intelligence (mis. reputasi/geolokasi IP).
Desainnya disengaja sederhana: provider BARU tinggal implementasi class ini,
tanpa mengubah service atau endpoint yang memanggilnya.
"""
from abc import ABC, abstractmethod
from dataclasses import dataclass

from app.models.ip_lookup import ProviderResultStatus


@dataclass
class ProviderResult:
    status: ProviderResultStatus
    summary: str | None  # ringkasan singkat untuk ditampilkan, bukan dump mentah
    source: str
    collected_at_iso: str


class IpReputationProvider(ABC):
    provider_id: str
    display_name: str
    required_env_vars: list[str]

    @abstractmethod
    def is_configured(self) -> bool:
        raise NotImplementedError

    @abstractmethod
    def lookup(self, ip_address: str, timeout_seconds: float = 5.0) -> ProviderResult:
        """
        Implementasi NYATA (HTTP call ke provider sungguhan) ditambahkan saat
        kredensial tersedia. Wajib menangani timeout, rate limit, dan error
        provider -> dikembalikan sebagai ProviderResult berstatus sesuai,
        BUKAN exception yang membuat endpoint 500.
        """
        raise NotImplementedError
