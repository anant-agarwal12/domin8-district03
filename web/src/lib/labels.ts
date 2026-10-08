import type { ErrorType, StepType } from "./types";

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
