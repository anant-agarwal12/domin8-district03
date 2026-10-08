import pytest
from pydantic import ValidationError

from app.models import ERROR_TYPES, STEP_TYPES, Attempt, GradeIn, Question, QuestionIn, Rubric
from tests.helpers import QUESTION, load_mock


@pytest.mark.parametrize(
    "mock, model",
    [
        ("question", Question),
        ("rubric_proposed", Rubric),
        ("rubric_confirmed", Rubric),
        ("attempt_graded", Attempt),
        ("attempt_low_confidence", Attempt),
    ],
)
def test_models_round_trip_every_contract_mock(mock, model):
    data = load_mock(mock)
    assert model(**data).model_dump() == data


def test_error_taxonomy_matches_claude_md():
    assert set(ERROR_TYPES) == {
        "concept", "formula", "calculation", "units", "notation", "skipped_step", "presentation", "incomplete"
    }
    assert set(STEP_TYPES) == {"setup", "formula", "method", "calculation", "final_answer", "presentation"}


@pytest.mark.parametrize(
    "change",
    [{"marks": 0}, {"marks": -1}, {"source": "exam"}, {"text": ""}, {"course": ""}],
)
def test_question_rejects_bad_input(change):
    with pytest.raises(ValidationError):
        QuestionIn(**{**QUESTION, **change})


def test_question_year_is_optional_and_defaults_to_null():
    body = {k: v for k, v in QUESTION.items() if k != "year"}
    assert QuestionIn(**body).year is None


def test_grade_body_rejects_duplicate_line_numbers_and_empty_lines():
    base = {"questionId": "q", "rubricId": "r", "inputType": "typed"}
    with pytest.raises(ValidationError):
        GradeIn(**base, lines=[{"n": 1, "text": "a"}, {"n": 1, "text": "b"}])
    with pytest.raises(ValidationError):
        GradeIn(**base, lines=[])


def test_unknown_error_type_is_rejected():
    data = load_mock("attempt_graded")
    data["stepResults"][1]["errorType"] = "careless"
    with pytest.raises(ValidationError):
        Attempt(**data)
