"""Test inti anti-SSRF: tidak bergantung internet, semua resolusi di-mock."""
from unittest.mock import patch

import pytest

from app.services.osint_dns_service import (
    DnsResolutionError, InvalidDomainError, ResolvedAddress, UnsafeResolutionError,
    enforce_public_only, full_dns_lookup, validate_domain,
)


def test_validate_domain_rejects_url():
    with pytest.raises(InvalidDomainError):
        validate_domain("https://example.com/path")


def test_validate_domain_rejects_raw_ip():
    with pytest.raises(InvalidDomainError):
        validate_domain("8.8.8.8")


def test_validate_domain_rejects_empty():
    with pytest.raises(InvalidDomainError):
        validate_domain("   ")


def test_validate_domain_accepts_normal_domain():
    assert validate_domain("Example.COM.") == "example.com"


def test_enforce_public_only_blocks_loopback():
    with pytest.raises(UnsafeResolutionError):
        enforce_public_only([ResolvedAddress(ip="127.0.0.1", record_type="A")], "evil.test")


def test_enforce_public_only_blocks_cloud_metadata_ip():
    # 169.254.169.254 adalah link-local -> wajib diblokir (celah SSRF klasik ke metadata cloud).
    with pytest.raises(UnsafeResolutionError):
        enforce_public_only([ResolvedAddress(ip="169.254.169.254", record_type="A")], "evil.test")


def test_enforce_public_only_blocks_private_range():
    with pytest.raises(UnsafeResolutionError):
        enforce_public_only([ResolvedAddress(ip="10.0.0.5", record_type="A")], "evil.test")


def test_enforce_public_only_blocks_if_any_address_unsafe():
    # Satu IP publik + satu IP privat -> seluruh domain tetap diblokir (bukan cuma difilter).
    addrs = [ResolvedAddress(ip="93.184.216.34", record_type="A"), ResolvedAddress(ip="127.0.0.1", record_type="A")]
    with pytest.raises(UnsafeResolutionError):
        enforce_public_only(addrs, "mixed.test")


def test_enforce_public_only_allows_pure_public():
    enforce_public_only([ResolvedAddress(ip="93.184.216.34", record_type="A")], "example.com")  # tidak melempar


def test_full_dns_lookup_blocks_domain_resolving_to_private_ip():
    with patch("app.services.osint_dns_service.resolve_addresses") as mock_resolve:
        mock_resolve.return_value = [ResolvedAddress(ip="127.0.0.1", record_type="A")]
        with pytest.raises(UnsafeResolutionError):
            full_dns_lookup("attacker-controlled.test", timeout_seconds=2.0, max_txt=10)


def test_full_dns_lookup_raises_on_no_records():
    with patch("app.services.osint_dns_service.resolve_addresses") as mock_resolve:
        mock_resolve.return_value = []
        with pytest.raises(DnsResolutionError):
            full_dns_lookup("nxdomain.test", timeout_seconds=2.0, max_txt=10)


def test_full_dns_lookup_succeeds_for_public_ip(monkeypatch):
    with patch("app.services.osint_dns_service.resolve_addresses") as mock_resolve, \
         patch("app.services.osint_dns_service.resolve_text_records") as mock_text:
        mock_resolve.return_value = [ResolvedAddress(ip="93.184.216.34", record_type="A")]
        mock_text.return_value = (["10 mail.example.com"], ["ns1.example.com"], ["v=spf1 -all"])
        result = full_dns_lookup("example.com", timeout_seconds=2.0, max_txt=10)
        assert result.domain == "example.com"
        assert result.addresses[0].ip == "93.184.216.34"
        assert result.mx == ["10 mail.example.com"]
