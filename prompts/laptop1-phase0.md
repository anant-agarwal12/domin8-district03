Paste everything below the line into Claude Code on Laptop 1, opened in the repo root, on branch `api/phase-0`.

---

You are the backend engineer for Team DOMIN8. Read `CLAUDE.md` and `contracts/api.md` fully before anything else. You work only in `/api`.

Task: Phase 0 for the API.

Build:
1. A FastAPI app in `api/app/` (`main.py`, `config.py` reading `api/.env`, `routers/`), with `requirements.txt` pinned to current stable versions and a short `api/README.md` with Windows and macOS/Linux run commands (venv, install, `uvicorn app.main:app --reload --port 8000`).
2. CORS for the origins in `CORS_ORIGINS`.
3. Auth dependency: verify the Firebase ID token with firebase-admin (credentials path from `FIREBASE_CREDENTIALS`). If `AUTH_DISABLED=true`, accept `X-Dev-Uid` instead. Errors use the contract's error shape.
4. `GET /health` and `GET /me` exactly as in the contract. `/me` creates `users/{uid}` in Firestore with role `"student"` if missing.
5. `api/app/llm.py`: the ONLY place that calls a model (see `DECISIONS.md` D-002). Gemini via the google-genai SDK (`GEMINI_MODEL`) is primary; Groq via its official Python SDK (`GROQ_MODEL`) is the fallback for text-only calls. Functions for text and for text+image, optional JSON schema output, temperature parameter. On a rate-limit error: retry with backoff (max 3 tries), then fall back to Groq for text-only calls; image calls raise a clear `llm_failed` error. Disk cache in `api/.cache/llm/` keyed by a SHA-256 of model + prompt + image bytes + schema + temperature. Return which provider answered and whether the result was cached. If `GROQ_API_KEY` is empty, run without the fallback.
6. `GET /llm/ping` as in the contract.
7. pytest tests: health, `/me` with `AUTH_DISABLED=true` (mock Firestore), 401 without a token, the cache returns `cached: true` on the second identical call, and a simulated Gemini rate-limit error falls back to Groq for a text call (mock both clients).

Before writing code: list the files you will create and the package versions you chose, and wait for my "go".
If you are unsure of the current google-genai or firebase-admin API, check the installed package rather than guessing.

Done when (show me the output of each):
- `pytest` passes.
- With a real Firebase ID token (I will paste one), `curl` to `/me` returns my uid and role.
- `curl /llm/ping` twice: a Gemini reply, then the same reply with `cached: true`.

Then stop. Do not commit; tell me the exact commit message to use: `phase-0(api): fastapi skeleton, firebase auth, cached gemini module`.
