import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectOrThrow, calculateProgress, calculateHealth } from "@/lib/projects";
import { listAuditForProject } from "@/lib/audit";
import { formatInTimeZone } from "@/lib/datetime";
import EditProjectClient from "./edit-client";

export const dynamic = "force-dynamic";

export default async function ProjectDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let project;
  try {
    project = await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const [progress, health, audit] = await Promise.all([
    calculateProgress(id),
    calculateHealth(id),
    listAuditForProject(id, 10),
  ]);
  const tz = "UTC"; // display tz resolved client-side where needed

  return (
    <div data-testid="project-dashboard">
      <div className="row">
        <div>
          <h1>{project.name}</h1>
          <p className="muted small">{project.summary ?? ""}</p>
        </div>
        <span className={`badge badge-${project.status.toLowerCase()}`}>{project.status}</span>
      </div>

      <div className="grid grid-cols-3">
        <div className="card">
          <div className="muted small">Progress</div>
          <div className="metric" data-testid="project-progress">{progress.progressPercent}%</div>
          <div className="muted small">{progress.completedStages}/{progress.stageCount} stages complete</div>
        </div>
        <div className="card">
          <div className="muted small">Health</div>
          <div className="metric" data-testid="project-health">{health}</div>
        </div>
        <div className="card">
          <div className="muted small">Owner / Target</div>
          <div>{project.ownerName}</div>
          <div className="muted small">{project.targetDate ? formatInTimeZone(project.targetDate, tz) : "—"}</div>
        </div>
      </div>

      <div className="row">
        <h2>Project Brain</h2>
        <Link className="btn btn-secondary" href={`/projects/${id}/brain`}>Edit Brain</Link>
      </div>
      <div className="card">
        {project.brainEntries.length === 0 ? (
          <div className="empty">No brain sections yet.</div>
        ) : (
          <ul>
            {project.brainEntries.map((b) => (
              <li key={b.id}><strong>{b.title}</strong> <span className="muted small">({b.section})</span></li>
            ))}
          </ul>
        )}
      </div>

      <h2>Stages</h2>
      <div className="card">
        {project.stages.length === 0 ? (
          <div className="empty">No stages.</div>
        ) : (
          <table>
            <thead><tr><th>#</th><th>Stage</th><th>Status</th></tr></thead>
            <tbody>
              {project.stages.map((s) => (
                <tr key={s.id}><td>{s.order}</td><td>{s.name}</td><td>{s.status}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <EditProjectClient
        projectId={id}
        initialName={project.name}
        initialSummary={project.summary ?? ""}
        initialStatus={project.status}
        initialOwner={project.ownerName}
        initialTargetDate={project.targetDate ? project.targetDate.toISOString().slice(0, 10) : ""}
      />

      <h2>Recent activity (audit)</h2>
      <div className="card" data-testid="audit-trail">
        {audit.length === 0 ? (
          <div className="empty">No audit records.</div>
        ) : (
          <table>
            <thead><tr><th>Action</th><th>Summary</th><th>When</th></tr></thead>
            <tbody>
              {audit.map((a) => (
                <tr key={a.id}><td className="muted small">{a.action}</td><td>{a.summary}</td><td className="muted small">{formatInTimeZone(a.createdAt, tz)}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 16 }}>
        <Link className="btn btn-secondary" href={`/projects/${id}/intent`}>Intent &amp; Benchmark</Link>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href={`/projects/${id}/deliverables`}>Deliverables</Link>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href={`/projects/${id}/workpackets`}>Work Packets</Link>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href={`/projects/${id}/queue`}>Execution Queue</Link>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href={`/quality-profiles?projectId=${id}`}>Quality Profile</Link>
      </div>
    </div>
  );
}
