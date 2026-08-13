// TEST-NFR-003 — TypeScript strict mode must pass without errors.
// Enforced here by asserting the project typechecks with `strict: true` and
// contains no `any` escape hatch in source.
import { execFileSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC = path.resolve(__dirname, ".."); // this test lives in src/__tests__

function walk(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full);
  }
  return out;
}

describe("TEST-NFR-003: TypeScript strict mode", () => {
  it("typechecks with no errors (tsc --noEmit exits 0)", () => {
    // Runs the real compiler against the strict tsconfig (excludes tests/scripts).
    const res = execFileSync("npx", ["tsc", "--noEmit"], {
      cwd: path.resolve(__dirname, "..", ".."),
      encoding: "utf-8",
      shell: true,
    });
    expect(res).toBeTypeOf("string");
  }, 120_000);

  it("has no `any` escape hatches in source (strict discipline)", () => {
    const files = walk(SRC);
    const offenders: string[] = [];
    for (const f of files) {
      const text = readFileSync(f, "utf-8");
      if (/:\s*any\b/.test(text) || /\bas\s+any\b/.test(text)) offenders.push(f);
    }
    expect(offenders, `found 'any' in: ${offenders.join(", ")}`).toHaveLength(0);
  });
});
