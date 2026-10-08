"""Small Firestore helpers shared by the routers."""
import uuid
from datetime import datetime, timezone
from typing import Any, TypeVar

from google.cloud.firestore_v1.base_query import FieldFilter
from pydantic import BaseModel

from app.errors import ApiError

M = TypeVar("M", bound=BaseModel)


def new_id(prefix: str) -> str:
    return f"{prefix}_{uuid.uuid4().hex[:8]}"


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def load(db: Any, collection: str, doc_id: str, model: type[M], label: str) -> M:
    snap = db.collection(collection).document(doc_id).get()
    if not snap.exists:
        raise ApiError("not_found", f"{label} {doc_id} does not exist")
    return model(**snap.to_dict())


def save(db: Any, collection: str, item: Any) -> None:
    db.collection(collection).document(item.id).set(item.model_dump())


def find(db: Any, collection: str, field: str, value: Any, model: type[M]) -> list[M]:
    query = db.collection(collection).where(filter=FieldFilter(field, "==", value))
    return [model(**snap.to_dict()) for snap in query.stream()]
