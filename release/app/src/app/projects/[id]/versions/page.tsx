import Link from "next/link";
import { notFound } from "next/navigation";
import { listVersions } from "@/lib/versions";
import { getProjectOrThrow } from "@/lib/projects";
import VersionsClient from "./versions-client";

export const dynamic = "force-dynamic";

export default async function VersionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let project;
  try {
    project = await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const versions = await listVersions(id);

  return (
    <div data-testid="versions-page">
      <div className="row">
        <h1>Versions</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}`}>Back</Link>
      </div>
      <p className="muted small">Project: {project.name}</p>

      <VersionsClient
        projectId={id}
        versions={versions.map((v) => ({
          id: v.id,
          label: v.label,
          type: v.type,
          status: v.status,
          changeSummary: v.changeSummary ?? "",
          createdAt: v.createdAt.toISOString(),
        }))}
      />

      <h2>Version history</h2>
      <div className="card">
        {versions.length === 0 ? (
          <div className="empty">No versions recorded.</div>
        ) : (
          <table>
            <thead><tr><th>Label</th><th>Type</th><th>Status</th><th>Summary</th><th>Created</th></tr></thead>
            <tbody>
              {versions.map((v) => (
                <tr key={v.id} data-testid={`version-${v.id}`}>
                  <td><strong>{v.label}</strong></td>
                  <td>{v.type}</td>
                  <td>{v.status}</td>
                  <td className="muted small">{v.changeSummary}</td>
                  <td className="muted small">{v.createdAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
