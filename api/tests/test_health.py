def test_health_needs_no_auth(client):
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"ok": True}
