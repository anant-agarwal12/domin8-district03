"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { USE_MOCKS } from "@/lib/config";
import { loadSamplePhoto } from "@/lib/demo";
import { msg } from "@/lib/labels";
import { useReadyQuestions, type ReadyQuestion } from "@/lib/useReadyQuestions";
import type { AnswerLine } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./ErrorNotice";
import { CameraIcon, EyeIcon, UploadIcon } from "./Icons";
import { MathText } from "./Math";
import { PageHeader } from "./Page";
import { EmptyState, Loading, btnGhost, btnPrimary, inputCls } from "./states";

type Stage =
  | { name: "pick" }
  | { name: "reading" }
  | { name: "confirm"; imageId: string; lines: AnswerLine[] }
  | { name: "grading" };

// Examiner Mode: photo -> check the transcription -> step-wise result.
export function ExaminerScreen() {
  const { profile } = useAuth();
  const loaded = useReadyQuestions(profile?.course ?? "");
  const ready = loaded.data;

  if (loaded.error) return <ErrorNotice title="Could not load questions" message={loaded.error} onRetry={loaded.retry} />;
  if (!ready) return <Loading label="Loading questions…" />;
  if (ready.length === 0) {
    return (
      <EmptyState title="No question is ready to answer">
        A question needs a confirmed rubric first.{" "}
        <Link href="/questions/new" className="font-medium text-ai underline">
          Create one
        </Link>
        .
      </EmptyState>
    );
  }
  return <Flow ready={ready} />;
}

function Flow({ ready }: { ready: ReadyQuestion[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState(ready[0].question.id);
  const [stage, setStage] = useState<Stage>({ name: "pick" });
  const [error, setError] = useState<string | null>(null);
  const { file, preview, setFile } = usePhoto();
  const current = ready.find((r) => r.question.id === selected) ?? ready[0];

  async function loadSample() {
    setError(null);
    try {
      setFile(await loadSamplePhoto());
    } catch (e) {
      setError(msg(e));
    }
  }

  async function read() {
    if (!file) return;
    setStage({ name: "reading" });
    setError(null);
    try {
      const t = await api.transcribe(file, current.question.id);
      setStage({ name: "confirm", imageId: t.imageId, lines: t.lines });
    } catch (e) {
      setError(msg(e));
      setStage({ name: "pick" });
    }
  }

  async function grade(imageId: string, lines: AnswerLine[]) {
    setStage({ name: "grading" });
    setError(null);
    try {
      const attempt = await api.gradeAttempt({
        questionId: current.question.id,
        rubricId: current.rubric.id,
        inputType: "photo",
        imageId,
        lines,
      });
      router.push(`/attempts/${encodeURIComponent(attempt.id)}`);
    } catch (e) {
      setError(msg(e));
      setStage({ name: "confirm", imageId, lines });
    }
  }

  const step = stage.name === "pick" || stage.name === "reading" ? 1 : 2;

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Snap your answer" back={{ href: "/", label: "Home" }} />
      <ol className="mb-6 flex gap-6 text-sm" aria-label="Progress">
        <li className={step === 1 ? "font-semibold text-navy" : "text-muted"} aria-current={step === 1 ? "step" : undefined}>
          1. Photo
        </li>
        <li className={step === 2 ? "font-semibold text-navy" : "text-muted"} aria-current={step === 2 ? "step" : undefined}>
          2. Check what we read
        </li>
        <li className="text-muted">3. Your marks</li>
      </ol>

      {error && (
        <div className="mb-5">
          <ErrorNotice title="That did not work" message={error} />
        </div>
      )}

      {(stage.name === "pick" || stage.name === "reading") && (
        <div className="space-y-6">
          <div>
            <label htmlFor="q" className="mb-1 block text-sm font-medium">
              Which question did you answer?
            </label>
            <select id="q" value={current.question.id} onChange={(e) => setSelected(e.target.value)} className={inputCls}>
              {ready.map(({ question }) => (
                <option key={question.id} value={question.id}>
                  {question.topic} · {question.marks} marks · {question.text.slice(0, 48)}
                </option>
              ))}
            </select>
            <p className="mt-3 max-w-[60ch] rounded-md border border-line bg-surface p-4">
              <MathText text={current.question.text} />
              <span className="mt-1 block text-sm text-muted">{current.question.marks} marks</span>
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Your handwritten answer</p>
            <div className="flex flex-wrap gap-3">
              <PickFile label="Take a photo" capture icon={<CameraIcon />} onFile={setFile} primary />
              <PickFile label="Upload a file" icon={<UploadIcon />} onFile={setFile} />
              {USE_MOCKS && (
                <button type="button" onClick={() => void loadSample()} className={`${btnGhost} min-h-11`}>
                  Use the sample photo
                </button>
              )}
            </div>
            {preview && (
              // eslint-disable-next-line @next/next/no-img-element -- a local blob URL; next/image cannot optimise it
              <img src={preview} alt="Your photographed answer" className="mt-4 max-h-80 w-auto rounded-md border border-line" />
            )}
          </div>

          <button
            type="button"
            onClick={() => void read()}
            disabled={!file || stage.name === "reading"}
            className={`${btnPrimary} min-h-12 w-full sm:w-auto`}
          >
            {stage.name === "reading" ? "Reading your handwriting…" : "Read my handwriting"}
          </button>
        </div>
      )}

      {(stage.name === "confirm" || stage.name === "grading") && (
        <Confirm
          preview={preview}
          initial={stage.name === "confirm" ? stage.lines : []}
          busy={stage.name === "grading"}
          onBack={() => setStage({ name: "pick" })}
          onSubmit={(lines) => stage.name === "confirm" && void grade(stage.imageId, lines)}
        />
      )}
    </div>
  );
}

function PickFile({
  label,
  icon,
  capture,
  primary,
  onFile,
}: {
  label: string;
  icon: React.ReactNode;
  capture?: boolean;
  primary?: boolean;
  onFile: (f: File) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={`${primary ? btnPrimary : btnGhost} inline-flex min-h-11 items-center gap-2`}
      >
        {icon}
        {label}
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        capture={capture ? "environment" : undefined}
        className="sr-only"
        tabIndex={-1}
        aria-label={label}
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) onFile(f);
          e.target.value = "";
        }}
      />
    </>
  );
}

// Step 2: the student checks and edits what was read. Hard-to-read lines are marked; editing one confirms it.
function Confirm({
  preview,
  initial,
  busy,
  onBack,
  onSubmit,
}: {
  preview: string | null;
  initial: AnswerLine[];
  busy: boolean;
  onBack: () => void;
  onSubmit: (lines: AnswerLine[]) => void;
}) {
  const [lines, setLines] = useState<AnswerLine[]>(initial);
  const doubtful = lines.filter((l) => l.legible === false).length;
  const patch = (n: number, text: string) =>
    setLines(lines.map((l) => (l.n === n ? { ...l, text, legible: true } : l)));
  const remove = (n: number) => setLines(lines.filter((l) => l.n !== n).map((l, i) => ({ ...l, n: i + 1 })));
  const add = () => setLines([...lines, { n: lines.length + 1, text: "", legible: true }]);
  const filled = lines.filter((l) => l.text.trim());

  return (
    <div className="grid gap-6 md:grid-cols-[1fr_1.3fr]">
      {preview && (
        <figure className="md:sticky md:top-36 md:self-start">
          {/* eslint-disable-next-line @next/next/no-img-element -- a local blob URL; next/image cannot optimise it */}
          <img src={preview} alt="Your photographed answer" className="w-full rounded-md border border-line" />
          <figcaption className="mt-1 text-sm text-muted">Your photo</figcaption>
        </figure>
      )}
      <div>
        <h2 className="text-xl">Is this what you wrote?</h2>
        <p className="mt-1 text-sm text-muted">
          {doubtful > 0
            ? `${doubtful} line${doubtful > 1 ? "s were" : " was"} hard to read. Check ${doubtful > 1 ? "them" : "it"} and fix any mistakes.`
            : "Every line was clear. Fix anything we got wrong."}
        </p>
        <ol className="mt-4 space-y-3">
          {lines.map((l) => (
            <li key={l.n} className={`rounded-md p-2 ${l.legible === false ? "border border-accent-light bg-hl" : ""}`}>
              <div className="flex items-start gap-2">
                <span className="w-5 shrink-0 pt-3 text-right text-sm text-muted tnum" aria-hidden>
                  {l.n}
                </span>
                <div className="min-w-0 flex-1">
                  <input
                    aria-label={`Line ${l.n}`}
                    value={l.text}
                    onChange={(e) => patch(l.n, e.target.value)}
                    className={`${inputCls} font-mono text-sm`}
                  />
                  {l.legible === false && (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-sm font-medium text-warn">
                      <EyeIcon className="size-4" /> Hard to read. Check this line.
                    </p>
                  )}
                  {l.text.includes("$") && (
                    <p className="mt-1 overflow-x-auto rounded-sm bg-paper px-2 py-1">
                      <MathText text={l.text} />
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Remove line ${l.n}`}
                  onClick={() => remove(l.n)}
                  disabled={lines.length === 1}
                  className={`${btnGhost} min-h-11 min-w-11 self-start`}
                >
                  ✕
                </button>
              </div>
            </li>
          ))}
        </ol>
        <button type="button" onClick={add} className={`${btnGhost} mt-3 min-h-11`}>
          + Add a line
        </button>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => onSubmit(filled.map((l, i) => ({ ...l, n: i + 1 })))}
            disabled={busy || filled.length === 0}
            className={`${btnPrimary} min-h-12`}
          >
            {busy ? "Marking… this can take a few seconds" : "Mark my answer"}
          </button>
          <button type="button" onClick={onBack} disabled={busy} className={`${btnGhost} min-h-12`}>
            Use a different photo
          </button>
        </div>
      </div>
    </div>
  );
}

// The chosen photo and its preview URL. The URL is made in the handler and revoked when replaced or on unmount.
function usePhoto() {
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null);
  const current = useRef<string | null>(null);

  useEffect(
    () => () => {
      if (current.current) URL.revokeObjectURL(current.current);
    },
    [],
  );

  const setFile = (file: File) => {
    if (current.current) URL.revokeObjectURL(current.current);
    current.current = URL.createObjectURL(file);
    setPhoto({ file, url: current.current });
  };
  return { file: photo?.file ?? null, preview: photo?.url ?? null, setFile };
}
