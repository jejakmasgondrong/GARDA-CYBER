from datetime import datetime, timezone


def _payload(dedupe="finding-1"):
    return {
        "category": "osint",
        "title": "Test finding",
        "source": "unit-test",
        "confidence": "medium",
        "collected_at": datetime.now(timezone.utc).isoformat(),
        "dedupe_key": dedupe,
    }


def test_create_and_list_finding(client):
    r = client.post("/api/v1/findings", json=_payload("dedupe-a"))
    assert r.status_code == 201
    body = r.json()
    assert body["status"] == "open"

    r2 = client.get("/api/v1/findings")
    assert r2.status_code == 200
    assert r2.json()["total"] >= 1


def test_duplicate_dedupe_key_rejected(client):
    client.post("/api/v1/findings", json=_payload("dedupe-b"))
    r = client.post("/api/v1/findings", json=_payload("dedupe-b"))
    assert r.status_code == 409


def test_invalid_confidence_rejected(client):
    payload = _payload("dedupe-c")
    payload["confidence"] = "extreme"
    r = client.post("/api/v1/findings", json=payload)
    assert r.status_code == 422


def test_update_finding_status(client):
    created = client.post("/api/v1/findings", json=_payload("dedupe-d")).json()
    r = client.patch(f"/api/v1/findings/{created['id']}", json={"status": "triaged"})
    assert r.status_code == 200
    assert r.json()["status"] == "triaged"


def test_update_unknown_finding_returns_404(client):
    r = client.patch("/api/v1/findings/does-not-exist", json={"status": "triaged"})
    assert r.status_code == 404


def test_filter_findings_by_category(client):
    client.post("/api/v1/findings", json=_payload("dedupe-e"))
    r = client.get("/api/v1/findings", params={"category": "osint"})
    assert r.status_code == 200
    assert all(f["category"] == "osint" for f in r.json()["items"])
