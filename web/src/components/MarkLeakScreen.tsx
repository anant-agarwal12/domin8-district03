"use client";

import Link from "next/link";
import { Bar, BarChart, CartesianGrid, LabelList, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "@/lib/api";
import { ERROR_LABEL } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { MarkLeak } from "@/lib/types";
import { ErrorNotice } from "./ErrorNotice";
import { PageHeader } from "./Page";
import { Loading } from "./states";

const ORANGE = "#c2410c";
const GREEN = "#17703a";
const NAVY = "#14213d";
const LINE = "#e2d9c6";

const shortDate = (d: string) => new Date(`${d}T00:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

// I. Mark-Leak Report: where the marks went, by error type and by topic, the trend, and the one fix worth most.
export function MarkLeakScreen() {
  const { data, error, retry } = useLoad<MarkLeak>("markleak", () => api.markLeak());

  if (error) return <ErrorNotice title="Could not build your report" message={error} onRetry={retry} />;
  if (!data) return <Loading label="Adding up your marks…" />;

  const pct = data.totalMax > 0 ? Math.round((data.totalLost / data.totalMax) * 100) : 0;
  const byError = data.byErrorType.map((e) => ({ name: ERROR_LABEL[e.errorType], lost: e.marksLost }));
  const byTopic = data.byTopic.map((t) => ({ name: t.topic, lost: t.marksLost }));
  const trend = data.trend.map((t) => ({ date: shortDate(t.date), score: Math.round((t.total / t.max) * 100), total: t.total, max: t.max }));

  return (
    <div className="mx-auto max-w-4xl">
      <PageHeader title="Mark-Leak Report" back={{ href: "/", label: "Home" }} />
      <p className="max-w-[60ch] text-xl">
        You lost <span className="hand text-3xl text-pen tnum">{data.totalLost}</span> of{" "}
        <span className="tnum">{data.totalMax}</span> marks ({pct}%) across {data.trend.length} attempts. Most of it is
        fixable.
      </p>

      <section aria-labelledby="fix" className="mt-8 border-y border-line py-6">
        <h2 id="fix" className="text-2xl">
          The fix worth the most
        </h2>
        <p className="mt-2 max-w-[58ch] text-lg">
          <span className="font-medium">
            {ERROR_LABEL[data.topFix.errorType]} in {data.topFix.topic}.
          </span>{" "}
          <span className="hand text-2xl text-pen">{data.topFix.advice}</span>
        </p>
        <p className="mt-2 text-muted">
          Worth about <span className="tnum">{data.topFix.marksRecoverable}</span> marks back.{" "}
          <Link href="/examiner" className="font-medium text-ai underline">
            Try it on your next answer
          </Link>
        </p>
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-2">
        <Chart title="Marks lost by mistake type" label="Bar chart: marks lost by mistake type" rows={byError}>
          <LossBars data={byError} />
        </Chart>
        <Chart title="Marks lost by topic" label="Bar chart: marks lost by topic" rows={byTopic}>
          <LossBars data={byTopic} />
        </Chart>
      </div>

      <section aria-labelledby="trend" className="mt-10">
        <h2 id="trend" className="text-xl">
          Your score over time
        </h2>
        <figure role="img" aria-label="Line chart: score of each attempt, as a percentage" className="mt-3">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trend} margin={{ top: 12, right: 24, bottom: 4, left: 0 }}>
                <CartesianGrid stroke={LINE} vertical={false} />
                <XAxis dataKey="date" tick={{ fill: NAVY, fontSize: 12 }} stroke={LINE} />
                <YAxis domain={[0, 100]} unit="%" tick={{ fill: NAVY, fontSize: 12 }} stroke={LINE} width={44} />
                <Tooltip formatter={(v) => [`${v}%`, "Score"]} />
                <Line type="monotone" dataKey="score" stroke={GREEN} strokeWidth={2.5} dot={{ r: 4, fill: GREEN }} isAnimationActive={false}>
                  <LabelList dataKey="score" position="top" formatter={(v) => `${v}%`} style={{ fill: NAVY, fontSize: 12 }} />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
        </figure>
        <table className="sr-only">
          <caption>Score of each attempt</caption>
          <thead>
            <tr>
              <th>Date</th>
              <th>Marks</th>
            </tr>
          </thead>
          <tbody>
            {trend.map((t, i) => (
              <tr key={i}>
                <td>{t.date}</td>
                <td>
                  {t.total} of {t.max}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Chart({
  title,
  label,
  rows,
  children,
}: {
  title: string;
  label: string;
  rows: { name: string; lost: number }[];
  children: React.ReactNode;
}) {
  return (
    <section aria-label={title}>
      <h2 className="text-xl">{title}</h2>
      <figure role="img" aria-label={label} className="mt-3">
        {children}
      </figure>
      {/* The same numbers as text, for screen readers. */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th>Name</th>
            <th>Marks lost</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.lost}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

// Horizontal bars with the number on the bar, so the chart never relies on colour alone.
function LossBars({ data }: { data: { name: string; lost: number }[] }) {
  return (
    <div style={{ height: data.length * 44 + 28 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 36, bottom: 4, left: 0 }}>
          <CartesianGrid stroke={LINE} horizontal={false} />
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey="name" width={112} tick={{ fill: NAVY, fontSize: 13 }} stroke={LINE} />
          <Bar dataKey="lost" fill={ORANGE} radius={[0, 3, 3, 0]} isAnimationActive={false}>
            <LabelList dataKey="lost" position="right" formatter={(v) => `−${v}`} style={{ fill: ORANGE, fontSize: 14, fontWeight: 600 }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
