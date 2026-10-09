import { expect, test, type Page } from "@playwright/test";

// Walks the demo story in demo mode on mock data and fails on any console error.
// Set SHOT_DIR to also save a screenshot of each screen.
const shot = async (page: Page, name: string) => {
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/${name}.png`, fullPage: true });
};

test("A to C: landing, student home, Examiner Mode", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

  // A. Landing and persona picker
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Get unstuck");
  await shot(page, "A-landing");
  await page.getByRole("button", { name: /Priya S\./ }).click();

  // B. Student home
  await expect(page.getByRole("heading", { level: 1 })).toContainText("to your Engineering Physics exam");
  await expect(page.getByRole("heading", { name: "Where your marks go" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Recent attempts" })).toBeVisible();
  await shot(page, "B-home");

  // C. Examiner Mode: photo -> check what we read -> marks
  await page.getByRole("link", { name: /Snap your handwritten answer/ }).click();
  await page.getByRole("button", { name: "Use the sample photo" }).click();
  await expect(page.getByAltText("Your photographed answer")).toBeVisible();
  await shot(page, "C1-photo");
  await page.getByRole("button", { name: "Read my handwriting" }).click();
  await expect(page.getByRole("heading", { name: "Is this what you wrote?" })).toBeVisible();
  await expect(page.getByText("Hard to read. Check this line.")).toBeVisible();
  await shot(page, "C2-confirm");
  await page.getByRole("button", { name: "Mark my answer" }).click();
  await expect(page.getByRole("heading", { name: "Your marked answer" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Score 8 out of 10" })).toBeVisible();
  await expect(page.getByText("Low confidence. A teacher should check this.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Ask a teacher to review" })).toBeEnabled();
  await shot(page, "C3-result");

  expect(problems).toEqual([]);
});

test("phone: Examiner confirm screen fits the viewport", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: /Priya S\./ }).click();
  await page.goto("/examiner");
  await page.getByRole("button", { name: "Use the sample photo" }).click();
  await page.getByRole("button", { name: "Read my handwriting" }).click();
  await expect(page.getByRole("heading", { name: "Is this what you wrote?" })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  if (process.env.SHOT_DIR) await page.screenshot({ path: `${process.env.SHOT_DIR}/C2-confirm-phone.png`, fullPage: true });
  await ctx.close();
});


test("D to H: route decision, explanation, practice, teacher dashboard, knowledge-base loop", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

  await page.goto("/");
  await page.getByRole("button", { name: /Priya S\./ }).click();

  // D. Route decision: one plain line, the rule that decided, the full trace, and an override
  await page.goto("/doubts/db_demo_1");
  await expect(page.getByRole("heading", { name: "A teacher will take this." })).toBeVisible();
  await expect(page.getByText("Rule 1: Grading confidence is low")).toBeVisible();
  await expect(page.getByText("Decided", { exact: true })).toBeVisible();
  await expect(page.getByText("Also fired, not used")).toBeVisible();
  await expect(page.getByText("Policy check")).toBeVisible();
  await shot(page, "D-route");
  await page.getByRole("button", { name: "Choose a different route" }).click();
  await page.getByLabel("Practice").check();
  await page.getByLabel("Why? (optional)").fill("I want to try practice first");
  await page.getByRole("button", { name: "Change route" }).click();
  await expect(page.getByText(/You changed this from teacher to practice/)).toBeVisible();
  await expect(page.getByRole("link", { name: "Start practice" })).toBeVisible();

  // E. Explanation: citation chip and one check question
  await page.goto("/doubts/db_demo_2/explain");
  await expect(page.getByRole("heading", { name: "Your explanation" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Engineering Physics: mechanics notes, page 2" })).toBeVisible();
  await expect(page.getByText(/Resolved by/)).toHaveCount(0);
  await page.getByLabel("480 N").check();
  await page.getByRole("button", { name: "Check my answer" }).click();
  await expect(page.getByText("Correct.")).toBeVisible();
  await shot(page, "E-explain");

  // F. Practice: three questions, instant feedback, progress
  await page.goto("/doubts/db_demo_3/practice");
  for (const [i, option] of ["12 N", "5 m/s²", "N"].entries()) {
    await expect(page.getByText(`Question ${i + 1} of 3`)).toBeVisible();
    await page.getByLabel(option, { exact: true }).check();
    await page.getByRole("button", { name: "Check", exact: true }).click();
    await expect(page.getByText("Correct.")).toBeVisible();
    if (i === 0) await shot(page, "F-practice");
    await page.getByRole("button", { name: i < 2 ? "Next question" : "See my result" }).click();
  }
  await expect(page.getByRole("heading", { name: "3 of 3 right." })).toBeVisible();

  // G. Teacher dashboard: a doubt arrives live, diagnosis card, session, resolution
  await page.getByRole("button", { name: "Switch persona" }).click();
  await page.getByRole("button", { name: /Dr\. Arjun Rao/ }).click();
  await expect(page.getByRole("heading", { name: "Doubt queue" })).toBeVisible();
  const row = (name: RegExp) => page.getByRole("button", { name });
  await expect(row(/Rohan K\./)).toBeVisible();
  await expect(row(/Priya S\./)).toHaveCount(0);
  await expect(row(/Priya S\./)).toBeVisible({ timeout: 10_000 }); // arrives a few seconds later
  await expect(page.getByText("New", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /Start one group session for 3 students/ })).toBeVisible();
  await row(/Priya S\./).click();
  await expect(page.getByRole("heading", { name: "Their marked answer" })).toBeVisible();
  await shot(page, "G-teacher");
  await page.getByRole("button", { name: "Start session" }).click();
  const room = page.getByRole("link", { name: "Open the video room" });
  await expect(room).toHaveAttribute("href", /meet\.jit\.si/);
  await expect(room).toHaveAttribute("target", "_blank");
  await page.getByLabel("What was going wrong").fill("She skips the formula line before substituting.");
  await page.getByLabel("The fix you taught").fill("Always write the formula on its own line first; the marks follow the formula.");
  await page.getByRole("button", { name: "Resolve and add to knowledge base" }).click();
  await expect(page.getByText(/Added to knowledge base/)).toBeVisible();

  // H. Knowledge-base loop: a later, similar doubt cites the teacher's session
  await page.getByRole("button", { name: "Switch persona" }).click();
  await page.getByRole("button", { name: /Priya S\./ }).click();
  await page.getByRole("link", { name: "Ask a doubt" }).click();
  await page.getByLabel("What are you stuck on?").fill("I lost marks on a work done question because I left out the formula line.");
  await page.getByRole("button", { name: "Find the right help" }).click();
  await expect(page.getByRole("heading", { name: "An explanation first." })).toBeVisible();
  await page.getByRole("link", { name: "Read the explanation" }).click();
  await expect(page.getByText(/Resolved by Dr\. Arjun Rao, session on/)).toBeVisible();
  await shot(page, "H-kb");

  expect(problems).toEqual([]);
});

test("phone: the new screens do not scroll sideways", async ({ browser }) => {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  const page = await ctx.newPage();
  await page.goto("/");
  await page.getByRole("button", { name: /Priya S\./ }).click();
  for (const path of ["/", "/ask", "/doubts/db_demo_1", "/doubts/db_demo_2/explain", "/doubts/db_demo_3/practice", "/markleak", "/reader?doc=d_notes_1&page=2"]) {
    await page.goto(path);
    await expect(page.getByRole("main")).toBeVisible();
    await page.waitForLoadState("networkidle");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow, `${path} overflows by ${overflow}px`).toBeLessThanOrEqual(0);
  }
  await page.getByRole("button", { name: "Switch persona" }).click();
  await page.getByRole("button", { name: /Dr\. Arjun Rao/ }).click();
  await expect(page.getByRole("heading", { name: "Doubt queue" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Rohan K\./ })).toBeVisible();
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow, `/teacher overflows by ${overflow}px`).toBeLessThanOrEqual(0);

  await page.getByRole("button", { name: "Switch persona" }).click();
  await page.getByRole("button", { name: /Prof\. Meera Iyer/ }).click();
  await expect(page.getByRole("heading", { name: "Where the class loses marks" })).toBeVisible();
  const facultyOverflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(facultyOverflow, `/faculty overflows by ${facultyOverflow}px`).toBeLessThanOrEqual(0);
  await ctx.close();
});

// The whole demo, driven the way it will be presented: Alt+P opens the bar, the arrow keys move A to K.
test("smoke: the presenter walks A to K", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

  const landmarks: [string, () => Promise<void>][] = [
    ["A", () => expect(page.getByRole("heading", { level: 1 })).toContainText("Get unstuck")],
    ["B", () => expect(page.getByRole("heading", { level: 1 })).toContainText("to your Engineering Physics exam")],
    ["C", () => expect(page.getByRole("heading", { name: "Snap your answer" })).toBeVisible()],
    ["D", () => expect(page.getByRole("heading", { name: "A teacher will take this." })).toBeVisible()],
    ["E", () => expect(page.getByRole("link", { name: /mechanics notes, page 2/ })).toBeVisible()],
    ["F", () => expect(page.getByText("Question 1 of 3")).toBeVisible()],
    ["G", () => expect(page.getByRole("button", { name: /Rohan K\./ })).toBeVisible()],
    ["H", () => expect(page.getByLabel("What are you stuck on?")).toHaveValue(/formula/)],
    ["I", () => expect(page.getByRole("heading", { name: "The fix worth the most" })).toBeVisible()],
    ["J", () => expect(page.locator(".react-pdf__Page canvas")).toBeVisible({ timeout: 15_000 })],
    ["K", () => expect(page.getByRole("heading", { name: "Mistake map" })).toBeVisible()],
  ];

  await page.goto("/");
  await page.keyboard.press("Alt+p");
  const bar = page.getByRole("region", { name: "Presenter" });
  await expect(bar).toBeVisible();

  for (const [i, [id, check]] of landmarks.entries()) {
    await check();
    await expect(bar.getByText(id, { exact: true }).first()).toBeVisible();
    await shot(page, `smoke-${id}`);
    if (i < landmarks.length - 1) await page.keyboard.press("ArrowRight");
  }
  await page.getByRole("button", { name: "Reset" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Get unstuck");

  expect(problems).toEqual([]);
});

test("J: Co-Reader highlights, selection and the stuck nudge", async ({ page }) => {
  const problems: string[] = [];
  page.on("console", (m) => m.type() === "error" && problems.push(`console: ${m.text()}`));
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));

  await page.goto("/");
  await page.getByRole("button", { name: /Priya S\./ }).click();
  await page.goto("/reader?doc=d_notes_1&page=2");
  await expect(page.locator(".react-pdf__Page canvas")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "Notes for this page" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "In past papers" })).toBeVisible();
  // Phrases split across several text spans are still highlighted (the key equation line and the worked example)
  await expect.poll(() => page.locator(".react-pdf__Page__textContent mark.pyq-hl").count(), { timeout: 10_000 }).toBeGreaterThanOrEqual(5);
  await expect(page.locator(".react-pdf__Page__textContent mark.pyq-hl", { hasText: "Apparent" }).first()).toBeVisible();

  // Select a line on the page, then ask about it
  await page.locator(".react-pdf__Page__textContent span", { hasText: "F = ma" }).first().selectText();
  await page.locator(".react-pdf__Page").dispatchEvent("mouseup");
  await expect(page.getByRole("button", { name: "Ask about this" })).toBeVisible();

  // Page 3 has its own notes and highlight
  await page.getByRole("button", { name: "Next page" }).click();
  await expect(page.getByText("Page 3 of 3")).toBeVisible();
  await expect(page.getByText(/Only the component of force along the displacement/)).toBeVisible();

  // The stuck nudge (demo trigger) leads into the same route screen
  await page.getByRole("button", { name: "Pretend I am stuck on this page" }).click();
  await expect(page.getByRole("status", { name: "Stuck nudge" })).toContainText("Stuck on this page?");
  await page.getByRole("button", { name: "Ask about this page" }).click();
  await expect(page.getByRole("heading", { name: "Where your doubt goes" })).toBeVisible();

  expect(problems).toEqual([]);
});
