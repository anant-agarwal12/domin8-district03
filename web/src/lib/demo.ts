// Demo mode: personas for pitches (no Google sign-in) and the presenter's step list.
import { useSyncExternalStore } from "react";
import type { User } from "./types";

export type Persona = "student" | "teacher" | "faculty";

export const COURSE = "Engineering Physics";

export const PERSONAS: { id: Persona; name: string; title: string; blurb: string; home: string }[] = [
  {
    id: "student",
    name: "Priya S.",
    title: "Student",
    blurb: "Second-year engineering. Exam in twelve days. Keeps losing marks on small things.",
    home: "/",
  },
  {
    id: "teacher",
    name: "Dr. Arjun Rao",
    title: "Teacher",
    blurb: "Takes the doubts the AI should not answer alone, and teaches the fix.",
    home: "/teacher",
  },
  {
    id: "faculty",
    name: "Prof. Meera Iyer",
    title: "Faculty",
    blurb: "Owns the rubrics and watches where the whole class loses marks.",
    home: "/faculty",
  },
];

const KEY = "unstuck.demo.persona";
const listeners = new Set<() => void>();

function read(): Persona | null {
  try {
    const v = window.localStorage.getItem(KEY);
    return v === "student" || v === "teacher" || v === "faculty" ? v : null;
  } catch {
    return null;
  }
}

export function setPersona(p: Persona | null): void {
  try {
    if (p) window.localStorage.setItem(KEY, p);
    else window.localStorage.removeItem(KEY);
  } catch {
    // Storage can be blocked (private window); the app then just forgets the persona on reload.
    memory = p;
  }
  listeners.forEach((l) => l());
}

let memory: Persona | null = null;
export const getPersona = (): Persona | null => read() ?? memory;

// undefined = not known yet (server render / before hydration).
export function usePersona(): Persona | null | undefined {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => void listeners.delete(cb);
    },
    getPersona,
    () => undefined,
  );
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

// The mock /me for the chosen persona. The exam date moves with the clock so the countdown always makes sense.
export function demoUser(persona: Persona): User {
  const exam = new Date();
  exam.setDate(exam.getDate() + 12);
  switch (persona) {
    case "student":
      return { uid: "demo-student-priya", name: "Priya S.", role: "student", course: COURSE, examDate: isoDay(exam) };
    case "teacher":
      return { uid: "demo-teacher-arjun", name: "Dr. Arjun Rao", role: "teacher", course: COURSE, examDate: null };
    case "faculty":
      // The contract has no faculty role yet (contracts/draft/api.md, open question): faculty is a teacher here.
      return { uid: "demo-faculty-meera", name: "Prof. Meera Iyer", role: "teacher", course: COURSE, examDate: null };
  }
}

// Demo story state that lives outside the mock data: has a teacher resolved a session yet?
export const demoFlags = { kbResolved: false };

export type DemoStep = {
  id: string;
  label: string;
  route: string;
  persona: Persona | null;
  cue: string; // one line for the presenter to say
  seedKb?: boolean;
};

// Screens A to K in presentation order.
export const DEMO_STEPS: DemoStep[] = [
  { id: "A", label: "Landing", route: "/", persona: null, cue: "Three people use it. Start as Priya, a student." },
  { id: "B", label: "Student home", route: "/", persona: "student", cue: "Twelve days to the exam. Her marks leak to formulas, units and skipped steps." },
  { id: "C", label: "Examiner Mode", route: "/examiner", persona: "student", cue: "A photo in, step-wise marks out. Line 3 is flagged as hard to read." },
  { id: "D", label: "Route decision", route: "/doubts/db_demo_1", persona: "student", cue: "Why a teacher? Low confidence. Every route shows its reason, and she can overrule it." },
  { id: "E", label: "Explanation", route: "/doubts/db_demo_2/explain", persona: "student", cue: "The explanation cites her own notes, then asks one check question." },
  { id: "F", label: "Practice", route: "/doubts/db_demo_3/practice", persona: "student", cue: "Practice aimed at her actual mistake type, with instant feedback." },
  { id: "G", label: "Teacher dashboard", route: "/teacher", persona: "teacher", cue: "A doubt arrives live. The teacher sees the diagnosis, not just the question." },
  { id: "H", label: "Knowledge base loop", route: "/ask?example=work", persona: "student", seedKb: true, cue: "The teacher's fix is now in the knowledge base. The next student gets it cited." },
  { id: "I", label: "Mark-Leak Report", route: "/markleak", persona: "student", cue: "Where her marks went, and the one fix worth the most." },
  { id: "J", label: "Co-Reader", route: "/reader?doc=d_notes_1&page=2", persona: "student", cue: "Notes beside AI explanations and past-paper highlights. Select a line to ask." },
  { id: "K", label: "Faculty class view", route: "/faculty", persona: "faculty", cue: "Faculty sees the whole class: one session on the darkest cell helps the most students." },
];

// Demo mode only: the placeholder handwritten answer shipped in /public/demo (swap in a real photo any time).
export async function loadSamplePhoto(): Promise<File> {
  const res = await fetch("/demo/answer.jpg");
  if (!res.ok) throw new Error("The sample photo could not be loaded.");
  const blob = await res.blob();
  return new File([blob], "answer.jpg", { type: blob.type || "image/jpeg" });
}
