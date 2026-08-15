import Link from "next/link";
import { notFound } from "next/navigation";
import { listWorkPackets } from "@/lib/workpackets";
import { getProjectOrThrow } from "@/lib/projects";
import WorkPacketsClient from "./workpackets-client";

export const dynamic = "force-dynamic";

export default async function WorkPacketsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let project;
  try {
    project = await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const packets = await listWorkPackets(id);

  return (
    <div data-testid="workpackets-page">
      <div className="row">
        <h1>Work Packets</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}`}>Back</Link>
      </div>
      <p className="muted small">Project: {project.name}</p>

      <WorkPacketsClient projectId={id} packets={packets.map((p) => ({
        id: p.id,
        title: p.title,
        status: p.status,
        priority: p.priority,
        objective: p.objective,
        scope: p.scope,
        exclusions: p.exclusions,
        expectedOutputs: p.expectedOutputs,
        versionNumber: p.versionNumber ?? 1,
        queueStatus: p.queueStatus ?? null,
      }))} />

      <div style={{ marginTop: 16 }}>
        <Link className="btn btn-secondary" href={`/projects/${id}/queue`}>Execution Queue</Link>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href={`/projects/${id}/deliverables`}>Deliverables</Link>
      </div>
    </div>
  );
}
