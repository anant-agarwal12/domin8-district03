import { auth } from "./firebase";
import type {
  ApiErrorBody,
  Attempt,
  ErrorCode,
  GradeRequest,
  LlmPing,
  NewQuestion,
  Question,
  Rubric,
  RubricExtractRequest,
  RubricStepInput,
  Transcription,
  User,
} from "./types";
import attemptGraded from "@/mocks/attempt_graded.json";
import attemptLow from "@/mocks/attempt_low_confidence.json";
import me from "@/mocks/me.json";
import question from "@/mocks/question.json";
import rubricConfirmed from "@/mocks/rubric_confirmed.json";
import rubricProposed from "@/mocks/rubric_proposed.json";
import errorValidation from "@/mocks/error_validation.json";
import transcription from "@/mocks/transcription.json";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";
const MOCK_DELAY_MS = 350;

// "network" is client-side only: the API could not be reached.
export type ClientErrorCode = ErrorCode | "network";

export class ApiError extends Error {
  constructor(
    public code: ClientErrorCode,
    message: string,
    public status: number = 0,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function isErrorBody(v: unknown): v is ApiErrorBody {
  const e = (v as ApiErrorBody | null)?.error;
  return typeof e?.code === "string" && typeof e?.message === "string";
}

async function mock<T>(value: unknown): Promise<T> {
  await new Promise((r) => setTimeout(r, MOCK_DELAY_MS));
  return structuredClone(value) as T;
}

async function authHeader(): Promise<Record<string, string>> {
  const user = auth?.currentUser;
  if (!user) throw new ApiError("unauthorized", "You are signed out. Please sign in again.", 401);
  return { Authorization: `Bearer ${await user.getIdToken()}` };
}

async function send(
  method: string,
  path: string,
  body?: unknown,
  withAuth = true,
): Promise<Response> {
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

// Mock mode only: remembers the last saved rubric so edits survive Save / Confirm.
const mockRubrics = new Map<string, Rubric>();

function mockRubric(
  id: string,
  steps: RubricStepInput[],
  status: Rubric["status"],
  questionId = rubricProposed.questionId,
): Rubric {
  const total = steps.reduce((t, s) => t + s.marks, 0);
  // Mock mode mirrors the API's rule: step marks must equal the question's marks.
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

const q = (params: Record<string, string>) => `?${new URLSearchParams(params)}`;

export const api = {
  // Phase 0
  health: (): Promise<{ ok: true }> =>
    USE_MOCKS ? mock({ ok: true }) : json("GET", "/health", undefined, false),
  getMe: (): Promise<User> => (USE_MOCKS ? mock(me) : json("GET", "/me")),
  llmPing: (): Promise<LlmPing> =>
    USE_MOCKS
      ? mock({ model: "mock-model", reply: "pong", cached: true })
      : json("GET", "/llm/ping"),

  // Phase 1
  createQuestion: (body: NewQuestion): Promise<Question> =>
    USE_MOCKS ? mock({ ...question, ...body }) : json("POST", "/questions", body),
  getQuestion: (id: string): Promise<Question> =>
    USE_MOCKS ? mock({ ...question, id }) : json("GET", `/questions/${encodeURIComponent(id)}`),
  listQuestions: (course: string): Promise<{ items: Question[] }> =>
    USE_MOCKS ? mock({ items: [question] }) : json("GET", `/questions${q({ course })}`),
  extractRubric: (body: RubricExtractRequest): Promise<Rubric> =>
    USE_MOCKS ? mock(mockRubric(rubricProposed.id, (rubricProposed as Rubric).steps, "proposed", body.questionId)) : json("POST", "/rubrics/extract", body),
  updateRubric: (id: string, steps: RubricStepInput[]): Promise<Rubric> =>
    USE_MOCKS ? mock(mockRubric(id, steps, "proposed")) : json("PUT", `/rubrics/${encodeURIComponent(id)}`, { steps }),
  confirmRubric: (id: string): Promise<Rubric> =>
    USE_MOCKS
      ? mock({ ...(mockRubrics.get(id) ?? rubricConfirmed), id, status: "confirmed" })
      : json("POST", `/rubrics/${encodeURIComponent(id)}/confirm`),
  getRubric: (id: string): Promise<Rubric> =>
    USE_MOCKS ? mock({ ...(mockRubrics.get(id) ?? rubricProposed), id }) : json("GET", `/rubrics/${encodeURIComponent(id)}`),
  gradeAttempt: (body: GradeRequest): Promise<Attempt> =>
    USE_MOCKS
      ? mock(body.inputType === "photo" ? attemptLow : attemptGraded)
      : json("POST", "/attempts/grade", body),
  getAttempt: (id: string): Promise<Attempt> =>
    USE_MOCKS ? mock(id === attemptLow.id ? attemptLow : { ...attemptGraded, id }) : json("GET", `/attempts/${encodeURIComponent(id)}`),
  listAttempts: (uid: string): Promise<{ items: Attempt[] }> =>
    USE_MOCKS ? mock({ items: [attemptLow, attemptGraded] }) : json("GET", `/attempts${q({ uid })}`),

  // Phase 2
  transcribe: (image: File, questionId: string): Promise<Transcription> => {
    if (USE_MOCKS) return mock(transcription);
    const form = new FormData();
    form.append("image", image);
    form.append("questionId", questionId);
    return json("POST", "/attempts/transcribe", form);
  },
  getImage: async (imageId: string): Promise<Blob> => {
    if (USE_MOCKS) throw new ApiError("not_found", "Images are not available in mock mode.", 404);
    return (await send("GET", `/images/${encodeURIComponent(imageId)}`)).blob();
  },
};

