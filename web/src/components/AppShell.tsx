"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { BRAND } from "@/lib/brand";
import { DEMO_MODE } from "@/lib/config";
import { usePersona } from "@/lib/demo";
import { useAuth } from "./AuthProvider";
import { ErrorNotice } from "./ErrorNotice";
import { SignInPage } from "./SignInPage";

type NavItem = { href: string; label: string };

const STUDENT_NAV: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/examiner", label: "Snap an answer" },
  { href: "/ask", label: "Ask a doubt" },
  { href: "/attempts", label: "My attempts" },
  { href: "/markleak", label: "Mark-Leak" },
  { href: "/reader", label: "Reading" },
];
const TEACHER_NAV: NavItem[] = [
  { href: "/teacher", label: "Doubt queue" },
  { href: "/questions/new", label: "Questions and rubrics" },
];
const FACULTY_NAV: NavItem[] = [
  { href: "/faculty", label: "Class view" },
  { href: "/questions/new", label: "Questions and rubrics" },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { status, profile, profileError, signOut, reloadProfile } = useAuth();
  const persona = usePersona();

  if (status === "loading") {
    return (
      <div className="grid min-h-dvh place-items-center text-muted" aria-busy="true">
        Loading…
      </div>
    );
  }
  if (status === "signed_out") return <SignInPage />;

  const nav = profile?.role === "student" ? STUDENT_NAV : persona === "faculty" ? FACULTY_NAV : TEACHER_NAV;
  const roleLabel = DEMO_MODE && persona ? persona : profile?.role;

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-md focus:bg-surface focus:px-3 focus:py-2"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-20 border-b border-line bg-paper/95 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-5xl items-center justify-between gap-3 px-4">
          <Link href="/" className="flex items-baseline gap-0.5 whitespace-nowrap font-heading text-2xl font-semibold tracking-tight text-navy">
            {BRAND}
            <span className="size-1.5 rounded-full bg-accent" aria-hidden />
          </Link>
          <div className="flex min-w-0 items-center gap-3">
            {profile && (
              <p className="min-w-0 truncate text-sm">
                <span className="font-medium">{profile.name}</span>
                {roleLabel && <span className="ml-2 hidden text-muted capitalize sm:inline">{roleLabel}</span>}
              </p>
            )}
            <button
              onClick={() => void signOut()}
              className="min-h-11 shrink-0 whitespace-nowrap rounded-md border border-line bg-surface px-3 text-sm font-medium hover:border-navy/40"
            >
              {DEMO_MODE ? "Switch persona" : "Sign out"}
            </button>
          </div>
        </div>
        <nav className="mx-auto flex w-full max-w-5xl gap-1 overflow-x-auto px-3 pb-1" aria-label="Main">
          <Suspense fallback={<NavLinks items={nav} pathname={null} />}>
            <ActiveNavLinks items={nav} />
          </Suspense>
        </nav>
      </header>
      <main id="main" className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-24">
        {profileError ? (
          <ErrorNotice
            title="Could not load your profile"
            message={profileError}
            onRetry={() => void reloadProfile()}
          />
        ) : profile ? (
          children
        ) : (
          <p className="text-muted" aria-busy="true">
            Loading your profile…
          </p>
        )}
      </main>
    </div>
  );
}

// usePathname() is runtime data, so the active-link version streams in behind Suspense.
function ActiveNavLinks({ items }: { items: NavItem[] }) {
  return <NavLinks items={items} pathname={usePathname()} />;
}

function NavLinks({ items, pathname }: { items: NavItem[]; pathname: string | null }) {
  return (
    <>
      {items.map((n) => {
        const active = pathname !== null && (n.href === "/" ? pathname === "/" : pathname.startsWith(n.href));
        return (
          <Link
            key={n.href}
            href={n.href}
            aria-current={active ? "page" : undefined}
            className={`shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium ${
              active ? "border-accent text-navy" : "border-transparent text-muted hover:text-navy"
            }`}
          >
            {n.label}
          </Link>
        );
      })}
    </>
  );
}
