// TEST-NFR-001 — Application must run locally on Windows 11 and Ubuntu LTS.
// Runs the REAL production build and boots the server as detached OS processes
// (isolated from Vitest's worker pool, which would otherwise disrupt Next's
// child workers), then asserts a 200 response with expected dashboard content.
// A green run here proves it runs on THIS target OS; CI runs the identical
// script on Ubuntu LTS for parity (see docs/OWNER_RUNBOOK.md).
import { spawn } from "node:child_process";
import { rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const APP_DIR = path.resolve(fileURLToPath(import.meta.url), "..", "..", "..");
const PORT = 3940;
const BASE = `http://localhost:${PORT}`;

function runDetached(cmd: string, args: string[]): Promise<{ code: number | null; log: string }> {
  return new Promise((resolve) => {
    const logPath = path.join(APP_DIR, `.nfr001-${cmd.replace(/\W/g, "_")}.log`);
    const child = spawn(cmd, args, {
      cwd: APP_DIR,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
      detached: true, // run outside Vitest's process group
      stdio: ["ignore", "pipe", "pipe"],
      shell: true,
    });
    let out = "";
    child.stdout?.on("data", (d) => (out += d));
    child.stderr?.on("data", (d) => (out += d));
    child.on("close", (code) => {
      writeFileSync(logPath, out);
      resolve({ code, log: out });
    });
    child.unref();
  });
}

async function waitForServer(url: string, timeoutMs = 60_000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.status > 0) return true;
    } catch {
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  return false;
}

describe("TEST-NFR-001: runs locally (build + serve)", () => {
  let server: ReturnType<typeof spawn> | null = null;

  beforeAll(async () => {
    const build = await runDetached("npx", ["next", "build"]);
    if (build.code !== 0) {
      throw new Error(`next build failed (code ${build.code}):\n${build.log.slice(-2000)}`);
    }
    server = spawn("npx", ["next", "start", "-p", String(PORT)], {
      cwd: APP_DIR,
      env: { ...process.env, PORT: String(PORT), NODE_ENV: "production" },
      detached: true,
      stdio: "ignore",
      shell: true,
    });
    server.unref();
  }, 360_000);

  afterAll(() => {
    try { server?.kill("SIGTERM"); } catch { /* noop */ }
    for (const f of [`.nfr001_next_build.log`]) {
      rmSync(path.join(APP_DIR, f), { force: true });
    }
  });

  it("boots and serves the dashboard with a 200", async () => {
    const up = await waitForServer(BASE);
    expect(up).toBe(true);
    const res = await fetch(BASE);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Venture Studio OS");
    expect(html).toContain("Portfolio");
    expect(html).toContain("Recent decisions");
  }, 90_000);
});
