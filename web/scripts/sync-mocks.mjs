// contracts/mocks (final) and contracts/draft/mocks (draft, phases 3-9) are the source of truth; this copies them into src/mocks.
import { cpSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const contracts = join(root, "..", "contracts");
const to = join(root, "src", "mocks");

mkdirSync(to, { recursive: true });
cpSync(join(contracts, "mocks"), to, { recursive: true });
cpSync(join(contracts, "draft", "mocks"), join(to, "draft"), { recursive: true });
console.log(`Synced ${readdirSync(to).length} entries to src/mocks (draft mocks in src/mocks/draft)`);
