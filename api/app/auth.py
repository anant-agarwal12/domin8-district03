from dataclasses import dataclass
from typing import Any

import firebase_admin
from fastapi import Depends, Header
from firebase_admin import auth, credentials, firestore

from app.config import Settings, get_settings
from app.errors import ApiError


@dataclass(frozen=True)
class CurrentUser:
    uid: str
    name: str


def _firebase_app(settings: Settings) -> firebase_admin.App:
    try:
        return firebase_admin.get_app()
    except ValueError:
        cred = credentials.Certificate(str(settings.credentials_path))
        return firebase_admin.initialize_app(cred, {"projectId": settings.firebase_project_id})


def get_db(settings: Settings = Depends(get_settings)) -> Any:
    return firestore.client(app=_firebase_app(settings))


def current_user(
    authorization: str | None = Header(default=None),
    x_dev_uid: str | None = Header(default=None),
    settings: Settings = Depends(get_settings),
) -> CurrentUser:
    if settings.auth_disabled:
        if not x_dev_uid:
            raise ApiError("unauthorized", "AUTH_DISABLED is on: send an X-Dev-Uid header")
        return CurrentUser(uid=x_dev_uid, name=x_dev_uid)

    if not authorization or not authorization.lower().startswith("bearer "):
        raise ApiError("unauthorized", "Missing bearer token")
    token = authorization[7:].strip()
    try:
        claims = auth.verify_id_token(token, app=_firebase_app(settings))
    except Exception as exc:  # firebase-admin raises several distinct error types
        raise ApiError("unauthorized", "Invalid or expired token") from exc
    return CurrentUser(uid=claims["uid"], name=claims.get("name") or claims.get("email", claims["uid"]))


def get_role(db: Any, uid: str) -> str:
    snap = db.collection("users").document(uid).get()
    return (snap.to_dict() or {}).get("role", "student") if snap.exists else "student"
