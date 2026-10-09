"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { onAuthStateChanged, signInWithPopup, signOut as fbSignOut } from "firebase/auth";
import { api } from "@/lib/api";
import { DEMO_MODE } from "@/lib/config";
import { setPersona, usePersona, type Persona } from "@/lib/demo";
import { auth, firebaseConfigured, googleProvider } from "@/lib/firebase";
import type { User } from "@/lib/types";

type Status = "loading" | "signed_out" | "signed_in";

type AuthState = {
  status: Status;
  profile: User | null; // from GET /me
  profileError: string | null;
  signInError: string | null;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
  // Demo mode only: sign in as a persona. Undefined when demo mode is off.
  choosePersona?: (p: Persona) => void;
};

const AuthContext = createContext<AuthState | null>(null);

const message = (e: unknown) => (e instanceof Error ? e.message : "Something went wrong.");

export function AuthProvider({ children }: { children: ReactNode }) {
  const persona = usePersona(); // undefined until the browser has been read
  const [firebaseStatus, setFirebaseStatus] = useState<Status>(firebaseConfigured ? "loading" : "signed_out");
  const [profile, setProfile] = useState<User | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [signInError, setSignInError] = useState<string | null>(
    firebaseConfigured || DEMO_MODE
      ? null
      : "Firebase is not configured. Set the NEXT_PUBLIC_FIREBASE_* variables in web/.env.local.",
  );

  const status: Status = DEMO_MODE
    ? persona === undefined
      ? "loading"
      : persona
        ? "signed_in"
        : "signed_out"
    : firebaseStatus;

  const reloadProfile = useCallback(async () => {
    try {
      const me = await api.getMe();
      setProfile(me);
      setProfileError(null);
    } catch (e) {
      setProfile(null);
      setProfileError(message(e));
    }
  }, []);

  // Demo mode: the profile follows the chosen persona.
  useEffect(() => {
    if (!DEMO_MODE || !persona) return;
    let alive = true;
    api.getMe().then(
      (me) => {
        if (!alive) return;
        setProfile(me);
        setProfileError(null);
      },
      (e) => {
        if (!alive) return;
        setProfile(null);
        setProfileError(message(e));
      },
    );
    return () => {
      alive = false;
    };
  }, [persona]);

  useEffect(() => {
    if (DEMO_MODE || !auth) return;
    return onAuthStateChanged(auth, (fbUser) => {
      if (!fbUser) {
        setProfile(null);
        setProfileError(null);
        setFirebaseStatus("signed_out");
        return;
      }
      setFirebaseStatus("signed_in");
      void reloadProfile();
    });
  }, [reloadProfile]);

  const signIn = useCallback(async () => {
    if (!auth) return;
    setSignInError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      const code = (e as { code?: string }).code;
      if (code === "auth/popup-closed-by-user" || code === "auth/cancelled-popup-request") return;
      setSignInError(message(e));
    }
  }, []);

  const signOut = useCallback(async () => {
    if (DEMO_MODE) setPersona(null);
    else if (auth) await fbSignOut(auth);
  }, []);

  // With no persona chosen there is no signed-in user, whatever an earlier persona left behind.
  const signedOutDemo = DEMO_MODE && !persona;

  const value = useMemo<AuthState>(
    () => ({
      status,
      profile: signedOutDemo ? null : profile,
      profileError: signedOutDemo ? null : profileError,
      signInError,
      signIn,
      signOut,
      reloadProfile,
      choosePersona: DEMO_MODE ? (p: Persona) => setPersona(p) : undefined,
    }),
    [status, signedOutDemo, profile, profileError, signInError, signIn, signOut, reloadProfile],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
