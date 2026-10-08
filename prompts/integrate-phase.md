Paste below the line into Claude Code on Laptop 2 after Laptop 1 has merged `api/phase-N` into `main`, and you have pulled `main` and merged `web/phase-N` into it. Replace N.

---

Integration for phase N. Re-read `CLAUDE.md`. The API for this phase is on `main` now.

1. Make sure `api/.env` and `web/.env.local` exist (I created them from the examples with our real keys). Tell me if anything is missing; never print key values.
2. Start the API (`cd api`, activate the venv, `uvicorn app.main:app --reload --port 8000`) and the web app with `NEXT_PUBLIC_USE_MOCKS=false`.
3. Walk through every phase N screen against the real API. For any mismatch between what the API returns and `contracts/api.md`, do NOT patch around it in the web app: stop and tell me which side breaks the contract, so the right laptop fixes it.
4. Run the phase N integration check from the table in `CLAUDE.md` and show me the result.

When it passes, tell me the commit message: `phase-N: integrate api and web`.
