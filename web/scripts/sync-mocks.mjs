// contracts/mocks is the source of truth; this copies it into src/mocks.
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const from = join(root, "..", "contracts", "mocks");
const to = join(root, "src", "mocks");

mkdirSync(to, { recursive: true });
cpSync(from, to, { recursive: true });
console.log(`Synced ${readdirSync(to).length} mock files to src/mocks`);
