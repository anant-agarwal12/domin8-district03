Paste everything below the line into Claude Code on Laptop 1, on branch `api/phase-1` (created from an up-to-date `main`).

---

Phase 1 for the API. Re-read `CLAUDE.md` and the Phase 1 section of `contracts/api.md`. Work only in `/api`.

Build:
1. Pydantic models in `api/app/models.py` matching the contract exactly (camelCase on the wire).
2. `POST /questions`, `GET /questions/{id}`, `GET /questions?course=` stored in Firestore `questions`.
3. Rubric extraction: `POST /rubrics/extract` sends the scheme or solved sample to Gemini through `llm.py` with a JSON schema and returns proposed steps. `maxMarks` is summed in Python. If marks are missing in a solved sample, the model proposes them and the rubric stays `"proposed"`.
4. `PUT /rubrics/{id}`, `POST /rubrics/{id}/confirm`, `GET /rubrics/{id}`.
5. Grading: `POST /attempts/grade`. Refuse unconfirmed rubrics with 422. Prompt Gemini at temperature 0 with the rubric steps and the numbered answer lines; schema output per step: awarded, matchedLines, reason, errorType (only from the taxonomy in CLAUDE.md), fix. Validate in Python: awarded within 0..max, errorType null only when full marks, otherwise retry once, then 502 `llm_failed`. Grade twice (two calls with a different cache salt); confidence is `"low"` if totals differ by more than 1 or any line has `legible: false`, with a `confidenceReason`. Use the first grading's step results. Sum `total` in Python. Save to Firestore `attempts`.
6. `GET /attempts/{id}` and `GET /attempts?uid=` with the ownership rule from the contract.
7. `api/scripts/check_phase1.py`: reads `api/data/check/phase1_cases.json` (question, scheme, typed answer lines, expected total), runs extract → confirm → grade, and prints each case's expected vs got and whether it is within ±1. I will supply 5 cases; create the file with one demo case so the script runs.
8. pytest: model validation, total summing, confidence rule, refusal of unconfirmed rubrics, retry-then-fail path (mock Gemini).

Before writing code: list the files and the prompt design (what goes into the grading prompt), and wait for my "go".

Done when (show me the output):
- `pytest` passes.
- `python scripts/check_phase1.py` shows all 5 of my cases within ±1, no step above its max, and every lost mark with a taxonomy error type.
- One `POST /attempts/grade` response body validates against `contracts/mocks/attempt_graded.json`'s shape.

Then stop and give me the commit message: `phase-1(api): questions, rubric extraction and confirm, typed step-wise grading with confidence`.
