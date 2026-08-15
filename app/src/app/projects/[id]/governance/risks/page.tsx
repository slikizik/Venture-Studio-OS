import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectOrThrow } from "@/lib/projects";
import { listRisks } from "@/lib/risks";
import RisksClient from "./risks-client";

export const dynamic = "force-dynamic";

export default async function RisksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const risks = await listRisks(id).catch(() => []);

  return (
    <div data-testid="risks-page">
      <div className="row">
        <h1>Risks</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}/governance/decisions`}>Decisions</Link>
      </div>
      <p className="muted small">Risk register (GOV-002).</p>

      <RisksClient
        projectId={id}
        initial={risks.map((r) => ({
          id: r.id,
          title: r.title,
          impact: r.impact,
          likelihood: r.likelihood,
          status: r.status,
          mitigation: r.mitigation ?? "",
        }))}
      />
    </div>
  );
}
