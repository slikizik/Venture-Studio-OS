import Link from "next/link";
import { notFound } from "next/navigation";
import { listRequirementLinks } from "@/lib/requirements";
import { listDeliverables } from "@/lib/deliverables";
import { getProjectOrThrow } from "@/lib/projects";
import RequirementsClient from "./requirements-client";

export const dynamic = "force-dynamic";

export default async function RequirementsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let project;
  try {
    project = await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const links = await listRequirementLinks(id);
  const deliverables = await listDeliverables(id);

  return (
    <div data-testid="requirements-page">
      <div className="row">
        <h1>Requirement Mapping</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}`}>Back</Link>
      </div>
      <p className="muted small">Project: {project.name}</p>

      <RequirementsClient
        projectId={id}
        links={links.map((l) => ({
          id: l.id,
          requirementId: l.requirementId,
          requirementText: l.requirement ? `${l.requirement.code}: ${l.requirement.title}` : l.requirementId,
          targetType: l.targetType,
          deliverableId: l.deliverableId,
          workPacketId: l.workPacketId,
          isExclusion: l.isExclusion,
          dependencyDetail: l.dependencyDetail,
          expectedEvidence: l.evidenceExpectation,
        }))}
        deliverables={deliverables.map((d) => ({ id: d.id, title: d.title }))}
      />
    </div>
  );
}
