"""
Validasi dan klasifikasi alamat IP memakai modul stdlib `ipaddress`.
Tidak bergantung pada layanan eksternal apa pun -> selalu bisa dijalankan offline.
"""
import ipaddress

from app.models.ip_lookup import IpClassification


class InvalidIpAddressError(ValueError):
    pass


def parse_ip(raw: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address:
    try:
        return ipaddress.ip_address(raw.strip())
    except ValueError as exc:
        raise InvalidIpAddressError(f"'{raw}' bukan alamat IPv4/IPv6 yang valid") from exc


def classify_ip(ip: ipaddress.IPv4Address | ipaddress.IPv6Address) -> IpClassification:
    """
    Urutan pengecekan penting: alamat tertentu bisa memenuhi >1 kategori
    (mis. loopback juga private), jadi kategori paling spesifik dicek dulu.
    """
    if ip.is_unspecified:
        return IpClassification.UNSPECIFIED
    if ip.is_loopback:
        return IpClassification.LOOPBACK
    if ip.is_link_local:
        return IpClassification.LINK_LOCAL
    if ip.is_multicast:
        return IpClassification.MULTICAST
    if ip.is_private:
        return IpClassification.PRIVATE
    if ip.is_reserved:
        return IpClassification.RESERVED
    return IpClassification.PUBLIC


def is_eligible_for_external_lookup(classification: IpClassification) -> bool:
    """
    Hanya IP publik yang boleh diteruskan ke provider reputasi/geolokasi eksternal.
    IP private/loopback/link-local/dsb. ditolak di sini -- sebelum request keluar,
    bukan cuma di frontend.
    """
    return classification == IpClassification.PUBLIC
