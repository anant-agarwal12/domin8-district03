// The only place screens get data from. Every function has a real path (the endpoint at NEXT_PUBLIC_API_URL)
// and a mock path (NEXT_PUBLIC_USE_MOCKS=true). Phase 0-2 follow contracts/api.md; Phase 3-9 follow contracts/draft/api.md.
import { ApiError } from "./apiError";
import { API_URL, DEMO_MODE, MOCK_DELAY_MS, USE_MOCKS } from "./config";
import { DEMO_PAGE_HIGHLIGHTS, DEMO_PAGE_NOTES, DemoStore } from "./demoData";
import { demoFlags, demoUser, getPersona } from "./demo";
import { auth } from "./firebase";
import type {
  ApiErrorBody,
  Attempt,
  CheckResult,
  ClassView,
  Doc,
  DocKind,
  Doubt,
  ErrorCode,
  ExplainRequest,
  Explanation,
  GradeRequest,
  Highlight,
  LearnerProfile,
  LlmPing,
  MarkLeak,
  NewDoubt,
  NewQuestion,
  PageNotes,
  PracticeAnswer,
  PracticeSet,
  PyqTopic,
  Question,
  Resolution,
  Route,
  Rubric,
  RubricExtractRequest,
  RubricStepInput,
  Session,
  TeacherQueue,
  Transcription,
  User,
} from "./types";
import attemptGraded from "@/mocks/attempt_graded.json";
import attemptLow from "@/mocks/attempt_low_confidence.json";
import errorValidation from "@/mocks/error_validation.json";
import me from "@/mocks/me.json";
import question from "@/mocks/question.json";
import rubricConfirmed from "@/mocks/rubric_confirmed.json";
import rubricProposed from "@/mocks/rubric_proposed.json";
import transcription from "@/mocks/transcription.json";
import checkResult from "@/mocks/draft/check_result.json";
import classView from "@/mocks/draft/class_view.json";
import document from "@/mocks/draft/document.json";
import doubtExplain from "@/mocks/draft/doubt_explain.json";
import doubtPractice from "@/mocks/draft/doubt_practice.json";
import doubtTeacher from "@/mocks/draft/doubt_teacher.json";
import explanation from "@/mocks/draft/explanation.json";
import explanationKb from "@/mocks/draft/explanation_kb.json";
import markleak from "@/mocks/draft/markleak.json";
import pageHighlights from "@/mocks/draft/page_highlights.json";
import pageNotes from "@/mocks/draft/page_notes.json";
import practiceAnswer from "@/mocks/draft/practice_answer.json";
import practiceSet from "@/mocks/draft/practice_set.json";
import profile from "@/mocks/draft/profile.json";
import pyqTopics from "@/mocks/draft/pyq_topics.json";
import resolution from "@/mocks/draft/resolution.json";
import session from "@/mocks/draft/session.json";
import teacherQueue from "@/mocks/draft/teacher_queue.json";

export { ApiError } from "./apiError";
export type { ClientErrorCode } from "./apiError";

function isErrorBody(v: unknown): v is ApiErrorBody {
  const e = (v as ApiErrorBody | null)?.error;
  return typeof e?.code === "string" && typeof e?.message === "string";
}

// Mock mode: wait a little (so loading states are real), then run `produce`. Errors it throws become rejections.
async function mock<T>(produce: () => unknown): Promise<T> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  return structuredClone(produce()) as T;
}

async function authHeader(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) throw new ApiError("unauthorized", "You are signed out. Please sign in again.", 401);
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

async function send(method: string, path: string, body?: unknown, withAuth = true): Promise<Response> {
  const headers: Record<string, string> = withAuth ? await authHeader() : {};
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: payload });
  } catch {
    throw new ApiError(
      "network",
      `Can't reach the server at ${API_URL}. Check that the API is running, or switch to mock data.`,
    );
  }
  if (res.ok) return res;

  const data: unknown = await res.json().catch(() => null);
  if (isErrorBody(data)) throw new ApiError(data.error.code, data.error.message, res.status);
  throw new ApiError("internal", `The server returned an unexpected response (${res.status}).`, res.status);
}

async function json<T>(method: string, path: string, body?: unknown, withAuth = true): Promise<T> {
  return (await send(method, path, body, withAuth)).json() as Promise<T>;
}

const enc = encodeURIComponent;
const q = (params: Record<string, string>) => `?${new URLSearchParams(params)}`;

// ---- Mock state --------------------------------------------------------------------------------
// Demo mode keeps a small in-memory world (Priya's history). Plain mock mode serves contracts/mocks.
const demo = new DemoStore();
const mockRubrics = new Map<string, Rubric>();
const mockDoubts = new Map<string, Doubt>();
let mockSeq = 0;
const mockId = (prefix: string) => `${prefix}_mock_${++mockSeq}`;

// The three story doubts exist from the start, so the presenter can open any route screen directly.
function seedDoubts() {
  for (const d of [doubtTeacher, doubtExplain, doubtPractice]) mockDoubts.set(d.id, structuredClone(d) as Doubt);
}
seedDoubts();

// Restores the starting story (Presenter mode "Reset").
export function resetMockState() {
  demo.reset();
  mockRubrics.clear();
  mockDoubts.clear();
  mockSeq = 0;
  demoFlags.kbResolved = false;
  seedDoubts();
}

// Mock mode mirrors the API's rule: step marks must equal the question's marks (error code validation_error).
function contractMockRubric(
  id: string,
  steps: RubricStepInput[],
  status: Rubric["status"],
  questionId = rubricProposed.questionId,
): Rubric {
  const total = steps.reduce((t, s) => t + s.marks, 0);
  if (total !== question.marks) {
    throw new ApiError(
      errorValidation.error.code as ErrorCode,
      `Rubric steps add up to ${total} marks but question ${question.id} is worth ${question.marks} marks`,
      422,
    );
  }
  const full = steps.map((s, i) => ({ ...s, id: s.id ?? `s${Date.now()}_${i}` }));
  const rubric: Rubric = {
    ...(rubricProposed as Rubric),
    id,
    questionId,
    status,
    steps: full,
    maxMarks: full.reduce((t, s) => t + s.marks, 0),
  };
  mockRubrics.set(id, rubric);
  return rubric;
}

// Mock doubt routing: a stand-in for the orchestrator and the six policy rules (those run in /api).
function isLowConfidence(attemptId?: string): boolean {
  if (!attemptId) return false;
  try {
    return (DEMO_MODE ? demo.attempt(attemptId) : attemptId === attemptLow.id ? attemptLow : attemptGraded).confidence === "low";
  } catch {
    return false;
  }
}

function mockDoubtFor(body: NewDoubt): Doubt {
  const lowConfidence = body.source === "evaluation" && isLowConfidence(body.attemptId);
  const base = (body.source === "manual" || body.source === "stuck" ? doubtExplain : lowConfidence ? doubtTeacher : doubtPractice) as Doubt;
  const route: Route = base.route;
  return {
    ...structuredClone(base),
    id: mockId("db"),
    source: body.source,
    text: body.text,
    attemptId: body.attemptId ?? base.attemptId,
    route,
    createdAt: new Date().toISOString(),
  };
}

const personaUser = (): User => {
  const persona = getPersona();
  if (!persona) throw new ApiError("unauthorized", "Pick a demo persona first.", 401);
  return demoUser(persona);
};

export const api = {
  // ---- Phase 0 ----
  health: (): Promise<{ ok: true }> =>
    USE_MOCKS ? mock(() => ({ ok: true })) : json("GET", "/health", undefined, false),
  getMe: (): Promise<User> => (USE_MOCKS ? mock(() => (DEMO_MODE ? personaUser() : me)) : json("GET", "/me")),
  llmPing: (): Promise<LlmPing> =>
    USE_MOCKS ? mock(() => ({ model: "mock-model", reply: "pong", cached: true })) : json("GET", "/llm/ping"),

  // ---- Phase 1 ----
  createQuestion: (body: NewQuestion): Promise<Question> =>
    USE_MOCKS
      ? mock(() => (DEMO_MODE ? demo.createQuestion(body) : { ...question, ...body }))
      : json("POST", "/questions", body),
  getQuestion: (id: string): Promise<Question> =>
    USE_MOCKS
      ? mock(() => (DEMO_MODE ? demo.question(id) : { ...question, id }))
      : json("GET", `/questions/${enc(id)}`),
  listQuestions: (course: string): Promise<{ items: Question[] }> =>
    USE_MOCKS
      ? mock(() => ({ items: DEMO_MODE ? demo.listQuestions(course) : [question] }))
      : json("GET", `/questions${q({ course })}`),
  extractRubric: (body: RubricExtractRequest): Promise<Rubric> =>
    USE_MOCKS
      ? mock(() =>
          DEMO_MODE
            ? demo.extractRubric(body.questionId)
            : contractMockRubric(rubricProposed.id, (rubricProposed as Rubric).steps, "proposed", body.questionId),
        )
      : json("POST", "/rubrics/extract", body),
  updateRubric: (id: string, steps: RubricStepInput[]): Promise<Rubric> =>
    USE_MOCKS
      ? mock(() => (DEMO_MODE ? demo.updateRubric(id, steps, personaUser().uid) : contractMockRubric(id, steps, "proposed")))
      : json("PUT", `/rubrics/${enc(id)}`, { steps }),
  confirmRubric: (id: string): Promise<Rubric> =>
    USE_MOCKS
      ? mock(() =>
          DEMO_MODE
            ? demo.confirmRubric(id, personaUser().uid)
            : { ...(mockRubrics.get(id) ?? rubricConfirmed), id, status: "confirmed" },
        )
      : json("POST", `/rubrics/${enc(id)}/confirm`),
  getRubric: (id: string): Promise<Rubric> =>
    USE_MOCKS
      ? mock(() => (DEMO_MODE ? demo.rubric(id) : { ...(mockRubrics.get(id) ?? rubricProposed), id }))
      : json("GET", `/rubrics/${enc(id)}`),
  gradeAttempt: (body: GradeRequest): Promise<Attempt> =>
    USE_MOCKS
      ? mock(() => (DEMO_MODE ? demo.grade(body) : body.inputType === "photo" ? attemptLow : attemptGraded))
      : json("POST", "/attempts/grade", body),
  getAttempt: (id: string): Promise<Attempt> =>
    USE_MOCKS
      ? mock(() => (DEMO_MODE ? demo.attempt(id) : id === attemptLow.id ? attemptLow : { ...attemptGraded, id }))
      : json("GET", `/attempts/${enc(id)}`),
  listAttempts: (uid: string): Promise<{ items: Attempt[] }> =>
    USE_MOCKS
      ? mock(() => ({ items: DEMO_MODE ? demo.listAttempts() : [attemptLow, attemptGraded] }))
      : json("GET", `/attempts${q({ uid })}`),

  // ---- Phase 2 ----
  transcribe: (image: File, questionId: string): Promise<Transcription> => {
    if (USE_MOCKS) return mock(() => transcription);
    const form = new FormData();
    form.append("image", image);
    form.append("questionId", questionId);
    return json("POST", "/attempts/transcribe", form);
  },
  getImage: async (imageId: string): Promise<Blob> => {
    if (USE_MOCKS) throw new ApiError("not_found", "Images are not available in mock mode.", 404);
    return (await send("GET", `/images/${enc(imageId)}`)).blob();
  },

  // ---- DRAFT (contracts/draft/api.md): phases 3-9 ----
  // Phase 3
  uploadDocument: (file: File, title: string, kind: DocKind, course: string): Promise<Doc> => {
    if (USE_MOCKS) return mock(() => ({ ...document, title }));
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    form.append("kind", kind);
    form.append("course", course);
    return json("POST", "/documents", form);
  },
  getDocument: (id: string): Promise<Doc> =>
    USE_MOCKS ? mock(() => ({ ...document, id })) : json("GET", `/documents/${enc(id)}`),
  explain: (body: ExplainRequest): Promise<Explanation> =>
    USE_MOCKS
      ? mock(() => {
          // A similar doubt cites the teacher's session once one has been resolved (the knowledge-base loop).
          const similar = /work|cos|formula/i.test(body.text);
          return similar && (!DEMO_MODE || demoFlags.kbResolved) ? explanationKb : explanation;
        })
      : json("POST", "/explain", body),
  checkExplanation: (id: string, choiceIndex: number): Promise<CheckResult> =>
    USE_MOCKS
      ? mock(() => (choiceIndex === 1 ? checkResult : { correct: false, why: "Try again: downward acceleration lowers the normal force." }))
      : json("POST", `/explanations/${enc(id)}/check`, { choiceIndex }),
  pyqTopics: (course: string): Promise<{ items: PyqTopic[] }> =>
    USE_MOCKS ? mock(() => pyqTopics) : json("GET", `/pyq/topics${q({ course })}`),

  // Phase 4
  createDoubt: (body: NewDoubt): Promise<Doubt> =>
    USE_MOCKS
      ? mock(() => {
          const d = mockDoubtFor(body);
          mockDoubts.set(d.id, d);
          return d;
        })
      : json("POST", "/doubts", body),
  getDoubt: (id: string): Promise<Doubt> =>
    USE_MOCKS
      ? mock(() => {
          const d = mockDoubts.get(id);
          if (!d) throw new ApiError("not_found", `Doubt ${id} does not exist`, 404);
          return d;
        })
      : json("GET", `/doubts/${enc(id)}`),
  overrideDoubt: (id: string, route: Route, reason: string): Promise<Doubt> =>
    USE_MOCKS
      ? mock(() => {
          const d = mockDoubts.get(id);
          if (!d) throw new ApiError("not_found", `Doubt ${id} does not exist`, 404);
          const next: Doubt = { ...d, overriddenFrom: d.overriddenFrom ?? d.route, overrideReason: reason, route };
          mockDoubts.set(id, next);
          return next;
        })
      : json("POST", `/doubts/${enc(id)}/override`, { route, reason }),
  startPractice: (doubtId: string): Promise<PracticeSet> =>
    USE_MOCKS ? mock(() => practiceSet) : json("POST", "/practice", { doubtId }),
  answerPractice: (setId: string, questionId: string, choiceIndex: number): Promise<PracticeAnswer> =>
    USE_MOCKS
      ? mock(() => {
          const index = practiceSet.questions.findIndex((x) => x.id === questionId);
          const correct = choiceIndex === [1, 0, 1][index];
          return {
            correct,
            feedback: correct ? practiceAnswer.feedback : "Not quite. Check the unit: it is part of the answer.",
            done: index + 1,
            total: practiceSet.questions.length,
          };
        })
      : json("POST", `/practice/${enc(setId)}/answer`, { questionId, choiceIndex }),
  getProfile: (): Promise<LearnerProfile> =>
    USE_MOCKS
      ? mock(() => {
          if (!DEMO_MODE) return profile;
          const user = personaUser();
          const days = user.examDate
            ? Math.ceil((new Date(user.examDate).getTime() - Date.now()) / 86_400_000)
            : null;
          return { ...profile, uid: user.uid, examDate: user.examDate, daysToExam: days, mistakeDna: demo.dna() };
        })
      : json("GET", "/profile"),

  // Phase 5
  teacherQueue: (): Promise<TeacherQueue> =>
    USE_MOCKS ? mock(() => teacherQueue) : json("GET", "/teacher/queue"),
  // Live queue. Mock: two doubts are waiting, and the story's doubt arrives a few seconds later.
  // Real (until Phase 5 adds the Firestore listener): one GET. Returns an unsubscribe function.
  watchTeacherQueue: (onQueue: (q: TeacherQueue) => void, onError: (e: unknown) => void): (() => void) => {
    let alive = true;
    if (USE_MOCKS) {
      const full = structuredClone(teacherQueue) as TeacherQueue;
      const waiting: TeacherQueue = {
        items: full.items.filter((i) => i.doubt.id !== "db_demo_1"),
        groupSuggestions: [],
      };
      const first = setTimeout(() => alive && onQueue(waiting), MOCK_DELAY_MS);
      const arrival = setTimeout(() => alive && onQueue(full), MOCK_DELAY_MS + 4000);
      return () => {
        alive = false;
        clearTimeout(first);
        clearTimeout(arrival);
      };
    }
    json<TeacherQueue>("GET", "/teacher/queue").then(
      (q) => alive && onQueue(q),
      (e) => alive && onError(e),
    );
    return () => {
      alive = false;
    };
  },
  acceptDoubt: (id: string, kind: "live" | "one_to_one"): Promise<Session> =>
    USE_MOCKS ? mock(() => ({ ...session, doubtId: id, kind })) : json("POST", `/doubts/${enc(id)}/accept`, { kind }),
  resolveSession: (id: string, summary: string, correction: string): Promise<Resolution> =>
    USE_MOCKS
      ? mock(() => {
          demoFlags.kbResolved = true;
          return { ...resolution, sessionId: id };
        })
      : json("POST", `/sessions/${enc(id)}/resolve`, { summary, correction }),

  // Phase 6
  markLeak: (): Promise<MarkLeak> =>
    USE_MOCKS ? mock(() => (DEMO_MODE ? demo.markLeak() : markleak)) : json("GET", "/analytics/markleak"),
  classView: (course: string): Promise<ClassView> =>
    USE_MOCKS ? mock(() => classView) : json("GET", `/analytics/class${q({ course })}`),

  // Phase 7
  pageNotes: (docId: string, page: number): Promise<PageNotes> =>
    USE_MOCKS
      ? mock(() => ({ ...pageNotes, docId, page, notes: DEMO_MODE ? (DEMO_PAGE_NOTES[page] ?? []) : pageNotes.notes }))
      : json("GET", `/pages/${enc(docId)}/${page}/notes`),
  pageHighlights: (docId: string, page: number): Promise<{ items: Highlight[] }> =>
    USE_MOCKS
      ? mock(() => (DEMO_MODE ? { items: DEMO_PAGE_HIGHLIGHTS[page] ?? [] } : pageHighlights))
      : json("GET", `/pages/${enc(docId)}/${page}/highlights`),
};
