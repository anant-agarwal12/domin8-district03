from typing import Any

from fastapi import APIRouter, Depends

from app import grading
from app.auth import CurrentUser, current_user, get_db, get_role
from app.config import Settings, get_settings
from app.errors import ApiError
from app.models import Attempt, GradeIn, Question, Rubric
from app.store import find, load, new_id, now_iso, save

router = APIRouter()


@router.post("/attempts/grade", status_code=201, response_model=Attempt)
def grade_attempt(
    body: GradeIn,
    user: CurrentUser = Depends(current_user),
    db: Any = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Attempt:
    question = load(db, "questions", body.questionId, Question, "Question")
    rubric = load(db, "rubrics", body.rubricId, Rubric, "Rubric")
    if rubric.questionId != question.id:
        raise ApiError("invalid_input", f"Rubric {rubric.id} belongs to a different question")
    if rubric.status != "confirmed":
        raise ApiError("invalid_input", f"Rubric {rubric.id} is not confirmed; confirm it before grading")

    lines = [line.model_copy(update={"legible": line.legible is not False}) for line in body.lines]
    first = grading.grade_once(question, rubric, lines, "grade-1", settings)
    second = grading.grade_once(question, rubric, lines, "grade-2", settings)
    level, reason = grading.confidence(lines, grading.total(first), grading.total(second))

    attempt = Attempt(
        id=new_id("a"),
        uid=user.uid,
        questionId=question.id,
        rubricId=rubric.id,
        inputType=body.inputType,
        imageId=body.imageId,
        lines=lines,
        stepResults=first,
        total=grading.total(first),
        max=rubric.maxMarks,
        confidence=level,
        confidenceReason=reason,
        gradedAt=now_iso(),
    )
    save(db, "attempts", attempt)
    return attempt


@router.get("/attempts/{attempt_id}", response_model=Attempt)
def get_attempt(attempt_id: str, user: CurrentUser = Depends(current_user), db: Any = Depends(get_db)) -> Attempt:
    attempt = load(db, "attempts", attempt_id, Attempt, "Attempt")
    _require_owner_or_teacher(db, user, attempt.uid)
    return attempt


@router.get("/attempts")
def list_attempts(
    uid: str | None = None, user: CurrentUser = Depends(current_user), db: Any = Depends(get_db)
) -> dict[str, list[Attempt]]:
    target = uid or user.uid
    _require_owner_or_teacher(db, user, target)
    items = sorted(find(db, "attempts", "uid", target, Attempt), key=lambda a: a.gradedAt, reverse=True)
    return {"items": items}


def _require_owner_or_teacher(db: Any, user: CurrentUser, owner_uid: str) -> None:
    if owner_uid != user.uid and get_role(db, user.uid) != "teacher":
        raise ApiError("forbidden", "You can only read your own attempts")
