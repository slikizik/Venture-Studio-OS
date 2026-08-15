import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectOrThrow } from "@/lib/projects";
import { listDecisions } from "@/lib/decisions";
import DecisionsClient from "./decisions-client";

export const dynamic = "force-dynamic";

export default async function DecisionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const decisions = await listDecisions(id).catch(() => []);

  return (
    <div data-testid="decisions-page">
      <div className="row">
        <h1>Decisions</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}/governance/reviews`}>Reviews</Link>
      </div>
      <p className="muted small">Immutable decision records (GOV-001).</p>

      <DecisionsClient
        projectId={id}
        initial={decisions.map((d) => ({
          id: d.id,
          decisionId: d.decisionId,
          title: d.title,
          selectedOption: d.selectedOption,
          decidedBy: d.decidedBy,
          decidedAt: d.decidedAt ?? null,
        }))}
      />
    </div>
  );
}
