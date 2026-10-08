import json

import pytest

from app import grading
from app.errors import ApiError
from app.models import AnswerLine, Rubric, StepResult
from tests.helpers import H, LINES, RUBRIC_STEPS, grade_body, grade_reply, load_mock, make_confirmed_rubric

RUBRIC = Rubric(**load_mock("rubric_confirmed"))
ALL_LINES = [AnswerLine(**line) for line in LINES]
QUESTION_TEXT = "A 2 kg mass moves at 3 m/s"


def validate(reply) -> list[StepResult]:
    return grading.validate(reply if isinstance(reply, str) else json.dumps(reply), RUBRIC, ALL_LINES)


# --- validation of the model's output ---------------------------------------------------


def test_valid_output_becomes_step_results():
    results = validate(grade_reply({"s2": (0, "formula")}, RUBRIC_STEPS))
    assert [r.awarded for r in results] == [2, 0, 2, 2, 2]
    assert results[1].errorType == "formula" and results[1].max == 2


@pytest.mark.parametrize("awarded", [2.5, -1])
def test_awarded_outside_range_is_invalid(awarded):
    with pytest.raises(grading.GradingInvalid):
        validate(grade_reply({"s1": (awarded, "concept")}, RUBRIC_STEPS))


def test_lost_marks_without_error_type_is_invalid():
    with pytest.raises(grading.GradingInvalid):
        validate(grade_reply({"s3": (1, None)}, RUBRIC_STEPS))


def test_error_type_outside_taxonomy_is_invalid():
    with pytest.raises(grading.GradingInvalid):
        validate(grade_reply({"s3": (1, "careless")}, RUBRIC_STEPS))


def test_missing_extra_or_repeated_step_is_invalid():
    steps = grade_reply({}, RUBRIC_STEPS)["steps"]
    with pytest.raises(grading.GradingInvalid):
        validate({"steps": steps[:-1]})
    with pytest.raises(grading.GradingInvalid):
        validate({"steps": steps + [{**steps[0], "stepId": "s9"}]})
    with pytest.raises(grading.GradingInvalid):
        validate({"steps": steps[:-1] + [steps[0]]})


def test_not_json_is_invalid():
    with pytest.raises(grading.GradingInvalid):
        validate("sorry, I cannot grade this")


def test_full_marks_with_stray_error_type_are_normalized():
    reply = grade_reply({}, RUBRIC_STEPS)
    reply["steps"][0].update(errorType="concept", fix="do better")
    first = validate(reply)[0]
    assert (first.errorType, first.fix) == (None, None)


def test_unknown_matched_lines_are_dropped_not_fatal():
    reply = grade_reply({}, RUBRIC_STEPS)
    reply["steps"][0]["matchedLines"] = [1, 99]
    assert validate(reply)[0].matchedLines == [1]


# --- total and confidence --------------------------------------------------------------


def test_total_is_summed_in_python_without_float_noise():
    results = [
        StepResult(stepId=f"s{i}", awarded=a, max=1, matchedLines=[], reason="r", errorType=None, fix=None)
        for i, a in enumerate([0.1, 0.2, 0.3], start=1)
    ]
    assert grading.total(results) == 0.6


def test_confidence_high_when_totals_within_one_and_all_legible():
    assert grading.confidence(ALL_LINES, 6, 7) == ("high", None)
    assert grading.confidence(ALL_LINES, 6, 6) == ("high", None)


def test_confidence_low_when_totals_differ_by_more_than_one():
    level, reason = grading.confidence(ALL_LINES, 6, 7.5)
    assert level == "low" and "1.5 marks" in reason and "teacher" in reason


def test_confidence_low_for_illegible_lines():
    lines = [AnswerLine(n=1, text="a"), AnswerLine(n=2, text="b", legible=False), AnswerLine(n=3, text="c", legible=False)]
    level, reason = grading.confidence(lines, 5, 5)
    assert level == "low" and "Lines 2, 3 were illegible" in reason


def test_confidence_reasons_combine():
    lines = [AnswerLine(n=1, text="a", legible=False)]
    _, reason = grading.confidence(lines, 5, 8)
    assert "Line 1 was illegible" in reason and "differed by 3 marks" in reason


# --- the endpoint -------------------------------------------------------------------------


def queue_two_gradings(fake_llm, first, second=None):
    fake_llm.push(first)
    fake_llm.push(second if second is not None else first)


def test_grade_happy_path(client, fake_llm):
    question, rubric = make_confirmed_rubric(client, fake_llm)
    queue_two_gradings(fake_llm, grade_reply({"s2": (0, "formula"), "s5": (0, "units")}, RUBRIC_STEPS))
    fake_llm.calls.clear()

    res = client.post("/attempts/grade", json=grade_body(question, rubric), headers=H)

    assert res.status_code == 201
    attempt = res.json()
    assert attempt["total"] == 6 and attempt["max"] == 10
    assert attempt["confidence"] == "high" and attempt["confidenceReason"] is None
    assert attempt["uid"] == "u1" and attempt["inputType"] == "typed" and attempt["imageId"] is None
    assert all(call["temperature"] == 0.0 for call in fake_llm.calls)
    assert fake_llm.salts == ["grade-1", "grade-2"]
    assert QUESTION_TEXT in fake_llm.calls[0]["prompt"] and "[2] E = 1/2 (2)(3)^2" in fake_llm.calls[0]["prompt"]
    assert client.get(f"/attempts/{attempt['id']}", headers=H).json() == attempt


def test_every_lost_mark_has_a_taxonomy_error_type(client, fake_llm):
    question, rubric = make_confirmed_rubric(client, fake_llm)
    queue_two_gradings(fake_llm, grade_reply({"s1": (1, "notation"), "s4": (0, "calculation")}, RUBRIC_STEPS))
    attempt = client.post("/attempts/grade", json=grade_body(question, rubric), headers=H).json()
    for step in attempt["stepResults"]:
        assert step["awarded"] <= step["max"]
        assert (step["errorType"] is None) == (step["awarded"] == step["max"])


def test_first_grading_is_stored_second_only_affects_confidence(client, fake_llm):
    question, rubric = make_confirmed_rubric(client, fake_llm)
    queue_two_gradings(
        fake_llm,
        grade_reply({"s2": (0, "formula")}, RUBRIC_STEPS),  # 8
        grade_reply({"s2": (0, "formula"), "s3": (0, "concept"), "s4": (0, "calculation")}, RUBRIC_STEPS),  # 4
    )
    attempt = client.post("/attempts/grade", json=grade_body(question, rubric), headers=H).json()
    assert attempt["total"] == 8
    assert attempt["confidence"] == "low" and "differed by 4 marks" in attempt["confidenceReason"]


def test_one_mark_difference_keeps_high_confidence(client, fake_llm):
    question, rubric = make_confirmed_rubric(client, fake_llm)
    queue_two_gradings(fake_llm, grade_reply({}, RUBRIC_STEPS), grade_reply({"s1": (1, "notation")}, RUBRIC_STEPS))
    attempt = client.post("/attempts/grade", json=grade_body(question, rubric), headers=H).json()
    assert attempt["confidence"] == "high"


def test_illegible_line_forces_low_confidence_and_is_flagged_in_prompt(client, fake_llm):
    question, rubric = make_confirmed_rubric(client, fake_llm)
    queue_two_gradings(fake_llm, grade_reply({}, RUBRIC_STEPS))
    lines = [{"n": 1, "text": "m=2"}, {"n": 2, "text": "??", "legible": False}]
    fake_llm.calls.clear()
    attempt = client.post("/attempts/grade", json=grade_body(question, rubric, lines), headers=H).json()
    assert attempt["confidence"] == "low" and "Line 2 was illegible" in attempt["confidenceReason"]
    assert "[2] ??  [ILLEGIBLE]" in fake_llm.calls[0]["prompt"]
    assert [line["legible"] for line in attempt["lines"]] == [True, False]


def test_unconfirmed_rubric_is_refused_with_422(client, fake_llm):
    question, rubric = make_confirmed_rubric(client, fake_llm)
    client.put(f"/rubrics/{rubric['id']}", json={"steps": rubric["steps"]}, headers=H)  # back to proposed
    fake_llm.calls.clear()
    res = client.post("/attempts/grade", json=grade_body(question, rubric), headers=H)
    assert res.status_code == 422
    assert res.json()["error"]["code"] == "invalid_input" and "not confirmed" in res.json()["error"]["message"]
    assert fake_llm.calls == []


def test_rubric_of_another_question_is_refused(client, fake_llm):
    _, rubric = make_confirmed_rubric(client, fake_llm)
    other, _ = make_confirmed_rubric(client, fake_llm)
    res = client.post("/attempts/grade", json=grade_body(other, rubric), headers=H)
    assert res.status_code == 422 and "different question" in res.json()["error"]["message"]


def test_invalid_output_is_retried_once_then_succeeds(client, fake_llm):
    question, rubric = make_confirmed_rubric(client, fake_llm)
    fake_llm.calls.clear()
    fake_llm.push(grade_reply({"s1": (5, "concept")}, RUBRIC_STEPS))  # awarded 5 > max 2
    fake_llm.push(grade_reply({}, RUBRIC_STEPS))
    fake_llm.push(grade_reply({}, RUBRIC_STEPS))
    res = client.post("/attempts/grade", json=grade_body(question, rubric), headers=H)
    assert res.status_code == 201 and res.json()["total"] == 10
    assert fake_llm.salts == ["grade-1", "grade-1-retry", "grade-2"]


def test_invalid_output_twice_is_502_and_nothing_is_saved(client, fake_llm, db):
    question, rubric = make_confirmed_rubric(client, fake_llm)
    fake_llm.calls.clear()
    fake_llm.push(grade_reply({"s3": (1, None)}, RUBRIC_STEPS))
    fake_llm.push("not json at all")
    res = client.post("/attempts/grade", json=grade_body(question, rubric), headers=H)
    assert res.status_code == 502 and res.json()["error"]["code"] == "llm_failed"
    assert len(fake_llm.calls) == 2
    assert db.data.get("attempts", {}) == {}


def test_llm_failure_during_grading_is_passed_through(client, fake_llm, monkeypatch):
    question, rubric = make_confirmed_rubric(client, fake_llm)

    def boom(*args, **kwargs):
        raise ApiError("llm_failed", "Gemini is unavailable")

    monkeypatch.setattr("app.llm.generate", boom)
    assert client.post("/attempts/grade", json=grade_body(question, rubric), headers=H).status_code == 502


def shape(value):
    if isinstance(value, bool):
        return "bool"
    if isinstance(value, (int, float)):
        return "number"
    return type(value).__name__


def test_response_has_exactly_the_shape_of_the_graded_mock(client, fake_llm):
    question, rubric = make_confirmed_rubric(client, fake_llm)
    queue_two_gradings(fake_llm, grade_reply({"s2": (0, "formula"), "s5": (0, "units")}, RUBRIC_STEPS))
    attempt = client.post("/attempts/grade", json=grade_body(question, rubric), headers=H).json()
    mock = load_mock("attempt_graded")
    assert set(attempt) == set(mock)
    assert set(attempt["stepResults"][0]) == set(mock["stepResults"][0])
    assert set(attempt["lines"][0]) == set(mock["lines"][0])
    for key in ("id", "uid", "questionId", "rubricId", "inputType", "total", "max", "confidence", "gradedAt"):
        assert shape(attempt[key]) == shape(mock[key]), key
    for got, want in zip(attempt["stepResults"], mock["stepResults"]):
        assert {k: shape(v) for k, v in got.items()} == {k: shape(v) for k, v in want.items()}
