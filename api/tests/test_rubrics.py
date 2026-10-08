from tests.helpers import H, QUESTION, RUBRIC_STEPS, make_confirmed_rubric


def extract(client, question_id, kind="scheme", content="2 marks per step"):
    body = {"questionId": question_id, "kind": kind, "content": content}
    return client.post("/rubrics/extract", json=body, headers=H)


def new_question(client):
    return client.post("/questions", json=QUESTION, headers=H).json()


def test_extract_returns_proposed_rubric_with_python_ids_and_sum(client, fake_llm):
    question = new_question(client)
    steps = [dict(s) for s in RUBRIC_STEPS]
    steps[4]["marks"] = 2.5  # the model's own idea of the total is irrelevant: we sum
    fake_llm.push({"steps": steps})

    res = extract(client, question["id"])

    assert res.status_code == 201
    rubric = res.json()
    assert rubric["status"] == "proposed" and rubric["editedBy"] is None
    assert [s["id"] for s in rubric["steps"]] == ["s1", "s2", "s3", "s4", "s5"]
    assert rubric["maxMarks"] == 10.5
    assert client.get(f"/questions/{question['id']}", headers=H).json()["rubricId"] == rubric["id"]


def test_extract_prompt_uses_question_and_content_at_temperature_zero(client, fake_llm):
    question = new_question(client)
    fake_llm.push({"steps": RUBRIC_STEPS})
    extract(client, question["id"], kind="sample", content="SOLVED-SAMPLE-TEXT")
    call = fake_llm.calls[0]
    assert QUESTION["text"] in call["prompt"] and "SOLVED-SAMPLE-TEXT" in call["prompt"]
    assert "solved sample" in call["prompt"] and call["temperature"] == 0.0 and call["schema"]


def test_extract_retries_once_on_unusable_output(client, fake_llm):
    question = new_question(client)
    fake_llm.push("not json")
    fake_llm.push({"steps": RUBRIC_STEPS})
    assert extract(client, question["id"]).status_code == 201
    assert fake_llm.salts == ["", "retry"]


def test_extract_fails_with_502_after_two_bad_outputs(client, fake_llm):
    question = new_question(client)
    fake_llm.push({"steps": []})
    fake_llm.push("{}")
    res = extract(client, question["id"])
    assert res.status_code == 502 and res.json()["error"]["code"] == "llm_failed"
    assert len(fake_llm.calls) == 2


def test_extract_for_unknown_question_is_404(client, fake_llm):
    assert extract(client, "q_nope").status_code == 404
    assert fake_llm.calls == []


def test_put_keeps_ids_adds_new_ids_resets_to_proposed(client, fake_llm):
    _, rubric = make_confirmed_rubric(client, fake_llm)
    last = {"description": "Final answer and presentation", "marks": 4, "type": "final_answer", "expected": "9 J, neat"}
    steps = rubric["steps"][:3] + [last]

    res = client.put(f"/rubrics/{rubric['id']}", json={"steps": steps}, headers={"X-Dev-Uid": "teacher-9"})

    assert res.status_code == 200
    updated = res.json()
    assert updated["status"] == "proposed" and updated["editedBy"] == "teacher-9"
    assert [s["id"] for s in updated["steps"]] == ["s1", "s2", "s3", "s4"]
    assert updated["maxMarks"] == 10


def test_put_rejects_duplicate_ids_and_empty_steps(client, fake_llm):
    _, rubric = make_confirmed_rubric(client, fake_llm)
    dup = [rubric["steps"][0], rubric["steps"][0]]
    assert client.put(f"/rubrics/{rubric['id']}", json={"steps": dup}, headers=H).status_code == 422
    assert client.put(f"/rubrics/{rubric['id']}", json={"steps": []}, headers=H).status_code == 422


def test_confirm_and_get(client, fake_llm):
    _, rubric = make_confirmed_rubric(client, fake_llm)
    assert rubric["status"] == "confirmed" and rubric["editedBy"] == "u1"
    assert client.get(f"/rubrics/{rubric['id']}", headers=H).json() == rubric
    assert client.get("/rubrics/r_missing", headers=H).status_code == 404
    assert client.post("/rubrics/r_missing/confirm", headers=H).status_code == 404


# --- step marks must add up to the question's marks (confirm and PUT) -------------------------


def mismatch_message(got: float, want: float, question_id: str) -> str:
    return f"Rubric steps add up to {got:g} marks but question {question_id} is worth {want:g} marks"


def test_confirm_refuses_when_steps_do_not_add_up_to_question_marks(client, fake_llm):
    question = new_question(client)
    steps = [dict(s) for s in RUBRIC_STEPS]
    steps[4]["marks"] = 2.5  # 10.5 against a 10-mark question
    fake_llm.push({"steps": steps})
    rubric = extract(client, question["id"]).json()

    res = client.post(f"/rubrics/{rubric['id']}/confirm", headers=H)

    assert res.status_code == 422
    assert res.json() == {"error": {"code": "validation_error", "message": mismatch_message(10.5, 10, question["id"])}}
    assert client.get(f"/rubrics/{rubric['id']}", headers=H).json()["status"] == "proposed"


def test_confirm_works_after_the_marks_are_fixed_by_put(client, fake_llm):
    question = new_question(client)
    steps = [dict(s) for s in RUBRIC_STEPS]
    steps[4]["marks"] = 2.5
    fake_llm.push({"steps": steps})
    rubric = extract(client, question["id"]).json()
    fixed = [{**s, "marks": 2} for s in rubric["steps"]]

    assert client.put(f"/rubrics/{rubric['id']}", json={"steps": fixed}, headers=H).status_code == 200
    assert client.post(f"/rubrics/{rubric['id']}/confirm", headers=H).json()["status"] == "confirmed"


def test_put_refuses_when_steps_do_not_add_up_to_question_marks(client, fake_llm):
    question, rubric = make_confirmed_rubric(client, fake_llm)
    short = rubric["steps"][:3]  # 6 of 10 marks

    res = client.put(f"/rubrics/{rubric['id']}", json={"steps": short}, headers=H)

    assert res.status_code == 422
    assert res.json() == {"error": {"code": "validation_error", "message": mismatch_message(6, 10, question["id"])}}
    stored = client.get(f"/rubrics/{rubric['id']}", headers=H).json()
    assert stored == rubric  # a refused PUT changes nothing: still confirmed, same steps


def test_put_accepts_marks_that_add_up_even_with_fractions(client, fake_llm):
    _, rubric = make_confirmed_rubric(client, fake_llm)
    steps = [{**s, "marks": 0.1 * 5} for s in rubric["steps"][:4]] + [{**rubric["steps"][4], "marks": 8}]
    res = client.put(f"/rubrics/{rubric['id']}", json={"steps": steps}, headers=H)
    assert res.status_code == 200 and res.json()["maxMarks"] == 10


def test_mismatch_error_leaves_plain_422s_as_invalid_input(client):
    res = client.put("/rubrics/r_x", json={"steps": []}, headers=H)
    assert res.status_code == 422 and res.json()["error"]["code"] == "invalid_input"
