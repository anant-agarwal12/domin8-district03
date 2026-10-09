"use client";

import { useRouter } from "next/navigation";
import { BRAND, TAGLINE } from "@/lib/brand";
import { DEMO_MODE } from "@/lib/config";
import { PERSONAS } from "@/lib/demo";
import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./ErrorNotice";
import { PersonIcon } from "./Icons";

// Landing page. In demo mode it also hosts the persona picker; otherwise it offers Google sign-in.
export function SignInPage() {
  const { signIn, signInError, choosePersona } = useAuth();
  const router = useRouter();

  return (
    <main className="mx-auto grid min-h-dvh w-full max-w-5xl content-center gap-10 px-5 py-12 pb-24 lg:grid-cols-[1.1fr_1fr] lg:gap-14">
      <div className="flex flex-col justify-center">
        <p className="font-heading text-2xl font-semibold text-accent">{BRAND}</p>
        <h1 className="mt-4 max-w-[16ch] text-4xl sm:text-5xl">{TAGLINE}</h1>
        <p className="mt-5 max-w-[46ch] text-lg text-muted">
          Photograph a handwritten answer. {BRAND} marks it step by step against your faculty&apos;s own rubric, shows
          exactly where the marks went, and sends the hard doubts to a teacher.
        </p>

        {signInError && (
          <div className="mt-6">
            <ErrorNotice title="Could not sign in" message={signInError} />
          </div>
        )}

        {DEMO_MODE && choosePersona ? (
          <section aria-labelledby="who" className="mt-8">
            <h2 id="who" className="text-xl">
              Walk through the demo as
            </h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {PERSONAS.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    onClick={() => {
                      choosePersona(p.id);
                      router.push(p.home);
                    }}
                    className="group flex min-h-16 w-full items-center gap-4 py-3 text-left hover:bg-hl/40"
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-line bg-surface text-navy">
                      <PersonIcon />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-heading text-lg font-semibold">
                        {p.name} <span className="font-sans text-sm font-normal text-muted">{p.title}</span>
                      </span>
                      <span className="block text-sm text-muted">{p.blurb}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        ) : (
          <button
            onClick={() => void signIn()}
            className="mt-8 flex min-h-12 w-full max-w-xs items-center justify-center rounded-lg bg-accent px-5 font-semibold text-accent-ink hover:brightness-95 active:brightness-90"
          >
            Continue with Google
          </button>
        )}
      </div>

      <MarkedScript />
    </main>
  );
}

// A small static specimen of the product's signature: a student's answer marked step by step.
function MarkedScript() {
  const rows: { text: string; mark: string; note?: string; lost?: boolean }[] = [
    { text: "Given: m = 2, v = 3", mark: "2/2" },
    { text: "E = ½ (2)(3)²", mark: "0/2", note: "write the formula first", lost: true },
    { text: "E = 9", mark: "2/2" },
    { text: "Answer: 9", mark: "0/2", note: "unit?", lost: true },
  ];
  return (
    <figure className="self-center" aria-label="Example of a marked answer">
      <div className="rounded-md border border-line bg-surface p-5">
        <p className="text-sm text-muted">A body of mass 2 kg moves at 3 m/s. Find its kinetic energy.</p>
        <ul className="ruled mt-3">
          {rows.map((r) => (
            <li key={r.text} className="grid h-9 grid-cols-[1fr_auto] items-center gap-3">
              <span className="truncate font-hand text-2xl text-navy">{r.text}</span>
              <span className={`hand flex items-baseline gap-2 text-xl ${r.lost ? "text-pen" : "text-ok"}`}>
                {r.note && <span className="text-base">{r.note}</span>}
                <span className="tnum">{r.mark}</span>
              </span>
            </li>
          ))}
        </ul>
        <p className="hand mt-4 text-right text-3xl text-pen">
          <span className="tnum">6 / 10</span>
        </p>
      </div>
      <figcaption className="mt-2 text-sm text-muted">Every lost mark says why, and how to get it back.</figcaption>
    </figure>
  );
}
