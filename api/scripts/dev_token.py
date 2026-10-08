"""DEV ONLY: print a real Firebase ID token for the test user, for curl against /me.

Mints a custom token for DEV_UID with the service account, then exchanges it for an ID token
through the Firebase Auth REST endpoint. Needs FIREBASE_WEB_API_KEY in api/.env.
Never use this outside local development.

Run from api/:  python -m scripts.dev_token
"""
import sys

import httpx
from firebase_admin import auth

from app.auth import _firebase_app
from app.config import get_settings

DEV_UID = "dev-student-1"
EXCHANGE_URL = "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken"


def main() -> int:
    settings = get_settings()
    if not settings.firebase_web_api_key:
        print("FIREBASE_WEB_API_KEY is not set in api/.env", file=sys.stderr)
        return 1
    custom_token = auth.create_custom_token(DEV_UID, app=_firebase_app(settings)).decode()
    res = httpx.post(
        EXCHANGE_URL,
        params={"key": settings.firebase_web_api_key},
        json={"token": custom_token, "returnSecureToken": True},
        timeout=15,
    )
    if res.status_code != 200:
        message = res.json().get("error", {}).get("message", res.text[:200])
        print(f"Token exchange failed ({res.status_code}): {message}", file=sys.stderr)
        return 1
    print(res.json()["idToken"])
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
