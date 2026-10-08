from typing import Any

from fastapi import APIRouter, Depends

from app import rubrics as rubric_logic
from app.auth import CurrentUser, current_user, get_db
from app.config import Settings, get_settings
from app.models import ExtractIn, Question, Rubric, RubricUpdateIn
from app.store import load, new_id, now_iso, save

router = APIRouter()


@router.post("/rubrics/extract", status_code=201, response_model=Rubric)
def extract_rubric(
    body: ExtractIn,
    _: CurrentUser = Depends(current_user),
    db: Any = Depends(get_db),
    settings: Settings = Depends(get_settings),
) -> Rubric:
    question = load(db, "questions", body.questionId, Question, "Question")
    steps = rubric_logic.propose_steps(question, body.kind, body.content, settings)
    rubric = rubric_logic.build_rubric(new_id("r"), question.id, steps, "proposed", None)
    save(db, "rubrics", rubric)
    db.collection("questions").document(question.id).update({"rubricId": rubric.id})
    return rubric


@router.get("/rubrics/{rubric_id}", response_model=Rubric)
def get_rubric(rubric_id: str, _: CurrentUser = Depends(current_user), db: Any = Depends(get_db)) -> Rubric:
    return load(db, "rubrics", rubric_id, Rubric, "Rubric")


@router.put("/rubrics/{rubric_id}", response_model=Rubric)
def update_rubric(
    rubric_id: str, body: RubricUpdateIn, user: CurrentUser = Depends(current_user), db: Any = Depends(get_db)
) -> Rubric:
    current = load(db, "rubrics", rubric_id, Rubric, "Rubric")
    question = load(db, "questions", current.questionId, Question, "Question")
    rubric = rubric_logic.build_rubric(current.id, current.questionId, body.steps, "proposed", user.uid)
    rubric_logic.require_marks_match(rubric.steps, question)
    save(db, "rubrics", rubric)
    return rubric


@router.post("/rubrics/{rubric_id}/confirm", response_model=Rubric)
def confirm_rubric(
    rubric_id: str, user: CurrentUser = Depends(current_user), db: Any = Depends(get_db)
) -> Rubric:
    current = load(db, "rubrics", rubric_id, Rubric, "Rubric")
    question = load(db, "questions", current.questionId, Question, "Question")
    rubric_logic.require_marks_match(current.steps, question)
    rubric = current.model_copy(update={"status": "confirmed", "editedBy": user.uid})
    rubric.updatedAt = now_iso()
    save(db, "rubrics", rubric)
    return rubric
