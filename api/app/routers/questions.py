from typing import Any

from fastapi import APIRouter, Depends

from app.auth import CurrentUser, current_user, get_db
from app.models import Question, QuestionIn
from app.store import find, load, new_id, save

router = APIRouter()


@router.post("/questions", status_code=201, response_model=Question)
def create_question(
    body: QuestionIn, _: CurrentUser = Depends(current_user), db: Any = Depends(get_db)
) -> Question:
    question = Question(id=new_id("q"), rubricId=None, **body.model_dump())
    save(db, "questions", question)
    return question


@router.get("/questions/{question_id}", response_model=Question)
def get_question(question_id: str, _: CurrentUser = Depends(current_user), db: Any = Depends(get_db)) -> Question:
    return load(db, "questions", question_id, Question, "Question")


@router.get("/questions")
def list_questions(
    course: str, _: CurrentUser = Depends(current_user), db: Any = Depends(get_db)
) -> dict[str, list[Question]]:
    return {"items": find(db, "questions", "course", course, Question)}
