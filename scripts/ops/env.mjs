// Loads .env.local and .env (project root) into process.env without a
// dependency. Values already in the environment win; .env.local beats .env.
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

export function loadEnv() {
  for (const name of [".env.local", ".env"]) {
    const file = path.join(ROOT, name);
    if (!existsSync(file)) continue;
    for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
      const m = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*?)\s*$/);
      if (!m || process.env[m[1]] !== undefined) continue;
      const quoted = m[2].match(/^(['"])(.*?)\1(?:\s+#.*)?$/);
      process.env[m[1]] = quoted ? quoted[2] : m[2].replace(/\s+#.*$/, "");
    }
  }
}
