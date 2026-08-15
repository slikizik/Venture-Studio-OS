import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectOrThrow } from "@/lib/projects";
import { listReviews } from "@/lib/reviews";
import ReviewsClient from "./reviews-client";

export const dynamic = "force-dynamic";

export default async function ReviewsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const reviews = await listReviews(id).catch(() => []);

  return (
    <div data-testid="reviews-page">
      <div className="row">
        <h1>Reviews</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}`}>Back</Link>
      </div>
      <p className="muted small">Project: reviews are keyed by work packet.</p>

      <ReviewsClient
        projectId={id}
        initial={reviews.map((r) => ({
          id: r.id,
          workPacketId: r.workPacketId,
          reviewerName: r.reviewerName,
          status: r.status,
          summary: r.summary ?? "",
          submittedVersion: r.submittedVersion,
          decidedAt: r.decidedAt ?? null,
          comments: r.comments.map((c) => ({ id: c.id, authorName: c.authorName, body: c.body })),
        }))}
      />

      <div style={{ marginTop: 16 }}>
        <Link className="btn btn-secondary" href={`/projects/${id}/governance/decisions`}>Decisions</Link>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href={`/projects/${id}/governance/risks`}>Risks</Link>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href={`/projects/${id}/governance/exceptions`}>Exceptions</Link>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href={`/projects/${id}/governance/direction`}>Direction Requests</Link>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href={`/projects/${id}/governance/learnings`}>Learnings</Link>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href={`/projects/${id}/governance/quality-gates`}>Quality Gates</Link>
      </div>
    </div>
  );
}
