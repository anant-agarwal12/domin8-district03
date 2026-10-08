"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/api";
import { msg } from "@/lib/labels";
import type { NewQuestion, Question, QuestionSource } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./ErrorNotice";
import { Field, PageHeader } from "./Page";
import { btnGhost, btnPrimary, inputCls } from "./states";

type Kind = "scheme" | "sample";

export function QuestionForm() {
  const { profile } = useAuth();
  const router = useRouter();
  const [question, setQuestion] = useState<Question | null>(null);

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title={question ? "Marking scheme" : "New question"} />
      {question ? (
        <SchemeBox
          question={question}
          onDone={(rubricId) => router.push(`/rubrics/${encodeURIComponent(rubricId)}`)}
        />
      ) : (
        <CreateForm defaultCourse={profile?.course ?? ""} onCreated={setQuestion} />
      )}
    </div>
  );
}

function CreateForm({
  defaultCourse,
  onCreated,
}: {
  defaultCourse: string;
  onCreated: (q: Question) => void;
}) {
  const [course, setCourse] = useState(defaultCourse);
  const [topic, setTopic] = useState("");
  const [text, setText] = useState("");
  const [marks, setMarks] = useState("10");
  const [source, setSource] = useState<QuestionSource>("sample");
  const [year, setYear] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body: NewQuestion = {
      course: course.trim(),
      topic: topic.trim(),
      text: text.trim(),
      marks: Number(marks),
      source,
      year: year ? Number(year) : null,
    };
    try {
      onCreated(await api.createQuestion(body));
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Course" htmlFor="course">
          <input id="course" required value={course} onChange={(e) => setCourse(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Topic" htmlFor="topic" hint="Use the syllabus topic id.">
          <input id="topic" required value={topic} onChange={(e) => setTopic(e.target.value)} className={inputCls} />
        </Field>
      </div>
      <Field label="Question" htmlFor="text">
        <textarea id="text" required rows={4} value={text} onChange={(e) => setText(e.target.value)} className={inputCls} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Marks" htmlFor="marks">
          <input id="marks" type="number" inputMode="numeric" required min={1} max={100} value={marks} onChange={(e) => setMarks(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Source" htmlFor="source">
          <select id="source" value={source} onChange={(e) => setSource(e.target.value as QuestionSource)} className={inputCls}>
            <option value="sample">Sample</option>
            <option value="pyq">Previous year</option>
            <option value="generated">Generated</option>
          </select>
        </Field>
        <Field label="Year" htmlFor="year" hint="Optional.">
          <input id="year" type="number" inputMode="numeric" min={1990} max={2100} value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} />
        </Field>
      </div>
      {error && <ErrorNotice title="Could not save the question" message={error} />}
      <button type="submit" disabled={busy} className={`${btnPrimary} w-full sm:w-auto`}>
        {busy ? "Saving…" : "Save and continue"}
      </button>
    </form>
  );
}

function SchemeBox({ question, onDone }: { question: Question; onDone: (rubricId: string) => void }) {
  const [kind, setKind] = useState<Kind>("scheme");
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function extract(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const rubric = await api.extractRubric({ questionId: question.id, kind, content: content.trim() });
      onDone(rubric.id);
    } catch (err) {
      setError(msg(err));
      setBusy(false);
    }
  }

  return (
    <form onSubmit={extract} className="space-y-4 rounded-2xl border border-line bg-surface p-5 shadow-sm">
      <p className="rounded-lg bg-paper p-3 text-sm">
        <span className="font-medium">Saved:</span> {question.text} <span className="text-muted">({question.marks} marks)</span>
      </p>
      <div role="group" aria-label="Kind of content" className="inline-flex rounded-lg border border-line p-0.5">
        {(["scheme", "sample"] as const).map((k) => (
          <button
            key={k}
            type="button"
            aria-pressed={kind === k}
            onClick={() => setKind(k)}
            className={`rounded-md px-3 py-1.5 text-sm font-medium ${kind === k ? "bg-navy text-white" : "text-muted"}`}
          >
            {k === "scheme" ? "Marking scheme" : "Solved sample"}
          </button>
        ))}
      </div>
      <Field
        label={kind === "scheme" ? "Paste the marking scheme" : "Paste a solved answer"}
        htmlFor="content"
        hint="The AI proposes rubric steps from this. You review and edit them next."
      >
        <textarea id="content" required rows={8} value={content} onChange={(e) => setContent(e.target.value)} className={`${inputCls} font-mono text-sm`} />
      </Field>
      {error && <ErrorNotice title="Could not extract a rubric" message={error} />}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={busy || !content.trim()} className={btnPrimary}>
          {busy ? "Extracting steps…" : "Extract rubric"}
        </button>
        <button type="button" onClick={() => window.location.reload()} className={btnGhost}>
          Start over
        </button>
      </div>
    </form>
  );
}
