// Demo-flavoured data for the Phase 0-2 endpoints (Engineering Physics, persona Priya S.).
// Same shapes as contracts/api.md. Only used when NEXT_PUBLIC_DEMO_MODE=true; plain mock mode serves contracts/mocks.
import { ApiError } from "./apiError";
import { COURSE } from "./demo";
import type {
  Attempt,
  DnaEntry,
  ErrorType,
  NewQuestion,
  Question,
  Rubric,
  RubricStep,
  RubricStepInput,
  StepResult,
  StepType,
  Transcription,
  AnswerLine,
  GradeRequest,
  Highlight,
  MarkLeak,
} from "./types";

type StepDef = { d: string; m: number; t: StepType; e: string };
type QuestionDef = { id: string; topic: string; text: string; marks: number; steps: StepDef[] };

const QUESTION_DEFS: QuestionDef[] = [
  {
    id: "q_ke",
    topic: "Work and energy",
    text: "A body of mass 2 kg moves at 3 m/s. Find its kinetic energy.",
    marks: 10,
    steps: [
      { d: "States the given values with symbols", m: 2, t: "setup", e: "m and v listed" },
      { d: "Writes the formula before using it", m: 2, t: "formula", e: "$E = \\frac{1}{2}mv^2$ on its own line" },
      { d: "Substitutes the values correctly", m: 2, t: "method", e: "Values placed into the formula" },
      { d: "Calculates correctly", m: 2, t: "calculation", e: "$E = 9$" },
      { d: "Final answer with the unit", m: 2, t: "final_answer", e: "9 J" },
    ],
  },
  {
    id: "q_height",
    topic: "Kinematics",
    text: "A ball is thrown vertically upward at 20 m/s. Find the maximum height reached. Take $g = 10$ m/s$^2$.",
    marks: 5,
    steps: [
      { d: "Correct equation with $v = 0$ at the top", m: 1, t: "formula", e: "$v^2 = u^2 - 2gh$" },
      { d: "Correct substitution", m: 1, t: "method", e: "$0 = 20^2 - 2(10)h$" },
      { d: "Correct calculation", m: 2, t: "calculation", e: "$h = 20$" },
      { d: "Unit given", m: 1, t: "final_answer", e: "m" },
    ],
  },
  {
    id: "q_force",
    topic: "Newton's laws",
    text: "A 5 kg block accelerates from rest to 10 m/s in 4 s. Find the net force on it.",
    marks: 5,
    steps: [
      { d: "States the acceleration formula", m: 1, t: "formula", e: "$a = (v - u)/t$" },
      { d: "Calculates the acceleration", m: 1, t: "calculation", e: "$a = 2.5$ m/s$^2$" },
      { d: "States Newton's second law", m: 1, t: "formula", e: "$F = ma$" },
      { d: "Calculates the force", m: 1, t: "calculation", e: "$F = 12.5$" },
      { d: "Unit given for the final answer", m: 1, t: "final_answer", e: "N" },
    ],
  },
  {
    id: "q_lift",
    topic: "Newton's laws",
    text: "A 60 kg person stands in a lift accelerating upward at 2 m/s$^2$. Find the normal force on the person. Take $g = 10$ m/s$^2$.",
    marks: 6,
    steps: [
      { d: "Identifies the forces", m: 1, t: "setup", e: "N upward, mg downward" },
      { d: "Writes the correct equation of motion", m: 2, t: "formula", e: "$N - mg = ma$" },
      { d: "Substitutes the values", m: 1, t: "method", e: "$N = 60(10 + 2)$" },
      { d: "Calculates the normal force", m: 1, t: "calculation", e: "$N = 720$" },
      { d: "Unit given", m: 1, t: "final_answer", e: "N" },
    ],
  },
  {
    id: "q_fall",
    topic: "Kinematics",
    text: "An object falls from rest through 45 m. Find the time taken. Take $g = 10$ m/s$^2$.",
    marks: 5,
    steps: [
      { d: "States the equation of motion", m: 1, t: "formula", e: "$s = ut + \\frac{1}{2}gt^2$" },
      { d: "Correct substitution", m: 1, t: "method", e: "$45 = 5t^2$" },
      { d: "Shows $t^2 = 9$ explicitly", m: 1, t: "calculation", e: "$t^2 = 9$ on its own line" },
      { d: "Finds the time", m: 1, t: "calculation", e: "$t = 3$" },
      { d: "Unit given", m: 1, t: "final_answer", e: "s" },
    ],
  },
  {
    id: "q_work",
    topic: "Work and energy",
    text: "A force of 10 N moves a body 5 m, at 60 degrees to the displacement. Find the work done. Take $\\cos 60 = 0.5$.",
    marks: 6,
    steps: [
      { d: "Correct formula for work at an angle", m: 2, t: "formula", e: "$W = Fs\\cos\\theta$" },
      { d: "Correct substitution", m: 1, t: "method", e: "$W = 10 \\times 5 \\times \\cos 60$" },
      { d: "Uses $\\cos 60 = 0.5$", m: 1, t: "method", e: "0.5 used" },
      { d: "Calculates the work", m: 1, t: "calculation", e: "$W = 25$" },
      { d: "Unit given", m: 1, t: "final_answer", e: "J" },
    ],
  },
];

const FACULTY_UID = "demo-faculty-meera";
const STUDENT_UID = "demo-student-priya";

const ago = (days: number, hour = 10) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 15, 0, 0);
  return d.toISOString();
};

function buildRubric(def: QuestionDef): Rubric {
  const steps: RubricStep[] = def.steps.map((s, i) => ({
    id: `s${i + 1}`,
    description: s.d,
    marks: s.m,
    type: s.t,
    expected: s.e,
  }));
  return {
    id: `r_${def.id.slice(2)}`,
    questionId: def.id,
    status: "confirmed",
    steps,
    maxMarks: steps.reduce((t, s) => t + s.marks, 0),
    editedBy: FACULTY_UID,
    updatedAt: ago(20),
  };
}

// [awarded, errorType, reason, fix, matchedLines]. Full-mark steps only need the matched lines.
type Award = [number, ErrorType | null, string, string | null, number[]];
const ok = (...lines: number[]): Award => [-1, null, "", null, lines];
const lose = (awarded: number, type: ErrorType, reason: string, fix: string, ...lines: number[]): Award => [
  awarded,
  type,
  reason,
  fix,
  lines,
];

function buildResults(rubric: Rubric, awards: Award[]): StepResult[] {
  return rubric.steps.map((step, i) => {
    const [awarded, errorType, reason, fix, matchedLines] = awards[i];
    const full = awarded < 0 || awarded >= step.marks;
    return {
      stepId: step.id,
      awarded: full ? step.marks : awarded,
      max: step.marks,
      matchedLines,
      reason: full ? `Matches the rubric: ${step.expected}.` : reason,
      errorType: full ? null : errorType,
      fix: full ? null : fix,
    };
  });
}

const sum = (xs: number[]) => Math.round(xs.reduce((a, b) => a + b, 0) * 100) / 100;

function buildAttempt(args: {
  id: string;
  rubric: Rubric;
  input: "typed" | "photo";
  lines: AnswerLine[];
  results: StepResult[];
  gradedAt: string;
  imageId?: string;
  lowReason?: string;
}): Attempt {
  return {
    id: args.id,
    uid: STUDENT_UID,
    questionId: args.rubric.questionId,
    rubricId: args.rubric.id,
    inputType: args.input,
    imageId: args.imageId ?? null,
    lines: args.lines,
    stepResults: args.results,
    total: sum(args.results.map((r) => r.awarded)),
    max: args.rubric.maxMarks,
    confidence: args.lowReason ? "low" : "high",
    confidenceReason: args.lowReason ?? null,
    gradedAt: args.gradedAt,
  };
}

const typed = (...texts: string[]): AnswerLine[] => texts.map((text, i) => ({ n: i + 1, text, legible: true }));

// Priya's history. The numbers add up to the Mistake DNA in contracts/draft/mocks/profile.json.
function history(rubrics: Map<string, Rubric>): Attempt[] {
  const r = (qid: string) => rubrics.get(`r_${qid.slice(2)}`)!;
  return [
    buildAttempt({
      id: "a_hist_0",
      rubric: r("q_ke"),
      input: "typed",
      gradedAt: ago(12),
      lines: typed("Given: $m = 2$, $v = 3$", "$E = \\frac{1}{2}(2)(3)^2$", "$E = 9$", "Answer: 9"),
      results: buildResults(r("q_ke"), [
        ok(1),
        lose(0, "formula", "The formula is never written before the values are substituted.", "Write the formula on its own line first, then substitute."),
        ok(2),
        ok(3),
        lose(0, "units", "The final answer has no unit.", "State the answer with its unit, for example 9 J.", 4),
      ]),
    }),
    buildAttempt({
      id: "a_hist_1",
      rubric: r("q_fall"),
      input: "typed",
      gradedAt: ago(9),
      lines: typed("$s = ut + \\frac{1}{2}gt^2$", "$45 = 5t^2$", "$t = 3$ s"),
      results: buildResults(r("q_fall"), [
        ok(1),
        ok(2),
        lose(0, "skipped_step", "$t^2 = 9$ is never shown before the square root.", "Write $t^2 = 9$ on its own line, then take the root."),
        ok(3),
        ok(3),
      ]),
    }),
    buildAttempt({
      id: "a_hist_2",
      rubric: r("q_lift"),
      input: "typed",
      gradedAt: ago(7),
      lines: typed("Forces: N up, mg down", "$N = mg - ma$", "$N = 600 - 120$", "$N = 480$ N"),
      results: buildResults(r("q_lift"), [
        ok(1),
        lose(0, "concept", "The lift accelerates upward, so the equation is $N - mg = ma$, not $N = mg - ma$.", "Decide the direction of the acceleration first, then write the net force.", 2),
        ok(3),
        lose(0, "calculation", "480 N follows from the wrong equation; the correct value is 720 N.", "Redo the sum with $N = m(g + a)$.", 4),
        ok(4),
      ]),
    }),
    buildAttempt({
      id: "a_hist_3",
      rubric: r("q_force"),
      input: "typed",
      gradedAt: ago(5),
      lines: typed("$a = (v - u)/t = (10 - 0)/4 = 2.5$", "$F = ma$", "$F = 5 \\times 2.5 = 12.5$"),
      results: buildResults(r("q_force"), [
        ok(1),
        ok(1),
        ok(2),
        ok(3),
        lose(0, "units", "The final answer has no unit.", "Finish with the unit: 12.5 N.", 3),
      ]),
    }),
    buildAttempt({
      id: "a_hist_4",
      rubric: r("q_work"),
      input: "typed",
      gradedAt: ago(3),
      lines: typed("$W = F \\times s$", "$W = 10 \\times 5 = 50$ J"),
      results: buildResults(r("q_work"), [
        lose(0, "formula", "The formula leaves out $\\cos\\theta$, so it is not the work-at-an-angle formula.", "Write $W = Fs\\cos\\theta$.", 1),
        lose(0, "skipped_step", "There is no substitution line that includes the angle.", "Substitute all three values, including the angle.", 2),
        lose(0, "skipped_step", "$\\cos 60 = 0.5$ is never used.", "Show the value of $\\cos 60$ in the working.", 2),
        lose(0, "calculation", "50 J ignores the angle; the correct work is 25 J.", "Multiply by $\\cos 60 = 0.5$.", 2),
        ok(2),
      ]),
    }),
  ];
}


// ---- Co-Reader: AI notes and PYQ highlights for each page of /public/demo/notes.pdf ----------------
export const DEMO_PAGE_NOTES: Record<number, { id: string; text: string }[]> = {
  1: [
    { id: "p1n1", text: "Constant acceleration gives three equations. Pick the one that has the quantity you do not need missing." },
    { id: "p1n2", text: "At the top of a throw the velocity is zero: use $v^2 = u^2 + 2as$ with $a = -g$." },
    { id: "p1n3", text: "Write the equation on its own line before substituting. That line is a mark in most schemes." },
  ],
  2: [
    { id: "p2n1", text: "The net force on a body equals mass times acceleration: $F = ma$." },
    { id: "p2n2", text: "In a lift, the scale reads the normal force $N$, not your weight $mg$." },
    { id: "p2n3", text: "Upward acceleration: $N - mg = ma$. Downward: $mg - N = ma$. Decide the direction first." },
  ],
  3: [
    { id: "p3n1", text: "Only the component of force along the displacement does work: $W = Fs\cos\theta$." },
    { id: "p3n2", text: "A missing $\cos\theta$ costs the substitution and calculation marks that follow it." },
    { id: "p3n3", text: "Finish with the unit. Work is measured in joules (J)." },
  ],
};

export const DEMO_PAGE_HIGHLIGHTS: Record<number, Highlight[]> = {
  1: [{ id: "p1h1", text: "v^2 = u^2 + 2as", pyqYears: [2022, 2023, 2025], reason: "This equation was needed in three past papers." }],
  2: [
    { id: "p2h1", text: "N - mg = ma", pyqYears: [2022, 2024, 2025], reason: "This equation appeared in three past papers." },
    { id: "p2h2", text: "apparent weight", pyqYears: [2023], reason: "Asked once, in 2023." },
  ],
  3: [{ id: "p3h1", text: "W = F s cos(theta)", pyqYears: [2021, 2024], reason: "Asked twice, both times with the angle given." }],
};

const FIX_ADVICE: Record<ErrorType, string> = {
  concept: "Before you write, decide which idea applies and why. Say it in one line.",
  formula: "Write the formula on its own line before you substitute. This one habit is worth the most marks.",
  calculation: "Redo each calculation once, line by line, before moving on.",
  units: "Finish every final answer with its unit, and carry units through the working.",
  notation: "Use the symbols from the question and keep signs consistent.",
  skipped_step: "Show every step. Marks are given for working, not just the result.",
  presentation: "Number your steps and underline the final answer.",
  incomplete: "Attempt every part. A started step can earn marks, a blank cannot.",
};

export type DnaSource = { attempts: Attempt[]; topicOf: (questionId: string) => string };

// Mistake DNA from stored attempts: one entry per error type, sorted by marks lost.
export function computeDna({ attempts, topicOf }: DnaSource): DnaEntry[] {
  const map = new Map<ErrorType, DnaEntry>();
  for (const a of attempts) {
    for (const s of a.stepResults) {
      if (!s.errorType || s.awarded >= s.max) continue;
      const e = map.get(s.errorType) ?? { errorType: s.errorType, count: 0, marksLost: 0, topics: [] };
      e.count += 1;
      e.marksLost = sum([e.marksLost, s.max - s.awarded]);
      const topic = topicOf(a.questionId);
      if (!e.topics.includes(topic)) e.topics.push(topic);
      map.set(s.errorType, e);
    }
  }
  return [...map.values()].sort((x, y) => y.marksLost - x.marksLost || y.count - x.count);
}

// The photo flow's canned result for the kinetic energy question, rebuilt from the lines the student confirmed.
function gradePhotoKe(rubric: Rubric, lines: AnswerLine[], id: string, imageId: string | undefined): Attempt {
  const illegible = lines.filter((l) => l.legible === false).map((l) => l.n);
  const clear = illegible.length === 0;
  const results = buildResults(rubric, [
    ok(1),
    ok(2),
    clear
      ? ok(3)
      : lose(1, "skipped_step", "The substitution line could not be read clearly.", "Write the substitution step clearly on its own line.", 3),
    clear
      ? ok(3)
      : lose(1, "skipped_step", "The calculation is not visible; only the result is shown.", "Show the working between substitution and result.", 3),
    ok(lines.length),
  ]);
  return buildAttempt({
    id,
    rubric,
    input: "photo",
    lines,
    results,
    gradedAt: new Date().toISOString(),
    imageId,
    lowReason: clear
      ? undefined
      : `Line ${illegible.join(", ")} was illegible, so the grade may be wrong. A teacher will check it.`,
  });
}

// Anything else gets a plain heuristic: a step is credited if the answer has a line for it.
function gradeHeuristic(rubric: Rubric, body: GradeRequest, id: string): Attempt {
  const lines = body.lines.map((l) => ({ ...l, legible: l.legible !== false }));
  const illegible = lines.filter((l) => !l.legible).map((l) => l.n);
  const results: StepResult[] = rubric.steps.map((step, i) => {
    const line = lines[i];
    const done = Boolean(line && line.text.trim());
    return {
      stepId: step.id,
      awarded: done ? step.marks : 0,
      max: step.marks,
      matchedLines: done ? [line.n] : [],
      reason: done ? `Line ${line.n} covers this step.` : "No line in the answer covers this step.",
      errorType: done ? null : "incomplete",
      fix: done ? null : `Add a line that shows: ${step.description.toLowerCase()}.`,
    };
  });
  return buildAttempt({
    id,
    rubric,
    input: body.inputType,
    lines,
    results,
    gradedAt: new Date().toISOString(),
    imageId: body.imageId,
    lowReason: illegible.length
      ? `Line ${illegible.join(", ")} was illegible, so the grade may be wrong. A teacher will check it.`
      : undefined,
  });
}

function splitMarks(total: number, parts: number): number[] {
  const each = Math.floor((total / parts) * 2) / 2;
  const marks = Array<number>(parts).fill(each);
  marks[parts - 1] = Math.round((total - each * (parts - 1)) * 100) / 100;
  return marks;
}

const GENERIC_STEPS: { d: string; t: StepType; e: string }[] = [
  { d: "States the given quantities", t: "setup", e: "All given values listed" },
  { d: "Writes the governing formula", t: "formula", e: "Formula stated before use" },
  { d: "Substitutes the values", t: "method", e: "Values placed into the formula" },
  { d: "Calculates correctly", t: "calculation", e: "Correct arithmetic" },
  { d: "Gives the final answer with units", t: "final_answer", e: "Answer with correct units" },
];

// In-memory store behind the demo endpoints. reset() restores the starting story.
export class DemoStore {
  questions = new Map<string, Question>();
  rubrics = new Map<string, Rubric>();
  attempts: Attempt[] = [];
  private seq = 0;

  constructor() {
    this.reset();
  }

  reset() {
    this.questions.clear();
    this.rubrics.clear();
    this.seq = 0;
    for (const def of QUESTION_DEFS) {
      const rubric = buildRubric(def);
      this.rubrics.set(rubric.id, rubric);
      this.questions.set(def.id, {
        id: def.id,
        course: COURSE,
        topic: def.topic,
        text: def.text,
        marks: def.marks,
        source: "sample",
        year: null,
        rubricId: rubric.id,
      });
    }
    this.attempts = history(this.rubrics);
  }

  private nextId(prefix: string) {
    this.seq += 1;
    return `${prefix}_demo_${this.seq}`;
  }

  topicOf = (questionId: string) => this.questions.get(questionId)?.topic ?? "Other";
  dna = () => computeDna({ attempts: this.attempts, topicOf: this.topicOf });

  question(id: string): Question {
    const q = this.questions.get(id);
    if (!q) throw new ApiError("not_found", `Question ${id} does not exist`, 404);
    return structuredClone(q);
  }

  rubric(id: string): Rubric {
    const r = this.rubrics.get(id);
    if (!r) throw new ApiError("not_found", `Rubric ${id} does not exist`, 404);
    return structuredClone(r);
  }

  attempt(id: string): Attempt {
    const a = this.attempts.find((x) => x.id === id);
    if (a) return structuredClone(a);
    if (id === "a_demo_photo") return structuredClone(this.cannedPhotoAttempt());
    throw new ApiError("not_found", `Attempt ${id} does not exist`, 404);
  }

  // The story's handwritten attempt, for screens that open it before the photo flow has run.
  private cannedPhotoAttempt(): Attempt {
    const lines: AnswerLine[] = [
      { n: 1, text: "Given: $m = 2$, $v = 3$", legible: true },
      { n: 2, text: "$E = \\frac{1}{2} m v^2$", legible: true },
      { n: 3, text: "$E = ?$", legible: false },
      { n: 4, text: "Answer: 9 J", legible: true },
    ];
    return gradePhotoKe(this.rubrics.get("r_ke")!, lines, "a_demo_photo", "img_demo_2");
  }

  listQuestions(course: string): Question[] {
    return [...this.questions.values()].filter((q) => q.course === course).map((q) => structuredClone(q));
  }

  listAttempts(): Attempt[] {
    return [...this.attempts].sort((a, b) => b.gradedAt.localeCompare(a.gradedAt)).map((a) => structuredClone(a));
  }

  createQuestion(body: NewQuestion): Question {
    const q: Question = { ...body, id: this.nextId("q"), rubricId: null };
    this.questions.set(q.id, q);
    return structuredClone(q);
  }

  extractRubric(questionId: string): Rubric {
    const q = this.question(questionId);
    const marks = splitMarks(q.marks, GENERIC_STEPS.length);
    const steps: RubricStep[] = GENERIC_STEPS.map((s, i) => ({
      id: `s${i + 1}`,
      description: s.d,
      marks: marks[i],
      type: s.t,
      expected: s.e,
    }));
    const rubric: Rubric = {
      id: this.nextId("r"),
      questionId,
      status: "proposed",
      steps,
      maxMarks: sum(marks),
      editedBy: null,
      updatedAt: new Date().toISOString(),
    };
    this.rubrics.set(rubric.id, rubric);
    this.questions.set(questionId, { ...this.questions.get(questionId)!, rubricId: rubric.id });
    return structuredClone(rubric);
  }

  // Mirrors the API: step marks must add up to the question's marks (error code validation_error).
  private requireMarksMatch(rubric: Rubric) {
    const q = this.questions.get(rubric.questionId);
    if (q && Math.abs(rubric.maxMarks - q.marks) > 1e-6) {
      throw new ApiError(
        "validation_error",
        `Rubric steps add up to ${rubric.maxMarks} marks but question ${q.id} is worth ${q.marks} marks`,
        422,
      );
    }
  }

  updateRubric(id: string, steps: RubricStepInput[], editedBy: string): Rubric {
    const current = this.rubric(id);
    const used = new Set(steps.map((s) => s.id).filter(Boolean));
    let n = 0;
    const full: RubricStep[] = steps.map((s) => {
      let sid = s.id;
      while (!sid) {
        n += 1;
        if (!used.has(`s${n}`)) {
          sid = `s${n}`;
          used.add(sid);
        }
      }
      return { ...s, id: sid };
    });
    const next: Rubric = {
      ...current,
      status: "proposed",
      steps: full,
      maxMarks: sum(full.map((s) => s.marks)),
      editedBy,
      updatedAt: new Date().toISOString(),
    };
    this.requireMarksMatch(next);
    this.rubrics.set(id, next);
    return structuredClone(next);
  }

  confirmRubric(id: string, editedBy: string): Rubric {
    const current = this.rubric(id);
    this.requireMarksMatch(current);
    const next: Rubric = { ...current, status: "confirmed", editedBy, updatedAt: new Date().toISOString() };
    this.rubrics.set(id, next);
    return structuredClone(next);
  }

  grade(body: GradeRequest): Attempt {
    const rubric = this.rubrics.get(body.rubricId);
    if (!rubric) throw new ApiError("not_found", `Rubric ${body.rubricId} does not exist`, 404);
    if (rubric.status !== "confirmed") {
      throw new ApiError("invalid_input", `Rubric ${rubric.id} is not confirmed; confirm it before grading`, 422);
    }
    const id = this.attempts.some((a) => a.id === "a_demo_photo") ? this.nextId("a") : "a_demo_photo";
    const attempt =
      body.inputType === "photo" && body.questionId === "q_ke"
        ? gradePhotoKe(rubric, body.lines.map((l) => ({ ...l, legible: l.legible !== false })), id, body.imageId)
        : gradeHeuristic(rubric, body, body.inputType === "photo" ? id : this.nextId("a"));
    this.attempts.push(attempt);
    return structuredClone(attempt);
  }


  // The Mark-Leak Report, summed from stored attempts: where marks went, by error type and by topic, and the best fix.
  markLeak(): MarkLeak {
    const attempts = [...this.attempts].sort((a, b) => a.gradedAt.localeCompare(b.gradedAt));
    const dna = this.dna();
    const byTopic = new Map<string, number>();
    for (const a of attempts) {
      const lost = a.stepResults.reduce((t, r) => t + (r.max - r.awarded), 0);
      byTopic.set(this.topicOf(a.questionId), sum([byTopic.get(this.topicOf(a.questionId)) ?? 0, lost]));
    }
    const top = dna[0];
    return {
      totalLost: sum(attempts.map((a) => a.max - a.total)),
      totalMax: sum(attempts.map((a) => a.max)),
      byErrorType: dna.map((e) => ({ errorType: e.errorType, marksLost: e.marksLost })),
      byTopic: [...byTopic.entries()].map(([topic, marksLost]) => ({ topic, marksLost })).sort((x, y) => y.marksLost - x.marksLost),
      trend: attempts.map((a) => ({ attemptId: a.id, date: a.gradedAt.slice(0, 10), total: a.total, max: a.max })),
      topFix: {
        errorType: top.errorType,
        topic: top.topics[0],
        marksRecoverable: top.marksLost,
        advice: FIX_ADVICE[top.errorType],
      },
    };
  }

  transcription(from: Transcription): Transcription {
    return structuredClone(from);
  }
}
