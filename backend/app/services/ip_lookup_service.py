"""
Service layer IP Intelligence.

Alur: validasi -> klasifikasi -> (hanya jika publik) panggil provider -> simpan.
Backend adalah penegak scope yang sebenarnya -- IP private/reserved TIDAK PERNAH
diteruskan ke provider eksternal, apa pun yang dikirim frontend.
"""
from sqlalchemy.orm import Session

from app.integrations.providers.base import IpReputationProvider
from app.integrations.providers.abuseipdb_provider import AbuseIpdbProvider
from app.integrations.providers.demo_provider import DemoIpProvider
from app.models.ip_lookup import IpLookup, ProviderResultStatus
from app.repositories.ip_lookup import IpLookupRepository
from app.services.ip_classification import (
    InvalidIpAddressError,
    classify_ip,
    is_eligible_for_external_lookup,
    parse_ip,
)

# Daftar provider aktif, diurutkan berdasarkan prioritas.
# Provider pertama yang `is_configured()` akan dipakai.
# AbuseIPDB didahulukan; jika belum terkonfigurasi, fallback ke Demo.
_PROVIDERS: list[IpReputationProvider] = [AbuseIpdbProvider(), DemoIpProvider()]


class IpLookupService:
    def __init__(self, db: Session):
        self.repo = IpLookupRepository(db)

    def lookup(self, ip_address: str, requested_by: str | None = None) -> IpLookup:
        ip_obj = parse_ip(ip_address)  # melempar InvalidIpAddressError jika tidak valid
        classification = classify_ip(ip_obj)

        provider_id: str | None = None
        provider_status = ProviderResultStatus.NOT_CONFIGURED
        result_summary: str | None = None

        if is_eligible_for_external_lookup(classification) and _PROVIDERS:
            # Pilih provider pertama yang terkonfigurasi; fallback ke provider pertama
            # di list jika tidak ada yang configured (akan menghasilkan NOT_CONFIGURED).
            provider = next(
                (p for p in _PROVIDERS if p.is_configured()),
                _PROVIDERS[0],
            )
            provider_id = provider.provider_id
            try:
                result = provider.lookup(str(ip_obj))
                provider_status = result.status
                result_summary = result.summary
            except Exception as exc:  # provider TIDAK BOLEH membuat endpoint 500
                provider_status = ProviderResultStatus.PROVIDER_ERROR
                result_summary = f"Provider error: {exc.__class__.__name__}"

        record = IpLookup(
            ip_address=str(ip_obj),
            classification=classification,
            provider_id=provider_id,
            provider_status=provider_status,
            result_summary=result_summary,
            requested_by=requested_by,
        )
        return self.repo.create(record)

    def list_history(self, skip: int = 0, limit: int = 50) -> tuple[list[IpLookup], int]:
        limit = max(1, min(limit, 200))  # batasi agar tidak jadi vektor DoS ringan
        return self.repo.list_paginated(skip, limit), self.repo.count()


__all__ = ["IpLookupService", "InvalidIpAddressError"]
