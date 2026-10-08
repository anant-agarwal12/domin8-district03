def test_me_creates_student_on_first_call(client, db):
    res = client.get("/me", headers={"X-Dev-Uid": "u1"})
    assert res.status_code == 200
    assert res.json() == {"uid": "u1", "name": "u1", "role": "student", "course": None, "examDate": None}
    assert db.docs["u1"]["role"] == "student"


def test_me_keeps_existing_role(client, db):
    db.docs["t1"] = {"name": "Teacher", "role": "teacher", "course": "Physics", "examDate": "2026-11-01"}
    body = client.get("/me", headers={"X-Dev-Uid": "t1"}).json()
    assert body["role"] == "teacher"
    assert body["examDate"] == "2026-11-01"


def test_me_without_token_is_401_in_contract_shape(client):
    res = client.get("/me")
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "unauthorized"


def test_me_rejects_bad_bearer_token_when_auth_enabled(client, settings, monkeypatch):
    settings.auth_disabled = False
    monkeypatch.setattr("app.auth._firebase_app", lambda s: None)
    monkeypatch.setattr("app.auth.auth.verify_id_token", lambda token, app=None: (_ for _ in ()).throw(ValueError("bad")))
    res = client.get("/me", headers={"Authorization": "Bearer nope"})
    assert res.status_code == 401
    assert res.json()["error"]["code"] == "unauthorized"
