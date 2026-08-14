"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSettings } from "../settings-context";
import { formatInTimeZone } from "@/lib/datetime";

interface Project {
  id: string;
  name: string;
  status: string;
  health: string;
  templateId: string | null;
  progressPercent: number;
  targetDate: string | null;
  updatedAt: string;
}

export default function ProjectsPage() {
  const { ownerTimeZone, loaded } = useSettings();
  const [projects, setProjects] = useState<Project[]>([]);
  const [status, setStatus] = useState("");
  const [health, setHealth] = useState("");
  const [archived, setArchived] = useState("false");
  const [search, setSearch] = useState("");
  const [error] = useState("");

  async function load() {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    if (health) params.set("health", health);
    params.set("archived", archived);
    if (search) params.set("search", search);
    const res = await fetch(`/api/projects?${params.toString()}`);
    const data = await res.json();
    setProjects(data.projects ?? []);
  }

  useEffect(() => { load(); }, [loaded]);

  async function onArchive(id: string) {
    if (!confirm("Archive this project?")) return;
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    load();
  }
  async function onRestore(id: string) {
    await fetch(`/api/projects/${id}?action=restore`, { method: "DELETE" });
    load();
  }

  return (
    <div>
      <div className="row">
        <h1>Projects</h1>
        <Link className="btn" href="/projects/new">Create Project</Link>
      </div>

      <div className="card">
        <div className="grid grid-cols-4">
          <div>
            <label>Search</label>
            <input value={search} placeholder="name, summary, brain" onChange={(e) => setSearch(e.target.value)} data-testid="filter-search" />
          </div>
          <div>
            <label>Status</label>
            <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="filter-status">
              <option value="">Any</option>
              <option>DRAFT</option><option>ACTIVE</option><option>PAUSED</option><option>COMPLETED</option><option>ARCHIVED</option>
            </select>
          </div>
          <div>
            <label>Health</label>
            <select value={health} onChange={(e) => setHealth(e.target.value)} data-testid="filter-health">
              <option value="">Any</option>
              <option>HEALTHY</option><option>ATTENTION</option><option>AT_RISK</option><option>BLOCKED</option>
            </select>
          </div>
          <div>
            <label>Archived</label>
            <select value={archived} onChange={(e) => setArchived(e.target.value)} data-testid="filter-archived">
              <option value="false">Active only</option>
              <option value="true">Archived only</option>
              <option value="">All</option>
            </select>
          </div>
        </div>
        <button className="btn btn-secondary" style={{ marginTop: 12 }} onClick={load} data-testid="apply-filters">Apply</button>
      </div>

      {error && <div className="error">{error}</div>}

      {projects.length === 0 ? (
        <div className="empty">
          No projects match. <Link href="/projects/new">Create one</Link>.
        </div>
      ) : (
        <div className="card" data-testid="project-list">
          <table>
            <thead>
              <tr><th>Name</th><th>Status</th><th>Health</th><th>Progress</th><th>Target</th><th>Updated</th><th></th></tr>
            </thead>
            <tbody>
              {projects.map((p) => (
                <tr key={p.id} data-testid={`project-row-${p.id}`}>
                  <td><Link href={`/projects/${p.id}`}>{p.name}</Link></td>
                  <td><span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span></td>
                  <td><span className={`badge badge-${p.health.toLowerCase()}`}>{p.health}</span></td>
                  <td>{p.progressPercent}%</td>
                  <td className="muted small">{p.targetDate ? formatInTimeZone(p.targetDate, ownerTimeZone) : "—"}</td>
                  <td className="muted small">{formatInTimeZone(p.updatedAt, ownerTimeZone)}</td>
                  <td>
                    {p.status === "ARCHIVED" ? (
                      <button className="btn btn-secondary small" onClick={() => onRestore(p.id)}>Restore</button>
                    ) : (
                      <button className="btn btn-danger small" onClick={() => onArchive(p.id)}>Archive</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
