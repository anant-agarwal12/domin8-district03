import type { AgentName, ErrorType, Route, StepType } from "./types";

export const STEP_TYPES: StepType[] = [
  "setup",
  "formula",
  "method",
  "calculation",
  "final_answer",
  "presentation",
];

export const STEP_TYPE_LABEL: Record<StepType, string> = {
  setup: "Setup",
  formula: "Formula",
  method: "Method",
  calculation: "Calculation",
  final_answer: "Final answer",
  presentation: "Presentation",
};

export const ERROR_LABEL: Record<ErrorType, string> = {
  concept: "Concept gap",
  formula: "Formula",
  calculation: "Calculation slip",
  units: "Units",
  notation: "Notation",
  skipped_step: "Skipped step",
  presentation: "Presentation",
  incomplete: "Incomplete",
};

export const msg = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export const AGENT_LABEL: Record<AgentName, string> = {
  understanding: "Understanding",
  examiner: "Examiner",
  policy: "Policy check",
  orchestrator: "Decision",
  tutor: "Tutor",
  practice: "Practice",
  matchmaker: "Matchmaker",
};

export const ROUTE_LABEL: Record<Route, string> = {
  explain: "Explanation",
  practice: "Practice",
  teacher: "Teacher",
};

export const ROUTE_SENTENCE: Record<Route, string> = {
  explain: "An explanation first.",
  practice: "Practice first.",
  teacher: "A teacher will take this.",
};
