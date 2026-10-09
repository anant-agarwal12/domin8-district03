# DRAFT API contract — phases 3–9 (not final)

Status: **draft**, written 2026-10-09 for the demo-first UI (DECISIONS.md D-005). Nothing here is binding on `/api` yet.
When a backend phase starts, its section moves into `contracts/api.md` (both people agree first, bump the version, update
`contracts/mocks/`), and the web adjusts if a shape changes. Mocks for every endpoint live in `contracts/draft/mocks/`.

Conventions are the same as `contracts/api.md`: camelCase on the wire, ISO 8601 UTC timestamps, auth via Firebase ID token,
errors as `{ "error": { "code", "message" } }`. Clients branch on `error.code`, never on the message text.

Rules for every shape in this file: only the fields a screen shows; every stored judgement carries its reason next to it.

Shared types:
```ts
type Route = "explain" | "practice" | "teacher";
type ErrorType = "concept" | "formula" | "calculation" | "units" | "notation" | "skipped_step" | "presentation" | "incomplete";
type DnaEntry = { errorType: ErrorType; count: number; marksLost: number; topics: string[] };   // Mistake DNA
type PyqTopic = { topic: string; count: number; years: number[]; sharePct: number };            // share of paper marks
```

**Open question (faculty role):** `contracts/api.md` has `role: "student" | "teacher"`. The demo has a third persona, faculty
(owns rubrics and sees the class view). Proposal: add `"faculty"` to `User.role`. Until agreed, the demo shows faculty as a
`teacher` plus a demo-only persona flag in the web app.

---

## Phase 3 — Vault, explanation, PYQ

### `POST /documents` (multipart)
Fields: `file` (pdf/pptx), `title`, `kind` (`"notes" | "pyq" | "other"`), `course`.
`201` → `Doc` — mock: `draft/mocks/document.json`
```ts
type Doc = { id: string; title: string; kind: "notes" | "pyq" | "other"; pages: number; status: "processing" | "ready" | "failed"; statusReason: string | null };
```
### `GET /documents/{id}` → `Doc` (poll until `ready`). Used by: upload screen.

### `POST /explain`
Body: `{ doubtId: string | null; text: string; topic: string | null }`
`201` → `Explanation` — mocks: `draft/mocks/explanation.json`, `draft/mocks/explanation_kb.json` (cites a teacher session)
```ts
type Citation = { docId: string; docTitle: string; page: number; snippet: string };
type KbCitation = { sessionId: string; teacherName: string; resolvedOn: string; summary: string };   // "Resolved by …, session on …"
type CheckQuestion = { text: string; options: string[] };
type Explanation = {
  id: string; doubtId: string | null;
  answer: string;                 // may contain LaTeX between $...$
  citations: Citation[];          // page chips; each opens Co-Reader at that page
  kbCitations: KbCitation[];      // empty unless an earlier teacher session matched
  checkQuestion: CheckQuestion | null;   // present for concept/formula gaps (policy rule 5)
  reason: string;                 // one line: why this answer was shown
}
```
### `POST /explanations/{id}/check`
Body: `{ choiceIndex: number }` → `200` `{ correct: boolean; why: string }` — mock: `draft/mocks/check_result.json`

### `GET /pyq/topics?course=<course>` → `{ items: PyqTopic[] }` — mock: `draft/mocks/pyq_topics.json`

---

## Phase 4 — Doubts, routing, practice, profile

### `POST /doubts`
Body: `{ source: "manual" | "evaluation" | "stuck"; text: string; attemptId?: string; docId?: string; page?: number; signal?: "dwell" | "flip" | "reselect" }`
`201` → `Doubt` — mocks: `draft/mocks/doubt_teacher.json`, `doubt_explain.json`, `doubt_practice.json`
```ts
type FiredRule = { rule: 1 | 2 | 3 | 4 | 5 | 6; condition: string; route: Route; reason: string; decisive: boolean };
type AgentStep = { agent: "understanding" | "examiner" | "policy" | "orchestrator" | "tutor" | "practice" | "matchmaker"; summary: string; at: string };
type Doubt = {
  id: string; uid: string; studentName: string;          // studentName: first name + initial, shown to teachers
  source: "manual" | "evaluation" | "stuck"; text: string;
  topic: string; errorType: ErrorType | null; attemptId: string | null;
  route: Route; priority: "normal" | "high"; routeReason: string;   // one plain line
  firedRules: FiredRule[];       // every rule that fired; the first match decides (CLAUDE.md policy table)
  agentLog: AgentStep[];         // the "Why?" trace, oldest first
  overriddenFrom: Route | null; overrideReason: string | null;
  status: "open" | "explained" | "practising" | "queued" | "in_session" | "resolved";
  createdAt: string;
}
```
### `GET /doubts/{id}` → `Doubt`
The route screen loads the doubt (route, reasons, trace) with this.

### `POST /doubts/{id}/override`
Body: `{ route: Route; reason: string }` → `Doubt` (the student's override; policy rules still log what they would have chosen).

### `POST /practice` Body `{ doubtId: string }` → `PracticeSet` — mock: `draft/mocks/practice_set.json`
```ts
type PracticeQuestion = { id: string; text: string; options: string[] };
type PracticeSet = { id: string; topic: string; errorType: ErrorType; reason: string; questions: PracticeQuestion[] };   // 3 questions
```
### `POST /practice/{id}/answer` Body `{ questionId: string; choiceIndex: number }`
`200` → `{ correct: boolean; feedback: string; done: number; total: number }` — mock: `draft/mocks/practice_answer.json`

### `GET /profile` → `LearnerProfile` — mock: `draft/mocks/profile.json`
```ts
type LearnerProfile = { uid: string; course: string; examDate: string | null; daysToExam: number | null; mistakeDna: DnaEntry[]; topPyqTopics: PyqTopic[] };
```

---

## Phase 5 — Teacher queue, sessions, knowledge base

### `GET /teacher/queue` (teacher only; the web also listens to Firestore for live arrivals)
`200` → `{ items: QueueItem[]; groupSuggestions: GroupSuggestion[] }` — mock: `draft/mocks/teacher_queue.json`
```ts
type QueueItem = { doubt: Doubt; diagnosis: { summary: string; attemptId: string | null; mistakeDna: DnaEntry[] } };
type GroupSuggestion = { topic: string; errorType: ErrorType; doubtIds: string[]; studentCount: number; reason: string };
```
### `POST /doubts/{id}/accept` Body `{ kind: "live" | "one_to_one" }` → `Session` — mock: `draft/mocks/session.json`
```ts
type Session = { id: string; doubtId: string; kind: "live" | "one_to_one"; roomUrl: string; teacherName: string; status: "scheduled" | "live" | "resolved" };   // roomUrl = Jitsi link, opened in a new tab
```
### `POST /sessions/{id}/resolve` Body `{ summary: string; correction: string }`
`200` → `{ sessionId: string; kbEntryId: string; message: string }` — mock: `draft/mocks/resolution.json` ("Added to knowledge base")

---

## Phase 6 — Analytics

### `GET /analytics/markleak` → `MarkLeak` — mock: `draft/mocks/markleak.json`   (progress trend is part of this response)
```ts
type MarkLeak = {
  totalLost: number; totalMax: number;
  byErrorType: { errorType: ErrorType; marksLost: number }[];
  byTopic: { topic: string; marksLost: number }[];
  trend: { attemptId: string; date: string; total: number; max: number }[];     // oldest first
  topFix: { errorType: ErrorType; topic: string; marksRecoverable: number; advice: string };
};
```
### `GET /analytics/class?course=<course>` (teacher/faculty) → `ClassView` — mock: `draft/mocks/class_view.json`
```ts
type ClassView = { course: string; studentCount: number; topics: string[]; errorTypes: ErrorType[]; cells: number[][];   // cells[topicIndex][errorTypeIndex] = lost-mark count
  topPyqTopics: PyqTopic[] };
```

---

## Phase 7 — Co-Reader

### `GET /pages/{docId}/{page}/notes` → `{ docId: string; page: number; cached: boolean; notes: { id: string; text: string }[] }` — mock: `draft/mocks/page_notes.json`
### `GET /pages/{docId}/{page}/highlights` → `{ items: Highlight[] }` — mock: `draft/mocks/page_highlights.json`
```ts
type Highlight = { id: string; text: string; pyqYears: number[]; reason: string };   // text = the phrase to mark on the page
```

## Phase 8 — Stuck detection
Uses `POST /doubts` with `source: "stuck"` and a `signal` (above). The nudge card text is written by the client from the
doubt's `routeReason`. No extra endpoint.
