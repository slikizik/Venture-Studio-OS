import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectOrThrow } from "@/lib/projects";
import { listLearnings } from "@/lib/learning";
import LearningsClient from "./learnings-client";

export const dynamic = "force-dynamic";

export default async function LearningsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const learnings = await listLearnings(id).catch(() => []);

  return (
    <div data-testid="learnings-page">
      <div className="row">
        <h1>Learnings</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}/governance/direction`}>Direction Requests</Link>
      </div>
      <p className="muted small">Capture and convert learnings (LRN-001/002).</p>

      <LearningsClient
        projectId={id}
        initial={learnings.map((l) => ({
          id: l.id,
          sourceType: l.sourceType,
          summary: l.summary,
          status: l.status,
          convertedReference: l.convertedReference ?? "",
        }))}
      />
    </div>
  );
}
