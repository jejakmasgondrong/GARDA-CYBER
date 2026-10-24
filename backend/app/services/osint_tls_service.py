"""Ambil info sertifikat TLS publik untuk domain.

PENTING (anti DNS-rebinding): koneksi socket dibuat ke ALAMAT IP yang SUDAH
divalidasi publik oleh osint_dns_service (bukan hostname yang di-resolve
ulang oleh OS/library TLS saat connect -- itu celah klasik DNS rebinding).
SNI/hostname verification tetap pakai nama domain asli lewat `server_hostname`.
"""
from __future__ import annotations

import socket
import ssl
from dataclasses import dataclass


class TlsFetchError(RuntimeError):
    pass


@dataclass
class TlsCertInfo:
    subject: str
    issuer: str
    not_before: str
    not_after: str
    san: list[str]


def fetch_tls_certificate(domain: str, validated_ip: str, timeout_seconds: float, port: int = 443) -> TlsCertInfo:
    context = ssl.create_default_context()
    try:
        raw_sock = socket.create_connection((validated_ip, port), timeout=timeout_seconds)
    except OSError as exc:
        raise TlsFetchError(f"Tidak bisa membuka koneksi TCP ke {validated_ip}:{port}: {exc}") from exc

    try:
        with raw_sock:
            with context.wrap_socket(raw_sock, server_hostname=domain) as tls_sock:
                cert = tls_sock.getpeercert()
    except (ssl.SSLError, OSError) as exc:
        raise TlsFetchError(f"Handshake TLS ke '{domain}' gagal: {exc}") from exc

    if not cert:
        raise TlsFetchError(f"Sertifikat TLS '{domain}' tidak bisa dibaca (kosong).")

    subject = _flatten(cert.get("subject", ()))
    issuer = _flatten(cert.get("issuer", ()))
    san = [v for k, v in cert.get("subjectAltName", ()) if k == "DNS"]

    return TlsCertInfo(
        subject=subject,
        issuer=issuer,
        not_before=cert.get("notBefore", ""),
        not_after=cert.get("notAfter", ""),
        san=san,
    )


def _flatten(name_tuple) -> str:
    parts = []
    for rdn in name_tuple:
        for key, value in rdn:
            parts.append(f"{key}={value}")
    return ", ".join(parts)
