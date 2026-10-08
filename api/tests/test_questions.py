from tests.helpers import H, QUESTION


def test_create_get_and_list_questions(client):
    created = client.post("/questions", json=QUESTION, headers=H)
    assert created.status_code == 201
    body = created.json()
    assert body["id"].startswith("q_") and body["rubricId"] is None
    assert {k: body[k] for k in QUESTION} == QUESTION

    assert client.get(f"/questions/{body['id']}", headers=H).json() == body

    client.post("/questions", json={**QUESTION, "course": "chem-101"}, headers=H)
    items = client.get("/questions", params={"course": "physics-101"}, headers=H).json()["items"]
    assert [q["id"] for q in items] == [body["id"]]


def test_unknown_question_is_404_in_contract_shape(client):
    res = client.get("/questions/q_missing", headers=H)
    assert res.status_code == 404
    assert res.json() == {"error": {"code": "not_found", "message": "Question q_missing does not exist"}}


def test_bad_body_is_422_invalid_input(client):
    res = client.post("/questions", json={**QUESTION, "marks": 0}, headers=H)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "invalid_input"


def test_list_needs_course_and_auth(client):
    assert client.get("/questions", headers=H).status_code == 422
    assert client.get("/questions", params={"course": "x"}).status_code == 401
