def test_create_and_list_incident(client):
    r = client.post("/api/v1/incidents", json={"title": "Suspicious login", "summary": "Test"})
    assert r.status_code == 201
    assert r.json()["status"] == "open"

    r2 = client.get("/api/v1/incidents")
    assert r2.status_code == 200
    assert r2.json()["total"] >= 1


def test_update_incident_status(client):
    created = client.post("/api/v1/incidents", json={"title": "Test incident"}).json()
    r = client.patch(f"/api/v1/incidents/{created['id']}", json={"status": "in_progress"})
    assert r.status_code == 200
    assert r.json()["status"] == "in_progress"


def test_update_unknown_incident_returns_404(client):
    r = client.patch("/api/v1/incidents/does-not-exist", json={"status": "closed"})
    assert r.status_code == 404


def test_filter_incidents_by_status(client):
    client.post("/api/v1/incidents", json={"title": "Open one"})
    r = client.get("/api/v1/incidents", params={"status": "open"})
    assert r.status_code == 200
    assert all(i["status"] == "open" for i in r.json()["items"])
