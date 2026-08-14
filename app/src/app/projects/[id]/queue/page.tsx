import Link from "next/link";
import { notFound } from "next/navigation";
import { getExecutionQueue } from "@/lib/queue";
import { listWorkPackets } from "@/lib/workpackets";
import { getProjectOrThrow } from "@/lib/projects";
import QueueClient from "./queue-client";

export const dynamic = "force-dynamic";

export default async function QueuePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let project;
  try {
    project = await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const queue = await getExecutionQueue(id);
  const packets = await listWorkPackets(id);

  return (
    <div data-testid="queue-page">
      <div className="row">
        <h1>Execution Queue</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}`}>Back</Link>
      </div>
      <p className="muted small">Project: {project.name}</p>

      <QueueClient
        projectId={id}
        items={queue.map((q) => ({
          id: q.id,
          workPacketId: q.workPacketId,
          order: q.order,
          queueStatus: q.queueStatus,
          dependsOnId: q.dependsOnId,
          readiness: q.readiness,
          effectiveStatus: q.effectiveStatus,
          title: q.workPacket?.title ?? "(deleted)",
        }))}
        packets={packets.map((p) => ({ id: p.id, title: p.title }))}
      />

      <div style={{ marginTop: 16 }}>
        <Link className="btn btn-secondary" href={`/projects/${id}/workpackets`}>Work Packets</Link>
      </div>
    </div>
  );
}
