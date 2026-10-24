"""Resolusi DNS yang aman untuk OSINT Domain Intelligence.

ATURAN KERAS ANTI-SSRF / ANTI-DNS-REBINDING:
1. Hanya format domain (bukan URL, bukan IP, bukan path) yang diterima.
2. Setiap alamat IP hasil resolusi (A/AAAA) WAJIB divalidasi lewat
   `classify_ip` SEBELUM dipakai untuk koneksi jaringan apa pun (mis. TLS).
3. Kalau SATU SAJA IP hasil resolusi non-publik (private/loopback/link-local/
   multicast/reserved/unspecified -- termasuk 169.254.169.254 metadata cloud),
   seluruh lookup domain tsb DITOLAK (status BLOCKED), bukan cuma IP itu yang
   disaring. Ini mencegah domain attacker yang sengaja resolve sebagian ke IP
   publik (lolos pengecekan pertama) lalu diam-diam juga resolve ke IP privat.
4. Resolusi dan koneksi TLS dilakukan terpisah step-nya supaya hasil DNS
   divalidasi dulu sebelum socket TLS benar-benar dibuka (cegah TOCTOU/
   DNS-rebinding: re-resolve tidak dipakai untuk koneksi, melainkan IP yang
   SUDAH divalidasi).
"""
from __future__ import annotations

import re
import socket
from dataclasses import dataclass, field

from app.services.ip_classification import classify_ip, is_eligible_for_external_lookup

_DOMAIN_RE = re.compile(
    r"^(?=.{1,253}$)(?!-)[A-Za-z0-9-]{1,63}(?<!-)(\.(?!-)[A-Za-z0-9-]{1,63}(?<!-))+$"
)


class InvalidDomainError(ValueError):
    pass


class DnsResolutionError(RuntimeError):
    pass


class UnsafeResolutionError(RuntimeError):
    """Dilempar ketika domain resolve ke satu atau lebih IP non-publik."""


@dataclass
class ResolvedAddress:
    ip: str
    record_type: str  # "A" atau "AAAA"


@dataclass
class DnsLookupResult:
    domain: str
    addresses: list[ResolvedAddress] = field(default_factory=list)
    mx: list[str] = field(default_factory=list)
    ns: list[str] = field(default_factory=list)
    txt: list[str] = field(default_factory=list)


def validate_domain(raw: str) -> str:
    domain = raw.strip().rstrip(".").lower()
    if not domain or len(domain) > 253 or not _DOMAIN_RE.match(domain):
        raise InvalidDomainError(
            f"'{raw}' bukan nama domain yang valid (hanya domain, bukan URL/IP/path)."
        )
    # Regex di atas juga lolos untuk string seperti "8.8.8.8" (semua label numerik) --
    # itu alamat IP, bukan domain, jadi harus ditolak eksplisit di sini.
    import ipaddress
    try:
        ipaddress.ip_address(domain)
    except ValueError:
        pass
    else:
        raise InvalidDomainError(f"'{raw}' adalah alamat IP, bukan nama domain.")
    return domain


def resolve_addresses(domain: str, timeout_seconds: float) -> list[ResolvedAddress]:
    """A/AAAA record via getaddrinfo. Melempar DnsResolutionError kalau gagal total."""
    old_timeout = socket.getdefaulttimeout()
    socket.setdefaulttimeout(timeout_seconds)
    try:
        infos = socket.getaddrinfo(domain, None)
    except socket.gaierror as exc:
        raise DnsResolutionError(f"Domain '{domain}' tidak bisa di-resolve: {exc}") from exc
    finally:
        socket.setdefaulttimeout(old_timeout)

    seen: set[str] = set()
    results: list[ResolvedAddress] = []
    for family, _, _, _, sockaddr in infos:
        ip = sockaddr[0]
        if ip in seen:
            continue
        seen.add(ip)
        record_type = "AAAA" if family == socket.AF_INET6 else "A"
        results.append(ResolvedAddress(ip=ip, record_type=record_type))
    return results


def enforce_public_only(addresses: list[ResolvedAddress], domain: str) -> None:
    """Blokir SELURUH lookup kalau ada satu saja IP hasil resolusi yang non-publik."""
    for addr in addresses:
        classification = classify_ip(_parse(addr.ip))
        if not is_eligible_for_external_lookup(classification):
            raise UnsafeResolutionError(
                f"Domain '{domain}' resolve ke alamat {addr.ip} ({classification.value}), "
                "bukan alamat publik. Lookup ditolak untuk mencegah SSRF/DNS rebinding."
            )


def _parse(ip: str):
    import ipaddress
    return ipaddress.ip_address(ip)


def resolve_text_records(domain: str, timeout_seconds: float, max_txt: int) -> tuple[list[str], list[str], list[str]]:
    """MX, NS, TXT via dnspython. Kegagalan per-jenis record tidak menggagalkan
    seluruh lookup -- domain tanpa MX/TXT itu normal, bukan error."""
    import dns.resolver

    resolver = dns.resolver.Resolver()
    resolver.timeout = timeout_seconds
    resolver.lifetime = timeout_seconds

    def _safe_query(rdtype: str) -> list[str]:
        try:
            answer = resolver.resolve(domain, rdtype)
            return [str(r).strip('"') for r in answer]
        except (dns.resolver.NoAnswer, dns.resolver.NXDOMAIN, dns.resolver.NoNameservers,
                dns.resolver.LifetimeError, dns.exception.Timeout):
            return []

    mx = _safe_query("MX")
    ns = _safe_query("NS")
    txt = _safe_query("TXT")[:max_txt]
    return mx, ns, txt


def full_dns_lookup(domain: str, timeout_seconds: float, max_txt: int) -> DnsLookupResult:
    """Resolusi lengkap + enforcement anti-SSRF. Melempar UnsafeResolutionError
    atau DnsResolutionError kalau tidak aman/tidak bisa di-resolve."""
    addresses = resolve_addresses(domain, timeout_seconds)
    if not addresses:
        raise DnsResolutionError(f"Domain '{domain}' tidak memiliki A/AAAA record.")
    enforce_public_only(addresses, domain)  # lempar sebelum data lain dikumpulkan

    mx, ns, txt = resolve_text_records(domain, timeout_seconds, max_txt)
    return DnsLookupResult(domain=domain, addresses=addresses, mx=mx, ns=ns, txt=txt)
