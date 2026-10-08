# CLAUDE.md — Team DOMIN8, District 03 (The Industry Games 2026)

Read this whole file before doing anything. Then read `DECISIONS.md` and `contracts/api.md`.
Architecture decisions are made outside this repo and recorded in `DECISIONS.md`. If code and `DECISIONS.md` disagree,
`DECISIONS.md` wins; point out the conflict to the human.

## What we are building

An AI-native education OS for intelligent doubt resolution (District 03, sponsor AtomTalk).
A student's doubt arrives three ways (typed, from a graded answer, or detected while reading).
An orchestrator agent, guarded by tested policy rules, routes it to the right help:
an AI explanation, adaptive practice, or a matched human teacher (live or one-to-one).
Every route shows its reason. Teacher sessions feed a knowledge base that improves later AI answers.

Signature features: Examiner Mode (grades handwritten answers step by step against the faculty's
own rubric), Mistake DNA (recurring error types per student), Mark-Leak Report, Co-Reader
(page + AI notes split view with PYQ highlights and stuck detection).

## Two laptops, two lanes

| Lane | Who | Owns | Never edits |
|---|---|---|---|
| Laptop 1 — backend | Anant | `/api` | `/web` |
| Laptop 2 — frontend | Teammate | `/web` | `/api` |

Shared, edited only after both people agree: `CLAUDE.md`, `contracts/`.

## Golden rules for Claude on either laptop

1. Work only inside your lane's folder. If the task seems to need a change in the other lane, stop and say so.
2. `contracts/api.md` is the source of truth for every endpoint and JSON shape. Never change a shape on your own.
   If the contract looks wrong or incomplete, stop, explain the proposed change, and wait for the human.
3. Work one phase at a time. Before coding, list the files you will create or change and wait for "go".
4. A phase is done only when its check (table below) passes. Run the check, show the output, then stop.
5. If anything is ambiguous, ask instead of guessing.
6. Never commit secrets. Keys live in `.env` files that git ignores. Never print keys in logs.
7. Never push to `main` directly. Work on the phase branch. The human merges.
8. Commit messages are phase-tagged: `phase-<N>(api): <what>` or `phase-<N>(web): <what>`.

## Phase workflow (both laptops, every phase)

1. Both: `git checkout main && git pull`.
2. Laptop 1: `git checkout -b api/phase-N`. Laptop 2: `git checkout -b web/phase-N`.
3. Each builds its half of phase N and runs its lane check.
4. Laptop 1 pushes its branch and merges it into `main` (GitHub PR or local merge), then pushes `main`.
5. Laptop 2 pulls `main`, merges `web/phase-N` into it, switches the web app to real endpoints
   (`NEXT_PUBLIC_USE_MOCKS=false`), and runs the integration check with the API running on Laptop 1
   (or on Laptop 2 after pulling — see "Running both halves" below).
6. Integration check passes → commit `phase-N: integrate` on `main`, push. Both pull. Next phase.

Laptop 2 builds against `contracts/mocks` until step 5, so it never waits for the backend.

## Running both halves on one machine (for integration checks)

- API: `cd api` → venv → `uvicorn app.main:app --reload --port 8000`
- Web: `cd web` → `npm run dev` (port 3000), `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Both laptops need their own `.env` files with the shared keys (sent privately, never committed).

## Stack (fixed — do not swap libraries without asking)

- `/web`: Next.js (App Router, TypeScript), Tailwind, Firebase JS SDK (Auth + Firestore listeners), react-pdf, KaTeX, Recharts.
- `/api`: Python 3.11+, FastAPI, firebase-admin (token check + Firestore), google-genai (Gemini), ChromaDB (persistent, local),
  PyMuPDF, python-pptx, pytest.
- Zero cost: everything must run on free tiers. No paid API, no billing account. See `DECISIONS.md`.
- LLM: Gemini free tier (a Flash model, name from env `GEMINI_MODEL`) is the primary model and the only one used for images.
  Groq free tier (model from env `GROQ_MODEL`) is the fallback for text-only calls when Gemini returns a rate-limit error.
  Grading at temperature 0. JSON output against a schema.
- All model calls go through ONE module (`api/app/llm.py`) that caches responses on disk by a hash of the input
  (`api/.cache/llm/`), retries rate-limit errors with backoff, then falls back to Groq for text-only calls.
  Demo calls then return instantly and work if the venue network is slow.
- Never send real student names or identifying data to any model: free tiers may use inputs to improve their products.
- Embeddings: Chroma's default local embedding model for every collection (`vault`, `pyq`, `kb`). Never mix models.
- File uploads: local disk under `api/data/uploads/`.
- Video: Jitsi room links opened in a new tab.

## Data rules

- Totals are always summed in Python from step results, never taken from the model's arithmetic.
- Every stored judgement (marks, route, error type) stores its reason next to it.
- One fixed topic list (the course syllabus) in `api/app/data/topics.json`. Everything is tagged against it.

## Error taxonomy (Mistake DNA) — the grader must pick exactly one per lost mark

`concept`, `formula`, `calculation`, `units`, `notation`, `skipped_step`, `presentation`, `incomplete`

## Policy rules (final say over the orchestrator agent; first match wins; reasons from all fired rules are shown)

| # | Condition | Route |
|---|---|---|
| 1 | Grading confidence is low | teacher |
| 2 | Same topic + error type ≥ 3 times, or ≥ 2 AI explanations already failed on this doubt | teacher |
| 3 | Concept gap on a top-5 PYQ topic and exam ≤ 3 days away | teacher (priority) |
| 4 | Error type in calculation, units, notation, skipped_step, presentation, incomplete | practice |
| 5 | Concept or formula gap | explain, then one check question |
| 6 | Anything else | explain |

## Agents (Phase 4+, Gemini function calling, all in `/api`)

Orchestrator (proposes route, calls agents, writes the reason) → Understanding, Tutor, Practice, Examiner, Matchmaker.
Every agent step is logged on the doubt so the UI can show why.

## Phases — split per lane, with checks

| Phase | Laptop 1 — `/api` | Laptop 2 — `/web` | Lane checks |
|---|---|---|---|
| 0 Setup | FastAPI skeleton, Firebase token check, `llm.py` with disk cache, `GET /me`, `GET /llm/ping`, pytest | Next.js app, Google sign-in, API client with mock switch, app shell, `/me` shown after sign-in | api: pytest passes; `/me` returns uid + role with a real token; `/llm/ping` returns a Gemini reply. web: sign-in works; shell shows the mock `/me` user |
| 1 Rubric + typed grading | `POST /questions`, rubric extract / edit / confirm, `POST /attempts/grade` (typed), grade twice for confidence | Question create screen, rubric editor, typed answer screen, grading result screen | api: 5 typed answers with known marks all within ±1; no step over its max; every lost mark has a taxonomy error type. web: every mock in `contracts/mocks` renders correctly |
| 2 Photo input | `POST /attempts/transcribe`, legibility flags, validation harness script | Camera / file capture, confirm-and-edit transcription screen | api: photographed answers within ±1 of their typed versions; harness prints MAE and % within ±1. web: capture → confirm → result flow works on a phone |
| 3 Vault + RAG + PYQ lite | Upload + parse + chunk + embed, `POST /explain` with page citations, PYQ split + topic aggregation | Upload screen with status, explanation view with citations, PYQ topics view | api: 5 questions cite the correct page; topic counts match a hand count of one paper. web: citations link to the right page |
| 4 Agents + router + practice | Orchestrator + 5 agents, policy rules with unit tests, Mistake DNA + learner profile, adaptive practice | Ask-a-doubt screen, route screen (reasons + override), practice screen | api: all 6 rules unit-tested; 3 scripted students land on explain / practice / teacher. web: all three routes render with reasons |
| 5 Teacher + KB loop | Matchmaker agent, sessions, Jitsi room, group sessions, KB entries from resolutions | Teacher dashboard with realtime queue, diagnosis card, session page, resolution form | integration: routed doubt appears in the queue within 2 s; a later similar doubt cites that teacher session |
| 6 Analytics | Mark-leak + progress + class aggregation endpoints | Mark-Leak Report, progress trend, faculty class view | every number equals a manual sum over seeded attempts |
| 7 Co-Reader | Page notes generation + cache, PYQ keyword highlight data | Split view (react-pdf), highlights, notes panel, "ask about this" | notes from cache < 1 s; 3 highlights hand-checked; no invented notes on 3 pages |
| 8 Stuck detection | Accept `source: "stuck"` doubts; seed data script + demo personas | Stuck hook (dwell, flip, re-select), nudge card, demo-mode toggle | each signal gives exactly one nudge per page; idle tab gives none |
| 9 Demo prep | Warm the cache, seed 3 students + 2 teachers | Polish, record backup demo video | full demo script runs 3 times in a row, under 3 minutes |

P2 stretch (only after phase 9 passes): voice doubts, flashcards / export, Voice Viva, Predicted Paper.

## Conventions

- Python: type hints, Pydantic models mirroring `contracts/api.md`, routers per area in `api/app/routers/`.
- TypeScript: types in `web/src/lib/types.ts` mirroring `contracts/api.md`; all fetches through `web/src/lib/api.ts`.
- Errors: `{"error": {"code": "...", "message": "..."}}` with a proper HTTP status.
- Keep functions small and testable; no dead code; no placeholder TODO features in shipped screens.
