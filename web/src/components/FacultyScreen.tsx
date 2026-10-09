"use client";

import Link from "next/link";
import { api } from "@/lib/api";
import { ERROR_LABEL } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { ClassView } from "@/lib/types";
import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./ErrorNotice";
import { PageHeader } from "./Page";
import { EmptyState, Loading, btnPrimary } from "./states";

// K. Faculty class view: where the whole class loses marks (topic by mistake type) and what the papers ask most.
export function FacultyScreen() {
  const { profile } = useAuth();
  const course = profile?.course ?? "";
  const { data, error, retry } = useLoad<ClassView>(course, () => api.classView(course));

  if (profile?.role === "student") {
    return <EmptyState title="This page is for faculty">Your own marks are in the Mark-Leak Report.</EmptyState>;
  }
  if (error) return <ErrorNotice title="Could not load the class view" message={error} onRetry={retry} />;
  if (!data) return <Loading label="Adding up the class…" />;

  // The single biggest cell: where one session would help the most students.
  let top = { t: 0, e: 0, n: -1 };
  data.cells.forEach((row, t) => row.forEach((n, e) => n > top.n && (top = { t, e, n })));
  const max = Math.max(1, ...data.cells.flat());

  return (
    <div>
      <PageHeader title="Where the class loses marks" back={{ href: "/teacher", label: "Doubt queue" }} />
      <p className="max-w-[62ch] text-lg">
        {data.course}, {data.studentCount} students. The biggest gap is{" "}
        <span className="font-medium">
          {ERROR_LABEL[data.errorTypes[top.e]].toLowerCase()} in {data.topics[top.t]}
        </span>{" "}
        (<span className="tnum">{top.n}</span> lost-mark steps). One session there reaches the most students.
      </p>

      <section aria-labelledby="heat" className="mt-8">
        <h2 id="heat" className="text-2xl">
          Mistake map
        </h2>
        <p className="mt-1 text-sm text-muted">Each number counts lost-mark steps across the class. Darker means more.</p>
        <div className="mt-3 overflow-x-auto rounded-md border border-line bg-surface">
          <table className="w-full min-w-[640px] border-collapse text-sm">
            <caption className="sr-only">Lost-mark steps by topic and mistake type</caption>
            <thead>
              <tr>
                <th scope="col" className="p-3 text-left font-medium">
                  Topic
                </th>
                {data.errorTypes.map((e) => (
                  <th key={e} scope="col" className="p-3 text-center font-medium">
                    {ERROR_LABEL[e]}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {data.topics.map((topic, t) => (
                <tr key={topic} className="border-t border-line">
                  <th scope="row" className="p-3 text-left font-medium">
                    {topic}
                  </th>
                  {data.cells[t].map((n, e) => {
                    const strength = n / max;
                    return (
                      <td
                        key={e}
                        className="p-3 text-center font-semibold tnum"
                        style={{
                          backgroundColor: `rgba(194, 65, 12, ${0.06 + strength * 0.78})`,
                          color: strength > 0.45 ? "#ffffff" : "#14213d",
                          outline: t === top.t && e === top.e ? "2px solid #14213d" : undefined,
                          outlineOffset: -2,
                        }}
                      >
                        {n}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="mt-10 grid gap-10 md:grid-cols-[1.2fr_1fr]">
        <section aria-labelledby="pyq">
          <h2 id="pyq" className="text-2xl">
            What the papers ask most
          </h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {data.topPyqTopics.map((p) => (
              <li key={p.topic} className="py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-medium">{p.topic}</span>
                  <span className="text-sm tnum">{p.sharePct}% of marks</span>
                </div>
                <div className="mt-1 h-2 rounded-sm bg-line" role="img" aria-label={`${p.sharePct} percent of paper marks`}>
                  <div className="h-2 rounded-sm bg-ai" style={{ width: `${Math.min(100, p.sharePct * 3)}%` }} />
                </div>
                <p className="mt-1 text-sm text-muted">
                  {p.count} questions, in {p.years.join(", ")}
                </p>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="rub">
          <h2 id="rub" className="text-2xl">
            Your rubrics
          </h2>
          <p className="mt-2 text-muted">
            Every mark in the Examiner comes from a rubric you confirm. Add a question, check the steps, confirm.
          </p>
          <Link href="/questions/new" className={`${btnPrimary} mt-4 inline-block min-h-12`}>
            Manage questions and rubrics
          </Link>
        </section>
      </div>
    </div>
  );
}
