import Link from "next/link";
import { AppShell } from "@/components/AppShell";

const CARDS = [
  { href: "/questions/new", title: "New question", body: "Add a question and build its rubric." },
  { href: "/answer", title: "Answer a question", body: "Type your answer and get step-wise marks." },
  { href: "/attempts", title: "My attempts", body: "Review past answers and where marks were lost." },
];

export default function Home() {
  return (
    <AppShell>
      <div className="grid gap-4 sm:grid-cols-3">
        {CARDS.map((c) => (
          <Link
            key={c.href}
            href={c.href}
            className="rounded-2xl border border-line bg-surface p-5 shadow-sm hover:border-navy/30"
          >
            <h2 className="font-semibold">{c.title}</h2>
            <p className="mt-1 text-sm text-muted">{c.body}</p>
          </Link>
        ))}
      </div>
    </AppShell>
  );
}
