import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectOrThrow } from "@/lib/projects";
import { listQualityGates } from "@/lib/qualityGate";
import QualityGatesClient from "./quality-gates-client";

export const dynamic = "force-dynamic";

export default async function QualityGatesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const gates = await listQualityGates(id).catch(() => []);

  return (
    <div data-testid="quality-gates-page">
      <div className="row">
        <h1>Quality Gates</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}/governance/learnings`}>Learnings</Link>
      </div>
      <p className="muted small">Evaluate gates against retained evidence (QLT-002).</p>

      <QualityGatesClient
        projectId={id}
        initial={gates.map((g) => ({
          id: g.id,
          level: g.level,
          entityId: g.entityId,
          outcome: g.outcome,
          evaluatedBy: g.evaluatedBy,
          evaluatedAt: g.evaluatedAt ?? null,
        }))}
      />
    </div>
  );
}
