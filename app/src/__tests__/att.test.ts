// TEST-ATT-001/002 — Evidence attachments: create (file/link/note/artifact),
// filename sanitization, checksum + size retention.
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("att");

async function load() {
  const proj = await import("../lib/projects");
  const wp = await import("../lib/workpackets");
  const att = await import("../lib/attachments");
  return { proj, wp, att };
}
let api: Awaited<ReturnType<typeof load>>;
beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function project() { return api.proj.createProject({ name: "ATT", ownerName: "O" }); }
async function packet(p) {
  return api.wp.createWorkPacket({ projectId: p.id, title: "WP", objective: "o", scope: "s", exclusions: "e", expectedOutputs: ["x"] });
}

describe("TEST-ATT-001: create attachments", () => {
  it("creates a FILE attachment and retains checksum + size", async () => {
    const p = await project();
    const w = await packet(p);
    const a = await api.att.createAttachment({
      projectId: p.id,
      workPacketId: w.id,
      type: "FILE",
      title: "source.py",
      fileName: "uploads/source.py",
      originalName: "../../etc/passwd",
      location: "uploads/source.py",
      checksum: "sha256:abc",
      sizeBytes: 1234,
    });
    expect(a.id).toBeTruthy();
    expect(a.type).toBe("FILE");
    expect(a.checksum).toBe("sha256:abc");
    expect(a.sizeBytes).toBe(1234);
  });

  it("sanitizes the original filename on write", async () => {
    const p = await project();
    const w = await packet(p);
    const a = await api.att.createAttachment({
      projectId: p.id,
      workPacketId: w.id,
      type: "LINK",
      title: "doc",
      originalName: "..\\..\\evil.exe",
      location: "https://example.com/doc",
    });
    expect(a.originalName).not.toContain("..");
  });

  it("rejects an invalid evidence type", async () => {
    const p = await project();
    const w = await packet(p);
    await expect(
      api.att.createAttachment({
        projectId: p.id,
        workPacketId: w.id,
        type: "BOGUS",
        title: "x",
      }),
    ).rejects.toThrow();
  });
});

describe("TEST-ATT-002: list attachments scoped to work packet", () => {
  it("lists only attachments for the given packet", async () => {
    const p = await project();
    const w1 = await packet(p);
    const w2 = await packet(p);
    await api.att.createAttachment({ projectId: p.id, workPacketId: w1.id, type: "NOTE", title: "n1" });
    await api.att.createAttachment({ projectId: p.id, workPacketId: w2.id, type: "NOTE", title: "n2" });
    const lst = await api.att.listAttachments(p.id, { workPacketId: w1.id });
    expect(lst.length).toBe(1);
    expect(lst[0].title).toBe("n1");
  });
});
