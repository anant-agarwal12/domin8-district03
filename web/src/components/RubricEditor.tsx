"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "@/lib/api";
import { STEP_TYPES, STEP_TYPE_LABEL, msg } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { Rubric, RubricStepInput, StepType } from "@/lib/types";
import { ErrorNotice } from "./ErrorNotice";
import { PageHeader } from "./Page";
import { Loading, btnGhost, btnPrimary, inputCls } from "./states";

// Rows get a client-side key so reordering keeps each row's focus and state.
type Row = RubricStepInput & { key: string };
let keySeq = 0;
const toRow = (s: RubricStepInput): Row => ({ ...s, key: `k${keySeq++}` });
const blank = (): Row => toRow({ description: "", marks: 1, type: "method", expected: "" });
const toInput = (r: Row): RubricStepInput => ({
  id: r.id,
  description: r.description,
  marks: r.marks,
  type: r.type,
  expected: r.expected,
});

export function RubricEditor() {
  const { id: rubricId } = useParams<{ id: string }>();
  const loaded = useLoad(rubricId, () => api.getRubric(rubricId));
  const [rubric, setRubric] = useState<Rubric | null>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [dirty, setDirty] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busy, setBusy] = useState<"save" | "confirm" | null>(null);

  // Adopt the freshly loaded rubric once (during render, per React's "adjusting state" pattern).
  const [seen, setSeen] = useState<Rubric | null>(null);
  if (loaded.data && loaded.data !== seen) {
    setSeen(loaded.data);
    setRubric(loaded.data);
    setRows(loaded.data.steps.map(toRow));
    setDirty(false);
  }

  const edit = (next: Row[]) => {
    setRows(next);
    setDirty(true);
  };
  const patch = (i: number, p: Partial<Row>) => edit(rows.map((r, j) => (j === i ? { ...r, ...p } : r)));
  const move = (i: number, d: -1 | 1) => {
    const next = [...rows];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    edit(next);
  };

  const total = rows.reduce((t, r) => t + (Number.isFinite(r.marks) ? r.marks : 0), 0);
  const valid = rows.length > 0 && rows.every((r) => r.description.trim() && Number.isFinite(r.marks) && r.marks >= 0);

  async function save(): Promise<boolean> {
    setBusy("save");
    setActionError(null);
    try {
      const r = await api.updateRubric(rubricId, rows.map(toInput));
      setRubric(r);
      setRows(r.steps.map(toRow));
      setDirty(false);
      return true;
    } catch (e) {
      setActionError(msg(e));
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function confirm() {
    if (dirty && !(await save())) return;
    setBusy("confirm");
    setActionError(null);
    try {
      setRubric(await api.confirmRubric(rubricId));
    } catch (e) {
      setActionError(msg(e));
    } finally {
      setBusy(null);
    }
  }

  if (loaded.error) return <ErrorNotice title="Could not load the rubric" message={loaded.error} onRetry={loaded.retry} />;
  if (!rubric) return <Loading label="Loading rubric…" />;

  const confirmed = rubric.status === "confirmed" && !dirty;

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Rubric" back={{ href: "/questions/new", label: "New question" }}>
        <span
          className={`rounded-full px-3 py-1 text-sm font-semibold ${confirmed ? "bg-ok/15 text-ok" : "bg-warn-bg text-warn"}`}
        >
          {confirmed ? "Confirmed" : "Proposed"}
        </span>
      </PageHeader>

      <p className="mb-4 text-sm text-muted">
        {confirmed
          ? "This rubric is locked in and can be used for grading. Editing a step sets it back to Proposed."
          : "Check each step against your marking scheme, then confirm. Only confirmed rubrics can grade answers."}
      </p>

      <ol className="space-y-3">
        {rows.map((r, i) => (
          <li key={r.key} className="rounded-2xl border border-line bg-surface p-4 shadow-sm">
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-sm font-semibold text-muted">Step {i + 1}</span>
              <div className="flex gap-1">
                <button type="button" aria-label={`Move step ${i + 1} up`} disabled={i === 0} onClick={() => move(i, -1)} className={btnGhost}>↑</button>
                <button type="button" aria-label={`Move step ${i + 1} down`} disabled={i === rows.length - 1} onClick={() => move(i, 1)} className={btnGhost}>↓</button>
                <button type="button" aria-label={`Remove step ${i + 1}`} onClick={() => edit(rows.filter((_, j) => j !== i))} className={`${btnGhost} text-danger`}>Remove</button>
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_5rem_10rem]">
              <div>
                <label htmlFor={`d-${r.key}`} className="mb-1 block text-xs font-medium text-muted">Description</label>
                <input id={`d-${r.key}`} value={r.description} onChange={(e) => patch(i, { description: e.target.value })} className={inputCls} />
              </div>
              <div>
                <label htmlFor={`m-${r.key}`} className="mb-1 block text-xs font-medium text-muted">Marks</label>
                <input
                  id={`m-${r.key}`}
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  value={Number.isFinite(r.marks) ? r.marks : ""}
                  onChange={(e) => patch(i, { marks: e.target.value === "" ? NaN : Number(e.target.value) })}
                  className={inputCls}
                />
              </div>
              <div>
                <label htmlFor={`t-${r.key}`} className="mb-1 block text-xs font-medium text-muted">Type</label>
                <select id={`t-${r.key}`} value={r.type} onChange={(e) => patch(i, { type: e.target.value as StepType })} className={inputCls}>
                  {STEP_TYPES.map((t) => (
                    <option key={t} value={t}>{STEP_TYPE_LABEL[t]}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-3">
              <label htmlFor={`e-${r.key}`} className="mb-1 block text-xs font-medium text-muted">Expected</label>
              <input id={`e-${r.key}`} value={r.expected} onChange={(e) => patch(i, { expected: e.target.value })} className={inputCls} />
            </div>
          </li>
        ))}
      </ol>

      {rows.length === 0 && (
        <p className="rounded-xl border border-dashed border-line p-6 text-center text-sm text-muted">No steps yet. Add one below.</p>
      )}

      <button type="button" onClick={() => edit([...rows, blank()])} className={`${btnGhost} mt-3`}>
        + Add step
      </button>

      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-lg font-semibold" aria-live="polite">
            Total: {total} marks
          </p>
          <div className="flex gap-2">
            <button type="button" onClick={() => void save()} disabled={!dirty || !valid || busy !== null} className={btnGhost}>
              {busy === "save" ? "Saving…" : "Save"}
            </button>
            <button type="button" onClick={() => void confirm()} disabled={confirmed || !valid || busy !== null} className={btnPrimary}>
              {busy === "confirm" ? "Confirming…" : "Confirm rubric"}
            </button>
          </div>
        </div>
        {actionError && (
          <div className="mt-3">
            <ErrorNotice title="That did not work" message={actionError} />
          </div>
        )}
        {confirmed && (
          <p className="mt-2 text-sm">
            <Link href="/answer" className="font-medium text-accent underline">Answer this question →</Link>
          </p>
        )}
      </div>
    </div>
  );
}
