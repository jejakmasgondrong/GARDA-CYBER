def test_health_endpoint(client):
    res = client.get("/api/v1/health")
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "ok"
    assert body["app_name"] == "GARDA CYBER"


def test_readiness_endpoint(client):
    res = client.get("/api/v1/ready")
    assert res.status_code == 200
    assert res.json()["status"] == "ready"
