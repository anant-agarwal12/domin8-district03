# API contract — v0.1 (phases 0–2 final; later phases sketched)

Base URL: `NEXT_PUBLIC_API_URL` (dev: `http://localhost:8000`). All bodies are JSON unless marked multipart.
Field names are camelCase on the wire. Timestamps are ISO 8601 strings in UTC.

Changing anything here: both people agree first, bump the version line above, update `contracts/mocks/` in the same commit.

## Auth

Every request except `GET /health` sends `Authorization: Bearer <Firebase ID token>`.
The API verifies it with firebase-admin. Missing or bad token → `401`.

Dev only: if the API's `.env` has `AUTH_DISABLED=true`, it accepts `X-Dev-Uid: <uid>` instead (for curl and tests).
This must be `false` for the demo.

Roles live in Firestore `users/{uid}.role` (`"student"` | `"teacher"`). A new user is created as `"student"` on the first `/me`.
Teachers are set by hand in the Firestore console for the demo.

## Errors

```json
{ "error": { "code": "not_found", "message": "Rubric r_123 does not exist" } }
```
Codes: `unauthorized` 401, `forbidden` 403, `not_found` 404, `invalid_input` 422, `llm_failed` 502, `internal` 500.

---

## Phase 0

### `GET /health` (no auth)
`200` → `{ "ok": true }`

### `GET /me`
`200` → `User` — mock: `mocks/me.json`
```ts
type User = {
  uid: string;
  name: string;
  role: "student" | "teacher";
  course: string | null;
  examDate: string | null;   // "YYYY-MM-DD"
}
```

### `GET /llm/ping`
`200` → `{ "model": string, "reply": string, "cached": boolean }`

---

## Phase 1

### `POST /questions`
Body:
```ts
{ course: string; topic: string; text: string; marks: number; source: "sample" | "pyq" | "generated"; year: number | null }
```
`201` → `Question` — mock: `mocks/question.json`
```ts
type Question = {
  id: string; course: string; topic: string; text: string; marks: number;
  source: "sample" | "pyq" | "generated"; year: number | null; rubricId: string | null;
}
```

### `GET /questions/{id}` → `Question`
### `GET /questions?course=<course>` → `{ "items": Question[] }`

### `POST /rubrics/extract`
Turns a marking scheme or a solved sample into rubric steps. Saved as `"proposed"`.
Body:
```ts
{ questionId: string; kind: "scheme" | "sample"; content: string }   // content = scheme or solved answer as text
```
`201` → `Rubric` — mock: `mocks/rubric_proposed.json`
```ts
type StepType = "setup" | "formula" | "method" | "calculation" | "final_answer" | "presentation";
type RubricStep = { id: string; description: string; marks: number; type: StepType; expected: string };
type Rubric = {
  id: string; questionId: string;
  status: "proposed" | "confirmed";
  steps: RubricStep[];
  maxMarks: number;          // sum of step marks, computed by the API
  editedBy: string | null;   // uid of last editor
  updatedAt: string;
}
```

### `PUT /rubrics/{id}`
Body: `{ steps: RubricStep[] }` (step ids kept; new steps may omit `id`). Sets status back to `"proposed"`.
`200` → `Rubric`

### `POST /rubrics/{id}/confirm`
`200` → `Rubric` with `status: "confirmed"` — mock: `mocks/rubric_confirmed.json`

### `GET /rubrics/{id}` → `Rubric`

### `POST /attempts/grade`
Grades an answer against a confirmed rubric. Grades twice; confidence is `"low"` if totals differ by more than 1 mark
or any line is illegible. `422` if the rubric is not confirmed.
Body:
```ts
{ questionId: string; rubricId: string; inputType: "typed" | "photo"; lines: AnswerLine[]; imageId?: string }
type AnswerLine = { n: number; text: string; legible?: boolean }   // text may contain LaTeX between $...$
```
`201` → `Attempt` — mocks: `mocks/attempt_graded.json`, `mocks/attempt_low_confidence.json`
```ts
type ErrorType = "concept" | "formula" | "calculation" | "units" | "notation" | "skipped_step" | "presentation" | "incomplete";
type StepResult = {
  stepId: string;
  awarded: number;            // 0..max
  max: number;
  matchedLines: number[];     // AnswerLine.n values used as evidence
  reason: string;             // one sentence
  errorType: ErrorType | null;  // null when awarded == max
  fix: string | null;         // one sentence, null when awarded == max
}
type Attempt = {
  id: string; uid: string; questionId: string; rubricId: string;
  inputType: "typed" | "photo"; imageId: string | null;
  lines: AnswerLine[];
  stepResults: StepResult[];
  total: number;              // summed in Python
  max: number;
  confidence: "high" | "low";
  confidenceReason: string | null;
  gradedAt: string;
}
```

### `GET /attempts/{id}` → `Attempt`
### `GET /attempts?uid=<uid>` → `{ "items": Attempt[] }` (newest first; a student may only read their own)

---

## Phase 2

### `POST /attempts/transcribe` (multipart)
Form fields: `image` (jpg/png/webp, ≤ 10 MB), `questionId`.
`201` → `{ "imageId": string, "lines": AnswerLine[] }` — mock: `mocks/transcription.json`
Every line has `legible` set. The student edits lines, then calls `POST /attempts/grade` with `inputType: "photo"` and the `imageId`.

### `GET /images/{imageId}` → the image bytes (owner or teacher only)

---

## Later phases — sketch only, finalized at the start of each phase

- Phase 3: `POST /documents` (multipart upload), `GET /documents/{id}` (status), `POST /explain` → answer + `citations: {docId, page}[]`, `GET /pyq/topics?course=`.
- Phase 4: `POST /doubts` (source: manual | evaluation | stuck) → `Doubt` with `route`, `reasons[]`, `agentLog[]`; `POST /doubts/{id}/override`; `POST /practice/next`, `POST /practice/{id}/answer`; `GET /profile`.
- Phase 5: `GET /teacher/queue` (web also listens to Firestore directly), `POST /doubts/{id}/accept`, `POST /sessions/{id}/resolve`, group sessions.
- Phase 6: `GET /analytics/markleak`, `GET /analytics/progress`, `GET /analytics/class?course=`.
- Phase 7: `GET /pages/{docId}/{page}/notes`, `GET /pages/{docId}/{page}/highlights`.
