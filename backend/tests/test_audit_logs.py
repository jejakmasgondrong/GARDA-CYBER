def test_audit_log_written_on_finding_create(client):
    from datetime import datetime, timezone
    client.post("/api/v1/findings", json={
        "category": "osint", "title": "Audit test", "source": "unit-test",
        "confidence": "low", "collected_at": datetime.now(timezone.utc).isoformat(),
        "dedupe_key": "audit-dedupe-1",
    })
    r = client.get("/api/v1/audit-logs")
    assert r.status_code == 200
    actions = [log["action"] for log in r.json()]
    assert "finding.created" in actions


def test_audit_log_does_not_leak_secrets(client):
    r = client.get("/api/v1/audit-logs")
    assert r.status_code == 200
    for log in r.json():
        body_str = str(log).lower()
        assert "authorization" not in body_str
        assert "bearer " not in body_str
