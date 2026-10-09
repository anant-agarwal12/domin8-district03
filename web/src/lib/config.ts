// Every runtime switch in one place. Components never read process.env directly.
export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
export const USE_MOCKS = process.env.NEXT_PUBLIC_USE_MOCKS === "true";

// Demo mode (persona picker instead of Google sign-in) only makes sense on mock data.
export const DEMO_MODE = USE_MOCKS && process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const delay = Number(process.env.NEXT_PUBLIC_MOCK_DELAY_MS);
export const MOCK_DELAY_MS = Number.isFinite(delay) && delay >= 0 && process.env.NEXT_PUBLIC_MOCK_DELAY_MS ? delay : 600;
