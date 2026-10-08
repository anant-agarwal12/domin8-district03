Paste everything below the line into Claude Code on Laptop 2, opened in the repo root, on branch `web/phase-0`.

---

You are the frontend engineer for Team DOMIN8. Read `CLAUDE.md` and `contracts/api.md` fully before anything else. You work only in `/web`.

Task: Phase 0 for the web app.

Build:
1. A Next.js app (App Router, TypeScript, Tailwind) inside `/web`, using the current stable create-next-app. `src/` directory layout.
2. `web/src/lib/types.ts`: TypeScript types copied exactly from `contracts/api.md` (User, Question, Rubric, RubricStep, Attempt, StepResult, AnswerLine, ErrorType, the error shape).
3. `web/src/mocks/`: copies of every file in `contracts/mocks/`. Add a small npm script `sync-mocks` that copies them again, since `contracts/mocks` is the source of truth.
4. `web/src/lib/api.ts`: one client for every endpoint in the contract. If `NEXT_PUBLIC_USE_MOCKS=true` it returns the matching mock after a short delay; otherwise it calls `NEXT_PUBLIC_API_URL` with `Authorization: Bearer <Firebase ID token>`. Parse the contract's error shape into a typed error.
5. Firebase client setup from the `NEXT_PUBLIC_FIREBASE_*` env vars, Google sign-in and sign-out, and an auth context.
6. App shell: a top bar with the product name placeholder "xyz", the signed-in user's name and role from `GET /me`, and a sign-out button. Signed-out users see a sign-in page.
7. A clean, calm visual base we will reuse: a warm off-white background, deep navy text, one orange accent. Make it look good on a phone too.

Before writing code: list the files you will create and wait for my "go".

Done when (show me evidence of each):
- `npm run build` succeeds with no type errors.
- Google sign-in works in the browser and the shell shows the mock `/me` user.
- With `NEXT_PUBLIC_USE_MOCKS=false` and no API running, the app shows a readable error instead of crashing.

Then stop. Do not commit; tell me the exact commit message to use: `phase-0(web): next.js shell, firebase sign-in, mock-aware api client`.
