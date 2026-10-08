from typing import Any, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.auth import CurrentUser, current_user, get_db

router = APIRouter()


class User(BaseModel):
    uid: str
    name: str
    role: Literal["student", "teacher"]
    course: str | None
    examDate: str | None


@router.get("/me", response_model=User)
def me(user: CurrentUser = Depends(current_user), db: Any = Depends(get_db)) -> User:
    ref = db.collection("users").document(user.uid)
    snap = ref.get()
    if snap.exists:
        data = snap.to_dict()
    else:
        data = {"name": user.name, "role": "student", "course": None, "examDate": None}
        ref.set(data)
    return User(uid=user.uid, **data)
