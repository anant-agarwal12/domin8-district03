"use client";

import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { api } from "@/lib/api";
import { DEMO_MODE } from "@/lib/config";
import { msg } from "@/lib/labels";
import { useLoad } from "@/lib/useLoad";
import type { Doc, Highlight, PageNotes } from "@/lib/types";
import { ErrorNotice } from "./ErrorNotice";
import { AlertIcon } from "./Icons";
import { MathText } from "./Math";
import { PageHeader } from "./Page";
import { Loading, btnGhost, btnPrimary } from "./states";

const PdfPage = dynamic(() => import("./PdfPage"), {
  ssr: false,
  loading: () => <p className="p-6 text-muted">Opening the notes…</p>,
});

const NOTES_FILE = "/demo/notes.pdf";
const MAX_PAGE_WIDTH = 560;

type PageData = { notes: PageNotes; highlights: Highlight[] };

// J. Co-Reader: the page beside AI notes, past-paper highlights, "Ask about this", and a stuck nudge.
export function ReaderScreen() {
  const params = useSearchParams();
  const docId = params.get("doc") ?? "d_notes_1";
  const start = Math.max(1, Number(params.get("page")) || 1);
  const [page, setPage] = useState(start);

  const doc = useLoad<Doc>(docId, () => api.getDocument(docId));
  const data = useLoad<PageData>(`${docId}:${page}`, async () => {
    const [notes, highlights] = await Promise.all([api.pageNotes(docId, page), api.pageHighlights(docId, page)]);
    return { notes, highlights: highlights.items };
  });

  if (doc.error) return <ErrorNotice title="Could not open these notes" message={doc.error} onRetry={doc.retry} />;
  if (!doc.data) return <Loading label="Opening the notes…" />;
  return <Reader doc={doc.data} docId={docId} page={Math.min(page, doc.data.pages)} setPage={setPage} data={data} />;
}

function Reader({
  doc,
  docId,
  page,
  setPage,
  data,
}: {
  doc: Doc;
  docId: string;
  page: number;
  setPage: (n: number) => void;
  data: { data: PageData | null; error: string | null; retry: () => void };
}) {
  const router = useRouter();
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(MAX_PAGE_WIDTH);
  const [pages, setPages] = useState(doc.pages);
  const [selected, setSelected] = useState("");
  const [nudge, setNudge] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const el = frame.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(Math.min(MAX_PAGE_WIDTH, Math.floor(entry.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const pageData = data.data;
  const phrases = useMemo(() => pageData?.highlights.map((h) => h.text) ?? [], [pageData]);

  function readSelection() {
    const text = window.getSelection()?.toString().replace(/\s+/g, " ").trim() ?? "";
    setSelected(text.length >= 3 ? text.slice(0, 160) : "");
  }

  async function ask(source: "manual" | "stuck", text: string) {
    setBusy(true);
    setError(null);
    try {
      const doubt = await api.createDoubt({
        source,
        text,
        docId,
        page,
        ...(source === "stuck" ? { signal: "dwell" as const } : {}),
      });
      router.push(`/doubts/${encodeURIComponent(doubt.id)}`);
    } catch (e) {
      setError(msg(e));
      setBusy(false);
    }
  }

  const go = (n: number) => {
    setSelected("");
    setNudge(false);
    setPage(Math.min(Math.max(n, 1), pages));
  };

  return (
    <div>
      <PageHeader title="Reading" back={{ href: "/", label: "Home" }} />
      <p className="-mt-3 mb-5 text-muted">{doc.title}</p>

      <div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <section aria-label={`Page ${page} of the notes`}>
          <div
            ref={frame}
            onMouseUp={readSelection}
            onKeyUp={readSelection}
            onTouchEnd={() => setTimeout(readSelection, 50)}
            className="overflow-hidden rounded-md border border-line bg-white"
          >
            <PdfPage file={NOTES_FILE} page={page} width={width} phrases={phrases} onPages={setPages} />
          </div>
          <nav className="mt-3 flex items-center justify-between gap-3" aria-label="Pages">
            <button type="button" onClick={() => go(page - 1)} disabled={page <= 1} className={`${btnGhost} min-h-11`}>
              Previous page
            </button>
            <p className="text-sm text-muted tnum" aria-live="polite">
              Page {page} of {pages}
            </p>
            <button type="button" onClick={() => go(page + 1)} disabled={page >= pages} className={`${btnGhost} min-h-11`}>
              Next page
            </button>
          </nav>
        </section>

        <div className="space-y-8">
          {selected && (
            <section aria-label="Ask about the selected text" className="rounded-md border border-ai/40 bg-ai-bg p-4">
              <p className="text-sm text-muted">You selected</p>
              <p className="mt-1 font-heading text-lg italic">&ldquo;{selected}&rdquo;</p>
              <button
                type="button"
                disabled={busy}
                onClick={() => void ask("manual", `I am stuck on "${selected}" on page ${page} of ${doc.title}.`)}
                className={`${btnPrimary} mt-3 min-h-11`}
              >
                {busy ? "Sending…" : "Ask about this"}
              </button>
            </section>
          )}

          {nudge && (
            <section role="status" aria-label="Stuck nudge" className="rounded-md border border-warn/40 bg-warn-bg p-4 text-warn">
              <p className="flex items-center gap-2 font-semibold">
                <AlertIcon className="size-5" /> Stuck on this page?
              </p>
              <p className="mt-1 text-sm">You have been on page {page} for a while. Want a hand with it?</p>
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void ask("stuck", `I seem to be stuck on page ${page} of ${doc.title}.`)}
                  className={`${btnPrimary} min-h-11`}
                >
                  Ask about this page
                </button>
                <button type="button" onClick={() => setNudge(false)} className={`${btnGhost} min-h-11`}>
                  I am fine
                </button>
              </div>
            </section>
          )}

          {error && <ErrorNotice title="Could not send your question" message={error} />}

          {data.error ? (
            <ErrorNotice title="Could not load the notes for this page" message={data.error} onRetry={data.retry} />
          ) : !data.data ? (
            <Loading label="Reading the page…" />
          ) : (
            <>
              <section aria-labelledby="notes-h">
                <h2 id="notes-h" className="text-xl">
                  Notes for this page
                </h2>
                <p className="mt-1 text-sm text-muted">
                  Written from the page itself. {data.data.notes.cached ? "Ready instantly." : "Freshly written."}
                </p>
                <ul className="mt-3 space-y-3">
                  {data.data.notes.notes.map((n) => (
                    <li key={n.id} className="border-l-4 border-ai pl-4">
                      <MathText text={n.text} />
                    </li>
                  ))}
                </ul>
              </section>

              <section aria-labelledby="pyq-h">
                <h2 id="pyq-h" className="text-xl">
                  In past papers
                </h2>
                {data.data.highlights.length === 0 ? (
                  <p className="mt-2 text-sm text-muted">Nothing on this page has come up in past papers.</p>
                ) : (
                  <>
                    <p className="mt-1 text-sm text-muted">These phrases are highlighted on the page.</p>
                    <ul className="mt-3 divide-y divide-line border-y border-line">
                      {data.data.highlights.map((h) => (
                        <li key={h.id} className="py-3">
                          <p className="flex flex-wrap items-center gap-x-3 gap-y-1">
                            <mark className="pyq-hl font-mono text-sm">{h.text}</mark>
                            <span className="text-sm font-medium tnum">{h.pyqYears.join(", ")}</span>
                          </p>
                          <p className="mt-0.5 text-sm text-muted">{h.reason}</p>
                        </li>
                      ))}
                    </ul>
                  </>
                )}
              </section>
            </>
          )}

          {DEMO_MODE && !nudge && (
            <section aria-label="Demo control" className="border-t border-line pt-4">
              <p className="text-sm text-muted">
                Real stuck detection (time on the page, flipping back, re-selecting) arrives later. For the demo:
              </p>
              <button type="button" onClick={() => setNudge(true)} className={`${btnGhost} mt-2 min-h-11`}>
                Pretend I am stuck on this page
              </button>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
