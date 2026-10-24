import pytest

from app.models.ip_lookup import IpClassification
from app.services.ip_classification import (
    InvalidIpAddressError,
    classify_ip,
    is_eligible_for_external_lookup,
    parse_ip,
)


@pytest.mark.parametrize(
    "raw,expected",
    [
        ("8.8.8.8", IpClassification.PUBLIC),
        ("1.1.1.1", IpClassification.PUBLIC),
        ("192.168.1.10", IpClassification.PRIVATE),
        ("10.0.0.5", IpClassification.PRIVATE),
        ("127.0.0.1", IpClassification.LOOPBACK),
        ("169.254.1.1", IpClassification.LINK_LOCAL),
        ("224.0.0.1", IpClassification.MULTICAST),
        ("0.0.0.0", IpClassification.UNSPECIFIED),
        ("::1", IpClassification.LOOPBACK),
        ("2001:4860:4860::8888", IpClassification.PUBLIC),
    ],
)
def test_classify_ip(raw, expected):
    assert classify_ip(parse_ip(raw)) == expected


def test_parse_invalid_ip_raises():
    with pytest.raises(InvalidIpAddressError):
        parse_ip("bukan-ip-yang-valid")


def test_only_public_ip_eligible_for_external_lookup():
    assert is_eligible_for_external_lookup(IpClassification.PUBLIC) is True
    for c in [
        IpClassification.PRIVATE, IpClassification.LOOPBACK, IpClassification.LINK_LOCAL,
        IpClassification.MULTICAST, IpClassification.RESERVED, IpClassification.UNSPECIFIED,
    ]:
        assert is_eligible_for_external_lookup(c) is False
