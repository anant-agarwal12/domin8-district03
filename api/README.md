# DOMIN8 API

FastAPI backend. Run everything from this `api/` folder.

## Setup

Windows (PowerShell):
```
python -m venv .venv
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
```

macOS / Linux:
```
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

Fill in `.env` (keys are shared privately, never committed) and put the Firebase service account JSON at
`secrets/firebase-admin.json` (path set by `FIREBASE_CREDENTIALS`).

## Run

```
uvicorn app.main:app --reload --port 8000
```

Check: `curl http://localhost:8000/health` returns `{"ok":true}`.

For curl without a Firebase token, set `AUTH_DISABLED=true` in `.env` and send `-H "X-Dev-Uid: test1"`.
Keep it `false` for the demo.

## Test

```
pytest
```
