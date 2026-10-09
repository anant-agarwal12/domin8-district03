"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { useLoad } from "@/lib/useLoad";
import type { Attempt, DnaEntry, LearnerProfile, Question } from "@/lib/types";
import { usePersona } from "@/lib/demo";
import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./ErrorNotice";
import { DnaBars } from "./DnaBars";
import { BookIcon, CameraIcon, PenIcon, QuestionIcon } from "./Icons";
import { EmptyState, Loading } from "./states";

type Data = { attempts: Attempt[]; topics: Map<string, string>; profile: LearnerProfile };

// "/" is the student home. Teachers and faculty go to their own starting screen.
export function Home() {
  const { profile } = useAuth();
  const router = useRouter();
  const persona = usePersona();
  const isStudent = profile?.role === "student";

  useEffect(() => {
    if (profile && !isStudent) router.replace(persona === "faculty" ? "/faculty" : "/teacher");
  }, [profile, isStudent, persona, router]);

  return isStudent ? <StudentHome /> : <Loading />;
}

function StudentHome() {
  const { profile } = useAuth();
  const uid = profile?.uid ?? "";
  const { data, error, retry } = useLoad<Data>(uid, async () => {
    const [list, learner] = await Promise.all([api.listAttempts(uid), api.getProfile()]);
    const ids = [...new Set(list.items.map((a) => a.questionId))];
    const questions: Question[] = await Promise.all(ids.map((id) => api.getQuestion(id)));
    return {
      attempts: list.items,
      topics: new Map(questions.map((q) => [q.id, q.topic])),
      profile: learner,
    };
  });

  if (error) return <ErrorNotice title="Could not load your home page" message={error} onRetry={retry} />;
  if (!data) return <Loading label="Loading your home page…" />;

  const first = profile?.name.split(" ")[0] ?? "there";
  const { attempts, topics, profile: learner } = data;

  return (
    <div className="grid gap-12 lg:grid-cols-[1.25fr_1fr]">
      <div className="space-y-12">
        <header>
          <p className="text-muted">Hi {first}.</p>
          <h1 className="mt-1 text-3xl sm:text-4xl">
            <Countdown profile={learner} />
          </h1>
        </header>

        <section aria-labelledby="doubt">
          <h2 id="doubt" className="text-2xl">
            Stuck on something?
          </h2>
          <ul className="mt-3 divide-y divide-line border-y border-line">
            <ActionRow
              href="/examiner"
              icon={<CameraIcon />}
              title="Snap your handwritten answer"
              body="Photograph it, check we read it right, and get it marked step by step."
            />
            <ActionRow
              href="/ask"
              icon={<QuestionIcon />}
              title="Ask a doubt in your own words"
              body="We decide whether an explanation, practice or a teacher is quickest, and tell you why."
            />
            <ActionRow
              href="/reader"
              icon={<BookIcon />}
              title="Ask while you read"
              body="Open your notes, select the line that confuses you, and ask about it."
            />
            <ActionRow
              href="/answer"
              icon={<PenIcon />}
              title="Type your answer"
              body="Write one step per line and get the same step-by-step marking."
            />
          </ul>
        </section>

        <section aria-labelledby="recent">
          <div className="flex items-baseline justify-between gap-3">
            <h2 id="recent" className="text-2xl">
              Recent attempts
            </h2>
            <Link href="/attempts" className="text-sm font-medium text-ai underline">
              See all
            </Link>
          </div>
          {attempts.length === 0 ? (
            <div className="mt-3">
              <EmptyState title="No attempts yet">Snap or type an answer to see your marks here.</EmptyState>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {attempts.slice(0, 4).map((a) => (
                <li key={a.id}>
                  <Link
                    href={`/attempts/${encodeURIComponent(a.id)}`}
                    className="flex min-h-16 items-center gap-4 py-3 hover:bg-hl/40"
                  >
                    <span className="hand w-20 shrink-0 text-3xl text-pen tnum">
                      {a.total}/{a.max}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium">{topics.get(a.questionId) ?? "Question"}</span>
                      <span className="block text-sm text-muted">
                        {new Date(a.gradedAt).toLocaleDateString(undefined, { day: "numeric", month: "short" })}
                        {" · "}
                        {a.inputType === "photo" ? "Handwritten" : "Typed"}
                      </span>
                    </span>
                    {a.confidence === "low" && (
                      <span className="shrink-0 rounded-full bg-warn-bg px-2.5 py-1 text-sm font-medium text-warn">
                        Teacher will check
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <MistakeDna entries={learner.mistakeDna} attempts={attempts.length} />
    </div>
  );
}

function Countdown({ profile }: { profile: LearnerProfile }) {
  const days = profile.daysToExam;
  if (days === null || !profile.examDate) return <>Let&apos;s get your marks up.</>;
  const when = new Date(profile.examDate).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });
  const unit = days === 1 ? "day" : "days";
  return (
    <>
      {days} {unit} to your {profile.course} exam.
      <span className="mt-2 block font-sans text-base font-normal text-muted">{when}. Spend them on the marks you are losing.</span>
    </>
  );
}

function ActionRow({ href, icon, title, body }: { href: string; icon: React.ReactNode; title: string; body: string }) {
  return (
    <li>
      <Link href={href} className="flex min-h-20 items-center gap-4 py-4 hover:bg-hl/40">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-accent-ink">{icon}</span>
        <span className="min-w-0">
          <span className="block font-heading text-lg font-semibold">{title}</span>
          <span className="block text-sm text-muted">{body}</span>
        </span>
      </Link>
    </li>
  );
}

function MistakeDna({ entries, attempts }: { entries: DnaEntry[]; attempts: number }) {
  return (
    <section aria-labelledby="dna" className="lg:pt-1">
      <h2 id="dna" className="text-2xl">
        Where your marks go
      </h2>
      <p className="mt-1 text-sm text-muted">Your mistake pattern across {attempts} recent attempts.</p>
      <div className="mt-4">
        <DnaBars entries={entries} />
      </div>
    </section>
  );
}
