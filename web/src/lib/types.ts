// Mirrors contracts/api.md (v0.1). Change only after the contract changes.

export type Role = "student" | "teacher";

export type User = {
  uid: string;
  name: string;
  role: Role;
  course: string | null;
  examDate: string | null; // "YYYY-MM-DD"
};

export type LlmPing = { model: string; reply: string; cached: boolean };

export type QuestionSource = "sample" | "pyq" | "generated";

export type NewQuestion = {
  course: string;
  topic: string;
  text: string;
  marks: number;
  source: QuestionSource;
  year: number | null;
};

export type Question = {
  id: string;
  course: string;
  topic: string;
  text: string;
  marks: number;
  source: QuestionSource;
  year: number | null;
  rubricId: string | null;
};

export type StepType =
  | "setup"
  | "formula"
  | "method"
  | "calculation"
  | "final_answer"
  | "presentation";

export type RubricStep = {
  id: string;
  description: string;
  marks: number;
  type: StepType;
  expected: string;
};

// PUT /rubrics/{id}: step ids kept; new steps may omit `id`.
export type RubricStepInput = Omit<RubricStep, "id"> & { id?: string };

export type Rubric = {
  id: string;
  questionId: string;
  status: "proposed" | "confirmed";
  steps: RubricStep[];
  maxMarks: number; // sum of step marks, computed by the API
  editedBy: string | null; // uid of last editor
  updatedAt: string;
};

export type RubricExtractRequest = {
  questionId: string;
  kind: "scheme" | "sample";
  content: string;
};

// text may contain LaTeX between $...$
export type AnswerLine = { n: number; text: string; legible?: boolean };

export type GradeRequest = {
  questionId: string;
  rubricId: string;
  inputType: "typed" | "photo";
  lines: AnswerLine[];
  imageId?: string;
};

export type ErrorType =
  | "concept"
  | "formula"
  | "calculation"
  | "units"
  | "notation"
  | "skipped_step"
  | "presentation"
  | "incomplete";

export type StepResult = {
  stepId: string;
  awarded: number; // 0..max
  max: number;
  matchedLines: number[]; // AnswerLine.n values used as evidence
  reason: string; // one sentence
  errorType: ErrorType | null; // null when awarded == max
  fix: string | null; // one sentence, null when awarded == max
};

export type Attempt = {
  id: string;
  uid: string;
  questionId: string;
  rubricId: string;
  inputType: "typed" | "photo";
  imageId: string | null;
  lines: AnswerLine[];
  stepResults: StepResult[];
  total: number; // summed in Python
  max: number;
  confidence: "high" | "low";
  confidenceReason: string | null;
  gradedAt: string;
};

export type Transcription = { imageId: string; lines: AnswerLine[] };

export type ErrorCode =
  | "unauthorized"
  | "forbidden"
  | "not_found"
  | "invalid_input"
  | "validation_error"
  | "llm_failed"
  | "internal";

export type ApiErrorBody = { error: { code: ErrorCode; message: string } };
