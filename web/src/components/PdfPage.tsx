"use client";

// One PDF page with a selectable text layer. Loaded with next/dynamic and ssr: false (pdf.js needs the browser).
// The worker is set in this same module, as react-pdf requires.
import { useEffect, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/TextLayer.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const escapeHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// pdf.js often splits one printed line into a span per word, so a phrase can span several spans.
// Search the layer's whole text, then wrap each matched stretch in <mark>, span by span. Text is always escaped.
export function highlightTextLayer(root: HTMLElement, phrases: string[]): void {
  const spans = [...root.querySelectorAll<HTMLElement>("span")].filter((s) => s.children.length === 0 || s.querySelector("mark"));
  const plain = spans.map((s) => s.textContent ?? "");
  spans.forEach((s, i) => (s.textContent = plain[i])); // clears marks from an earlier pass
  const full = plain.join("");
  const haystack = full.toLowerCase();

  const hits: [number, number][] = [];
  for (const phrase of phrases.map((p) => p.toLowerCase()).filter(Boolean)) {
    for (let at = haystack.indexOf(phrase); at !== -1; at = haystack.indexOf(phrase, at + phrase.length)) {
      hits.push([at, at + phrase.length]);
    }
  }
  if (hits.length === 0) return;

  let offset = 0;
  spans.forEach((span, i) => {
    const text = plain[i];
    const start = offset;
    offset += text.length;
    const local = hits
      .map(([a, b]) => [Math.max(a, start) - start, Math.min(b, offset) - start] as [number, number])
      .filter(([a, b]) => b > a)
      .sort((x, y) => x[0] - y[0]);
    if (local.length === 0) return;
    let html = "";
    let cursor = 0;
    for (const [a, b] of local) {
      if (b <= cursor) continue;
      const from = Math.max(a, cursor);
      html += escapeHtml(text.slice(cursor, from)) + `<mark class="pyq-hl">${escapeHtml(text.slice(from, b))}</mark>`;
      cursor = b;
    }
    span.innerHTML = html + escapeHtml(text.slice(cursor));
  });
}

export default function PdfPage({
  file,
  page,
  width,
  phrases,
  onPages,
}: {
  file: string;
  page: number;
  width: number;
  phrases: string[];
  onPages: (n: number) => void;
}) {
  const wrap = useRef<HTMLDivElement>(null);

  // pdf.js reports the text layer as rendered before its spans exist, so watch for them to appear.
  // The observer is paused while we edit the layer, so our own changes do not retrigger it.
  useEffect(() => {
    const root = wrap.current;
    if (!root) return;
    let frame = 0;
    const observer = new MutationObserver(() => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(apply);
    });
    function apply() {
      const layer = root?.querySelector<HTMLElement>(".react-pdf__Page__textContent");
      if (!layer || !root) return;
      observer.disconnect();
      highlightTextLayer(layer, phrases);
      observer.observe(root, { childList: true, subtree: true });
    }
    observer.observe(root, { childList: true, subtree: true });
    apply();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [phrases, page]);

  return (
    <div ref={wrap}>
      <Document
        file={file}
        onLoadSuccess={({ numPages }) => onPages(numPages)}
        loading={<p className="p-6 text-muted">Opening the notes…</p>}
        error={<p className="p-6 text-danger">The notes could not be opened.</p>}
      >
        <Page
          pageNumber={page}
          width={width}
          renderAnnotationLayer={false}
          loading={<p className="p-6 text-muted">Drawing page {page}…</p>}
        />
      </Document>
    </div>
  );
}
