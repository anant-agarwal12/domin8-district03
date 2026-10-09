// Generates web/public/demo/notes.pdf: three pages of original Engineering Physics notes for the Co-Reader demo.
// Run: node scripts/make-demo-notes.mjs
// Equations sit on their own lines so the PDF text layer keeps each one in a single piece (the page highlights rely on it).
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "demo", "notes.pdf");
const NAVY = rgb(0.08, 0.13, 0.24);
const MUTED = rgb(0.34, 0.38, 0.45);
const ORANGE = rgb(0.76, 0.25, 0.05);

const PAGES = [
  {
    topic: "Kinematics",
    title: "Motion in a straight line",
    intro: [
      "Kinematics describes motion without asking what causes it.",
      "For constant acceleration there are three equations. Learn them as a set.",
    ],
    equations: ["v = u + at", "s = ut + (1/2)at^2", "v^2 = u^2 + 2as"],
    worked: [
      "Worked example. A ball is thrown upward at 20 m/s. How high does it go? Take g = 10 m/s^2.",
      "At the top v = 0, so use the third equation with a = -g:",
      "0 = 20^2 - 2(10)h",
      "h = 400 / 20 = 20 m",
    ],
    tip: "Exam tip: write the equation on its own line before you substitute.",
  },
  {
    topic: "Newton's laws",
    title: "Force, mass and acceleration",
    intro: [
      "The net force on a body equals its mass times its acceleration.",
      "A scale in a lift reads the normal force N, not your weight mg.",
    ],
    equations: [
      "F = ma",
      "Apparent weight: N - mg = ma for upward acceleration.",
      "Downward acceleration: mg - N = ma",
    ],
    worked: [
      "Worked example. A 60 kg person stands in a lift accelerating upward at 2 m/s^2. Take g = 10 m/s^2.",
      "N - mg = ma, so N = m(g + a)",
      "N = 60(10 + 2) = 720 N",
    ],
    tip: "Exam tip: decide the direction of the acceleration first, then write the net force.",
  },
  {
    topic: "Work and energy",
    title: "Work, energy and the angle",
    intro: [
      "Only the part of the force along the displacement does work.",
      "Kinetic energy is the energy of motion.",
    ],
    equations: [
      "Work done by a force at an angle: W = F s cos(theta)",
      "E = (1/2) m v^2",
    ],
    worked: [
      "Worked example. A force of 10 N moves a body 5 m at 60 degrees to the displacement.",
      "W = F s cos(theta) = 10 x 5 x 0.5",
      "W = 25 J",
    ],
    tip: "Exam tip: state the formula, use cos(theta), and finish with the unit, J.",
  },
];

const pdf = await PDFDocument.create();
const body = await pdf.embedFont(StandardFonts.Helvetica);
const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
const mono = await pdf.embedFont(StandardFonts.Courier);

for (const [i, p] of PAGES.entries()) {
  const page = pdf.addPage([612, 792]);
  let y = 730;
  const line = (text, { font = body, size = 12, color = NAVY, x = 56, gap = 20 } = {}) => {
    page.drawText(text, { x, y, size, font, color });
    y -= gap;
  };

  page.drawText(`Engineering Physics  |  ${p.topic}`, { x: 56, y: 756, size: 9, font: body, color: MUTED });
  line(p.title, { font: bold, size: 24, gap: 38 });
  for (const t of p.intro) line(t, { gap: 20 });
  y -= 10;
  line("Key equations", { font: bold, size: 14, gap: 26 });
  for (const e of p.equations) line(e, { font: mono, size: 13, x: 74, gap: 24 });
  y -= 12;
  line("Worked example", { font: bold, size: 14, gap: 26 });
  for (const w of p.worked) line(w, { font: /^[A-Za-z]/.test(w) ? body : mono, size: /^[A-Za-z]/.test(w) ? 11 : 13, x: /^[A-Za-z]/.test(w) ? 56 : 74, gap: 22 });
  y -= 16;
  line(p.tip, { size: 11, color: ORANGE });
  page.drawText(`Page ${i + 1} of ${PAGES.length}`, { x: 270, y: 40, size: 9, font: body, color: MUTED });
}

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, await pdf.save());
console.log(`Wrote ${out} (${PAGES.length} pages)`);
