from unittest.mock import patch

from app.services.osint_dns_service import ResolvedAddress
from app.services.osint_tls_service import TlsCertInfo


def test_lookup_invalid_domain_format_returns_201_with_invalid_status(client):
    # Input tidak valid BUKAN error server -- tetap 201 dengan status eksplisit,
    # supaya tercatat di history dan frontend bisa menampilkan alasannya.
    r = client.post("/api/v1/osint/lookup", json={"domain": "https://not-a-domain/path"})
    assert r.status_code == 201
    assert r.json()["status"] == "invalid_input"


def test_lookup_blocks_private_ip_domain(client):
    with patch("app.services.osint_dns_service.resolve_addresses") as mock_resolve:
        mock_resolve.return_value = [ResolvedAddress(ip="10.0.0.1", record_type="A")]
        r = client.post("/api/v1/osint/lookup", json={"domain": "internal.attacker.test"})
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "blocked"
    assert body["dns_records_json"] is None


def test_lookup_dns_error_when_no_records(client):
    with patch("app.services.osint_dns_service.resolve_addresses") as mock_resolve:
        mock_resolve.return_value = []
        r = client.post("/api/v1/osint/lookup", json={"domain": "nxdomain-test.invalid"})
    assert r.status_code == 201
    assert r.json()["status"] == "dns_error"


def test_lookup_success_with_tls(client):
    with patch("app.services.osint_dns_service.resolve_addresses") as mock_resolve, \
         patch("app.services.osint_dns_service.resolve_text_records") as mock_text, \
         patch("app.services.osint_service.fetch_tls_certificate") as mock_tls:
        mock_resolve.return_value = [ResolvedAddress(ip="93.184.216.34", record_type="A")]
        mock_text.return_value = ([], ["ns1.example.com"], [])
        mock_tls.return_value = TlsCertInfo(
            subject="CN=example.com", issuer="CN=Example CA",
            not_before="Jan 1 00:00:00 2025 GMT", not_after="Jan 1 00:00:00 2026 GMT", san=["example.com"],
        )
        r = client.post("/api/v1/osint/lookup", json={"domain": "example.com"})
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "ok"
    assert body["dns_records_json"] is not None
    assert body["tls_info_json"] is not None


def test_lookup_partial_when_tls_fails(client):
    with patch("app.services.osint_dns_service.resolve_addresses") as mock_resolve, \
         patch("app.services.osint_dns_service.resolve_text_records") as mock_text, \
         patch("app.services.osint_service.fetch_tls_certificate", side_effect=Exception("tls down")):
        mock_resolve.return_value = [ResolvedAddress(ip="93.184.216.34", record_type="A")]
        mock_text.return_value = ([], [], [])
        # fetch_tls_certificate dipanggil via TlsFetchError saja di service; pakai itu di sini:
        from app.services.osint_tls_service import TlsFetchError
        with patch("app.services.osint_service.fetch_tls_certificate", side_effect=TlsFetchError("down")):
            r = client.post("/api/v1/osint/lookup", json={"domain": "example.com"})
    assert r.status_code == 201
    assert r.json()["status"] == "partial"


def test_osint_history_pagination(client):
    with patch("app.services.osint_dns_service.resolve_addresses") as mock_resolve, \
         patch("app.services.osint_dns_service.resolve_text_records") as mock_text, \
         patch("app.services.osint_service.fetch_tls_certificate") as mock_tls:
        mock_resolve.return_value = [ResolvedAddress(ip="93.184.216.34", record_type="A")]
        mock_text.return_value = ([], [], [])
        mock_tls.return_value = TlsCertInfo(subject="", issuer="", not_before="", not_after="", san=[])
        client.post("/api/v1/osint/lookup", json={"domain": "paginate-test.example"})

    r = client.get("/api/v1/osint/history", params={"limit": 5})
    assert r.status_code == 200
    body = r.json()
    assert body["total"] >= 1
    assert len(body["items"]) <= 5


def test_osint_registered_in_integration_registry(client):
    r = client.get("/api/v1/integrations")
    items = {i["tool_id"]: i for i in r.json()}
    assert items["osint_domain"]["implemented"] is True
    assert items["osint_domain"]["configured"] is True
