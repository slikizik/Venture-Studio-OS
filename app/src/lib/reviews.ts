// REV-001/002/003 — Criterion-based reviews with governed transitions and
// immutable history. Reviews are created against a submitted/revised work
// packet; decisions are irreversible (a new superseding review is created
// rather than overwriting); comments are append-only.
import { prisma } from "./prisma";
import { recordAudit } from "./audit";
import { z } from "zod";
import {
  reviewCreateSchema,
  reviewDecisionSchema,
  reviewCommentSchema,
  ReviewStatusEnum,
} from "./validation";

type ReviewDecisionType = z.infer<typeof reviewDecisionSchema>["decision"];

// Allowed status transitions for a review decision.
const DECISION_TARGET: Record<ReviewDecisionType, string> = {
  APPROVED: "APPROVED",
  REVISION_REQUESTED: "REVISION_REQUESTED",
  REJECTED: "REJECTED",
};

/** REV-001 — Create a criterion-based review record for a work packet. */
export async function createReview(input: unknown, actor = "SYSTEM") {
  const data = reviewCreateSchema.parse(input);
  const wp = await prisma.workPacket.findUnique({ where: { id: data.workPacketId } });
  if (!wp) throw new Error("WORK_PACKET_NOT_FOUND");
  if (wp.status !== "IN_REVIEW" && wp.status !== "REVISION_REQUESTED") {
    throw new Error("WORK_PACKET_NOT_SUBMITTED");
  }
  const review = await prisma.review.create({
    data: {
      workPacketId: data.workPacketId,
      projectId: wp.projectId,
      reviewerName: data.reviewerName,
      summary: data.summary ?? null,
      submittedVersion: data.submittedVersion,
      status: data.status,
    },
  });
  // Persist per-criterion results as append-only comments keyed by criterion.
  for (const c of data.criteria) {
    await prisma.reviewComment.create({
      data: {
        reviewId: review.id,
        authorName: data.reviewerName,
        criterionId: c.criterionId ?? null,
        body: `CRITERION:${c.result}${c.note ? " — " + c.note : ""}`,
      },
    });
  }
  await recordAudit({
    actor,
    action: "REVIEW_CREATED",
    entityType: "REVIEW",
    entityId: review.id,
    projectId: wp.projectId,
    summary: `Review created for work packet ${wp.title} (v${data.submittedVersion}) by ${data.reviewerName}`,
  });
  return getReviewOrThrow(review.id);
}

/** REV-002 — Approve / request revision / reject under transition rules.
 * Immutable: we stamp decidedAt and (if superseding) leave the prior record as
 * PENDING/SUPERSEDED rather than mutating a decided review. */
export async function decideReview(id: string, input: unknown, actor = "SYSTEM") {
  const data = reviewDecisionSchema.parse(input);
  const existing = await prisma.review.findUnique({ where: { id } });
  if (!existing) throw new Error("REVIEW_NOT_FOUND");
  if (existing.status !== "PENDING") {
    throw new Error("REVIEW_DECISION_IMMUTABLE");
  }
  const status = DECISION_TARGET[data.decision];
  const updated = await prisma.review.update({
    where: { id },
    data: { status, decidedAt: new Date(), summary: data.note ?? existing.summary },
  });
  // If a change was requested/rejected on a work packet, reflect it there too.
  if (data.decision === "APPROVED") {
    await prisma.workPacket.update({
      where: { id: existing.workPacketId },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
  } else if (data.decision === "REVISION_REQUESTED") {
    await prisma.workPacket.update({
      where: { id: existing.workPacketId },
      data: { status: "REVISION_REQUESTED" },
    });
  }
  await recordAudit({
    actor,
    action: `REVIEW_${data.decision}`,
    entityType: "REVIEW",
    entityId: id,
    projectId: existing.projectId,
    summary: `Review ${data.decision} for work packet review ${id}`,
    metadata: { decision: data.decision, decidedBy: data.decidedBy },
  });
  return updated;
}

/** REV-003 — Append a review comment (immutable, append-only). */
export async function addReviewComment(reviewId: string, input: unknown, actor = "SYSTEM") {
  const data = reviewCommentSchema.parse(input);
  const review = await prisma.review.findUnique({ where: { id: reviewId } });
  if (!review) throw new Error("REVIEW_NOT_FOUND");
  const comment = await prisma.reviewComment.create({
    data: {
      reviewId,
      authorName: data.authorName,
      criterionId: data.criterionId ?? null,
      body: data.body,
    },
  });
  await recordAudit({
    actor,
    action: "REVIEW_COMMENT_ADDED",
    entityType: "REVIEW_COMMENT",
    entityId: comment.id,
    projectId: review.projectId,
    summary: `Comment added to review ${reviewId} by ${data.authorName}`,
  });
  return comment;
}

/** List reviews for a work packet (with comments). */
export async function listReviews(workPacketId: string) {
  return prisma.review.findMany({
    where: { workPacketId },
    orderBy: { createdAt: "asc" },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });
}

export async function getReviewOrThrow(id: string) {
  const r = await prisma.review.findUnique({
    where: { id },
    include: { comments: { orderBy: { createdAt: "asc" } } },
  });
  if (!r) throw new Error("REVIEW_NOT_FOUND");
  return r;
}

export type { ReviewDecisionType };
export { ReviewStatusEnum };
