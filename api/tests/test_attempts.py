import pytest

from tests.helpers import H, RUBRIC_STEPS, grade_body, grade_reply, make_confirmed_rubric

U2 = {"X-Dev-Uid": "u2"}
TEACHER = {"X-Dev-Uid": "t1"}


@pytest.fixture
def graded(client, fake_llm, db, monkeypatch):
    """Two attempts by u1 (older first), plus a user t1 with role teacher."""
    db.collection("users").document("t1").set({"name": "T", "role": "teacher", "course": None, "examDate": None})
    question, rubric = make_confirmed_rubric(client, fake_llm)
    stamps = iter(["2026-10-08T10:00:00Z", "2026-10-08T11:00:00Z"])
    monkeypatch.setattr("app.routers.attempts.now_iso", lambda: next(stamps))
    ids = []
    for _ in range(2):
        fake_llm.push(grade_reply({}, RUBRIC_STEPS))
        fake_llm.push(grade_reply({}, RUBRIC_STEPS))
        ids.append(client.post("/attempts/grade", json=grade_body(question, rubric), headers=H).json()["id"])
    return ids


def test_owner_and_teacher_can_read_an_attempt_others_cannot(client, graded):
    path = f"/attempts/{graded[0]}"
    assert client.get(path, headers=H).status_code == 200
    assert client.get(path, headers=TEACHER).status_code == 200
    other = client.get(path, headers=U2)
    assert other.status_code == 403 and other.json()["error"]["code"] == "forbidden"


def test_missing_attempt_is_404(client):
    assert client.get("/attempts/a_nope", headers=H).status_code == 404


def test_list_defaults_to_own_attempts_newest_first(client, graded):
    items = client.get("/attempts", headers=H).json()["items"]
    assert [a["id"] for a in items] == [graded[1], graded[0]]
    assert client.get("/attempts", params={"uid": "u1"}, headers=H).json()["items"] == items


def test_student_cannot_list_someone_elses_attempts(client, graded):
    res = client.get("/attempts", params={"uid": "u1"}, headers=U2)
    assert res.status_code == 403
    assert client.get("/attempts", headers=U2).json() == {"items": []}


def test_teacher_can_list_a_students_attempts(client, graded):
    items = client.get("/attempts", params={"uid": "u1"}, headers=TEACHER).json()["items"]
    assert len(items) == 2
