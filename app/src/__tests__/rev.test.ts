// TEST-REV-001..003 — Review criterion-based records, immutable decision,
// append-only comments, and governed re-review (superseding, not mutation).
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { setupTestDb, teardownTestDb, cleanupStrayTestDbs } from "./testdb";

const db = setupTestDb("rev");

async function load() {
  const reviews = await import("../lib/reviews");
  const wp = await import("../lib/workpackets");
  const proj = await import("../lib/projects");
  return { reviews, wp, proj };
}
let api: Awaited<ReturnType<typeof load>>;

beforeAll(async () => { api = await load(); });
afterAll(() => { teardownTestDb(db); cleanupStrayTestDbs(); });

async function makeProject(name = "P") {
  return api.proj.createProject({ name, ownerName: "Owner" });
}
async function makePacketAndSubmit(p: { id: string }, title = "A") {
  const w = await api.wp.createWorkPacket({
    projectId: p.id, title, objective: "o", scope: "s", exclusions: "e", expectedOutputs: ["x"],
  });
  return api.wp.submitWorkPacket(w.id, "USER");
}

describe("TEST-REV-001: create review + decide", () => {
  it("creates a review for a submitted packet and records a decision", async () => {
    const p = await makeProject("rev1");
    const w = await makePacketAndSubmit(p);
    const r = await api.reviews.createReview({
      workPacketId: w.id, reviewerName: "REVIEWER", submittedVersion: w.versionNumber,
      criteria: [{ result: "PASS", note: "aligned" }],
    });
    expect(r.id).toBeTruthy();
    expect(r.status).toBe("PENDING");
    expect(r.comments.length).toBe(1); // criteria persisted as comments
    const decided = await api.reviews.decideReview(r.id, { decision: "APPROVED", decidedBy: "REVIEWER", note: "Meets intent" });
    expect(decided.status).toBe("APPROVED");
    expect(decided.decidedAt).toBeTruthy();
    const refetched = await api.reviews.getReviewOrThrow(r.id);
    expect(refetched.status).toBe("APPROVED");
  });

  it("APPROVED review flips the work packet to APPROVED", async () => {
    const p = await makeProject("rev2");
    const w = await makePacketAndSubmit(p);
    const r = await api.reviews.createReview({ workPacketId: w.id, reviewerName: "REVIEWER", submittedVersion: w.versionNumber });
    await api.reviews.decideReview(r.id, { decision: "APPROVED", decidedBy: "REVIEWER" });
    const refetched = await api.wp.getWorkPacketOrThrow(w.id);
    expect(refetched.status).toBe("APPROVED");
  });

  it("REVISION_REQUESTED review flips the packet back", async () => {
    const p = await makeProject("rev3");
    const w = await makePacketAndSubmit(p);
    const r = await api.reviews.createReview({ workPacketId: w.id, reviewerName: "REVIEWER", submittedVersion: w.versionNumber });
    await api.reviews.decideReview(r.id, { decision: "REVISION_REQUESTED", decidedBy: "REVIEWER" });
    const refetched = await api.wp.getWorkPacketOrThrow(w.id);
    expect(refetched.status).toBe("REVISION_REQUESTED");
  });
});

describe("TEST-REV-002: immutable decision + append-only comments", () => {
  it("does not mutate a decided review (no re-decide; supersede instead)", async () => {
    const p = await makeProject("rev4");
    const w = await makePacketAndSubmit(p);
    const r = await api.reviews.createReview({ workPacketId: w.id, reviewerName: "REVIEWER", submittedVersion: w.versionNumber });
    await api.reviews.decideReview(r.id, { decision: "APPROVED", decidedBy: "REVIEWER" });
    await expect(api.reviews.decideReview(r.id, { decision: "REVISION_REQUESTED", decidedBy: "REVIEWER" }))
      .rejects.toThrow(/REVIEW_DECISION_IMMUTABLE/i);
    const refetched = await api.reviews.getReviewOrThrow(r.id);
    expect(refetched.status).toBe("APPROVED"); // unchanged
  });

  it("appends comments without altering the review body", async () => {
    const p = await makeProject("rev5");
    const w = await makePacketAndSubmit(p);
    const r = await api.reviews.createReview({ workPacketId: w.id, reviewerName: "REVIEWER", submittedVersion: w.versionNumber });
    const c1 = await api.reviews.addReviewComment(r.id, { authorName: "REVIEWER", body: "first" });
    const c2 = await api.reviews.addReviewComment(r.id, { authorName: "USER", body: "second" });
    expect(c1.id).toBeTruthy();
    expect(c2.id).toBeTruthy();
    expect(c1.createdAt <= c2.createdAt).toBe(true);
    const refetched = await api.reviews.getReviewOrThrow(r.id);
    expect(refetched.comments.length).toBe(2);
  });

  it("rejects review creation for a non-submitted packet", async () => {
    const p = await makeProject("rev6");
    const w = await api.wp.createWorkPacket({
      projectId: p.id, title: "A", objective: "o", scope: "s", exclusions: "e", expectedOutputs: ["x"],
    });
    await expect(api.reviews.createReview({ workPacketId: w.id, reviewerName: "REVIEWER", submittedVersion: 1 }))
      .rejects.toThrow(/WORK_PACKET_NOT_SUBMITTED/i);
  });
});

describe("TEST-REV-003: list reviews for a packet", () => {
  it("lists only reviews of the packet", async () => {
    const p = await makeProject("rev7");
    const w1 = await makePacketAndSubmit(p, "A");
    const w2 = await makePacketAndSubmit(p, "B");
    await api.reviews.createReview({ workPacketId: w1.id, reviewerName: "REVIEWER", submittedVersion: 1 });
    await api.reviews.createReview({ workPacketId: w2.id, reviewerName: "REVIEWER", submittedVersion: 1 });
    const list = await api.reviews.listReviews(w1.id);
    expect(list.length).toBe(1);
    expect(list[0].workPacketId).toBe(w1.id);
  });
});
