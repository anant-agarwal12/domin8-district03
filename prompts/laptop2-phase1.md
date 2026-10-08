Paste everything below the line into Claude Code on Laptop 2, on branch `web/phase-1` (created from an up-to-date `main`).

---

Phase 1 for the web app. Re-read `CLAUDE.md` and the Phase 1 section of `contracts/api.md`. Work only in `/web`. Keep `NEXT_PUBLIC_USE_MOCKS=true` for this whole phase.

Build:
1. Question create screen: course, topic, text, marks, source, year → `POST /questions`. Then a box to paste a marking scheme or a solved sample, with a kind toggle → `POST /rubrics/extract`.
2. Rubric editor: steps as editable rows (description, marks, type dropdown from the contract's StepType, expected). Add, remove and reorder steps. Live total of marks. A clear "Proposed" vs "Confirmed" badge. Save → `PUT /rubrics/{id}`; Confirm → `POST /rubrics/{id}/confirm`.
3. Answer screen: pick a question with a confirmed rubric; type the answer one line per row (numbered); math between `$...$` renders with KaTeX as a live preview. Submit → `POST /attempts/grade`.
4. Result screen (this is the demo's hero, make it excellent): big total like "6 / 10" in a red-pen style circle; one row per rubric step with marks awarded / max, the reason, the error type as a readable label, and the fix; the matched answer lines highlighted when a step is hovered or tapped. If confidence is low, a clear banner with `confidenceReason` saying a teacher will check it.
5. A "My attempts" list from `GET /attempts?uid=`.
6. Loading, empty and error states on every screen.

Before writing code: list the screens and components you will create and wait for my "go".

Done when (show me screenshots or a short description of each):
- `npm run build` succeeds with no type errors.
- `mocks/attempt_graded.json` renders as 6 / 10 with two lost-mark rows (formula, units) and correct reasons.
- `mocks/attempt_low_confidence.json` shows the low-confidence banner.
- `mocks/rubric_proposed.json` loads in the editor, edits change the live total, and confirm switches the badge.
- Everything is usable on a phone-width screen.

Then stop and give me the commit message: `phase-1(web): question and rubric editor, typed answer, step-wise result screen`.
