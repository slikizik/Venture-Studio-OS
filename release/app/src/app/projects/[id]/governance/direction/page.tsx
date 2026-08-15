import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectOrThrow } from "@/lib/projects";
import { listOpenDirectionRequests } from "@/lib/direction";
import DirectionClient from "./direction-client";

export const dynamic = "force-dynamic";

export default async function DirectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const drs = await listOpenDirectionRequests(id).catch(() => []);

  return (
    <div data-testid="direction-page">
      <div className="row">
        <h1>Direction Requests</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}/governance/exceptions`}>Exceptions</Link>
      </div>
      <p className="muted small">Agent escalations that require an owner decision (cannot be bypassed, EXC-002/004).</p>

      <DirectionClient
        projectId={id}
        initial={drs.map((d) => ({
          id: d.id,
          title: d.title,
          question: d.question,
          status: d.status,
          severity: d.severity,
          resolution: d.resolution ?? "",
          decidedBy: d.decidedBy ?? "",
        }))}
      />
    </div>
  );
}
