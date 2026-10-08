# Decision log

Architecture decisions for Team DOMIN8. Newest first. Each entry is final until a newer entry replaces it.
Both laptops pull `main` before starting any phase prompt, so both Claudes see the latest decisions.

## D-003 — 2026-10-08 — Firebase on the free Spark plan only
Auth (Google sign-in) and Firestore only. No Cloud Storage, no Cloud Functions, no billing account.
Uploads stay on the API's local disk. Keep Firestore traffic small: no polling loops; one realtime listener for the teacher queue.

## D-002 — 2026-10-08 — Free LLMs: Gemini primary, Groq text fallback
- Primary: Gemini free tier, a Flash model (`GEMINI_MODEL`). Needed for images (handwritten answers, scanned pages).
- Fallback: Groq free tier (`GROQ_MODEL`, `GROQ_API_KEY`) for text-only calls when Gemini returns a rate-limit error.
- Not used: xAI Grok (no free tier found), any paid model.
- Each laptop uses its own keys during development, so the two lanes don't share one quota.
- Disk cache in `llm.py` is mandatory; it cuts repeat calls during testing and makes the demo independent of quotas.
- No identifying student data goes to any model.

## D-001 — 2026-10-08 — LLM cache on local disk
Model responses are cached in `api/.cache/llm/` (hash of model + prompt + image + schema + temperature), not in Firestore.
