def test_create_and_list_asset(client):
    payload = {
        "name": "Server Web Satuan A",
        "asset_type": "domain",
        "identifier": "contoh-satuan.mil.id",
        "owner": "Tim IT Satuan A",
        "status": "pending_review",
    }
    create_res = client.post("/api/v1/assets", json=payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["name"] == payload["name"]
    assert "id" in created

    list_res = client.get("/api/v1/assets")
    assert list_res.status_code == 200
    items = list_res.json()
    assert any(item["id"] == created["id"] for item in items)
