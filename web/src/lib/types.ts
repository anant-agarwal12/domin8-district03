// Mirrors contracts/api.md (v0.2). Change only after the contract changes.

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

// ---------------------------------------------------------------------------------------------
// DRAFT: contracts/draft/api.md  (phases 3-9; not final, becomes final phase by phase)
// ---------------------------------------------------------------------------------------------

export type Route = "explain" | "practice" | "teacher";
export type DnaEntry = { errorType: ErrorType; count: number; marksLost: number; topics: string[] };
export type PyqTopic = { topic: string; count: number; years: number[]; sharePct: number };

// Phase 3
export type DocKind = "notes" | "pyq" | "other";
export type Doc = {
  id: string;
  title: string;
  kind: DocKind;
  pages: number;
  status: "processing" | "ready" | "failed";
  statusReason: string | null;
};
export type Citation = { docId: string; docTitle: string; page: number; snippet: string };
export type KbCitation = { sessionId: string; teacherName: string; resolvedOn: string; summary: string };
export type CheckQuestion = { text: string; options: string[] };
export type Explanation = {
  id: string;
  doubtId: string | null;
  answer: string; // may contain LaTeX between $...$
  citations: Citation[];
  kbCitations: KbCitation[];
  checkQuestion: CheckQuestion | null;
  reason: string;
};
export type ExplainRequest = { doubtId: string | null; text: string; topic: string | null };
export type CheckResult = { correct: boolean; why: string };

// Phase 4
export type DoubtSource = "manual" | "evaluation" | "stuck";
export type FiredRule = { rule: 1 | 2 | 3 | 4 | 5 | 6; condition: string; route: Route; reason: string; decisive: boolean };
export type AgentName = "understanding" | "examiner" | "policy" | "orchestrator" | "tutor" | "practice" | "matchmaker";
export type AgentStep = { agent: AgentName; summary: string; at: string };
export type DoubtStatus = "open" | "explained" | "practising" | "queued" | "in_session" | "resolved";
export type Doubt = {
  id: string;
  uid: string;
  studentName: string;
  source: DoubtSource;
  text: string;
  topic: string;
  errorType: ErrorType | null;
  attemptId: string | null;
  route: Route;
  priority: "normal" | "high";
  routeReason: string;
  firedRules: FiredRule[];
  agentLog: AgentStep[];
  overriddenFrom: Route | null;
  overrideReason: string | null;
  status: DoubtStatus;
  createdAt: string;
};
export type NewDoubt = {
  source: DoubtSource;
  text: string;
  attemptId?: string;
  docId?: string;
  page?: number;
  signal?: "dwell" | "flip" | "reselect";
};
export type PracticeQuestion = { id: string; text: string; options: string[] };
export type PracticeSet = { id: string; topic: string; errorType: ErrorType; reason: string; questions: PracticeQuestion[] };
export type PracticeAnswer = { correct: boolean; feedback: string; done: number; total: number };
export type LearnerProfile = {
  uid: string;
  course: string;
  examDate: string | null;
  daysToExam: number | null;
  mistakeDna: DnaEntry[];
  topPyqTopics: PyqTopic[];
};

// Phase 5
export type QueueItem = { doubt: Doubt; diagnosis: { summary: string; attemptId: string | null; mistakeDna: DnaEntry[] } };
export type GroupSuggestion = { topic: string; errorType: ErrorType; doubtIds: string[]; studentCount: number; reason: string };
export type TeacherQueue = { items: QueueItem[]; groupSuggestions: GroupSuggestion[] };
export type Session = {
  id: string;
  doubtId: string;
  kind: "live" | "one_to_one";
  roomUrl: string;
  teacherName: string;
  status: "scheduled" | "live" | "resolved";
};
export type Resolution = { sessionId: string; kbEntryId: string; message: string };

// Phase 6
export type MarkLeak = {
  totalLost: number;
  totalMax: number;
  byErrorType: { errorType: ErrorType; marksLost: number }[];
  byTopic: { topic: string; marksLost: number }[];
  trend: { attemptId: string; date: string; total: number; max: number }[];
  topFix: { errorType: ErrorType; topic: string; marksRecoverable: number; advice: string };
};
export type ClassView = {
  course: string;
  studentCount: number;
  topics: string[];
  errorTypes: ErrorType[];
  cells: number[][]; // cells[topicIndex][errorTypeIndex]
  topPyqTopics: PyqTopic[];
};

// Phase 7
export type PageNotes = { docId: string; page: number; cached: boolean; notes: { id: string; text: string }[] };
export type Highlight = { id: string; text: string; pyqYears: number[]; reason: string };
