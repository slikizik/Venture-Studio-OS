"use client";

import { useEffect, useState } from "react";

interface QualityProfileView {
  id: string;
  projectId: string;
  name: string;
  projectTypeId: string;
  version: string;
  isLatest: boolean;
  status: string;
  dimensions: string;
  mandatoryDimensions: string;
  targetLevels: string;
}

const PROJECT_TYPES = [
  "STANDARD_VENTURE",
  "PRODUCT_RELEASE",
  "RESEARCH",
  "SERVICE",
  "INTERNAL_TOOL",
];
const QUALITY_LEVELS = ["BASIC", "COMPETITIVE", "COMMERCIAL", "COMMERCIAL_PLUS", "DIFFERENTIATOR"];

export default function QualityProfilesClient({ initialProjectId }: { initialProjectId: string }) {
  const [projectId, setProjectId] = useState(initialProjectId);
  const [profiles, setProfiles] = useState<QualityProfileView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // create form
  const [name, setName] = useState("Default Quality Profile");
  const [projectTypeId, setProjectTypeId] = useState("STANDARD_VENTURE");
  const [dimensions, setDimensions] = useState('[{"id":"functional","name":"Functional"}]');
  const [mandatory, setMandatory] = useState('["functional"]');
  const [targetLevels, setTargetLevels] = useState('["COMMERCIAL"]');
  const [status, setStatus] = useState("DRAFT");

  async function load() {
    if (!projectId) {
      setProfiles([]);
      return;
    }
    const res = await fetch(`/api/quality-profiles?projectId=${encodeURIComponent(projectId)}`);
    const data = await res.json();
    setProfiles(res.ok ? data.profiles : []);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  async function createProfile(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      let dimsParsed: unknown, mandParsed: unknown, levelsParsed: unknown;
      try {
        dimsParsed = JSON.parse(dimensions);
        mandParsed = JSON.parse(mandatory);
        levelsParsed = JSON.parse(targetLevels);
      } catch {
        throw new Error("dimensions / mandatoryDimensions / targetLevels must be valid JSON");
      }
      const res = await fetch("/api/quality-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          name,
          projectTypeId,
          dimensions: dimsParsed,
          mandatoryDimensions: mandParsed,
          targetLevels: levelsParsed,
          status,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function versionProfile(version: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/quality-profiles", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, version }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "version failed");
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function deleteProfile(id: string) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/quality-profiles/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "delete failed");
      }
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <label>Project ID</label>
        <input
          value={projectId}
          onChange={(e) => setProjectId(e.target.value)}
          placeholder="project id to scope profiles"
          data-testid="qp-projectid"
        />
      </div>

      <h2>Profiles</h2>
      <div className="card" data-testid="qp-list">
        {!projectId ? (
          <div className="empty">Enter a project ID to view its quality profiles.</div>
        ) : profiles.length === 0 ? (
          <div className="empty">No quality profiles for this project yet.</div>
        ) : (
          <ul>
            {profiles.map((p) => (
              <li key={p.id} data-testid={`qp-${p.id}`} style={{ marginBottom: 12 }}>
                <strong>{p.name}</strong> <span className="badge">v{p.version}</span>{" "}
                <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>{" "}
                {p.isLatest && <span className="badge badge-approved">latest</span>}
                <div className="muted small">
                  type: {p.projectTypeId} · target: {(() => {
                    try { return JSON.parse(p.targetLevels).join(", "); } catch { return p.targetLevels; }
                  })()}
                </div>
                <div style={{ marginTop: 6 }}>
                  {!p.isLatest && (
                    <button
                      className="btn btn-secondary"
                      style={{ marginRight: 8 }}
                      onClick={() => versionProfile(p.version)}
                      disabled={busy}
                      data-testid={`qp-version-${p.id}`}
                    >
                      Promote to latest
                    </button>
                  )}
                  <button
                    className="btn btn-secondary"
                    onClick={() => deleteProfile(p.id)}
                    disabled={busy}
                    data-testid={`qp-delete-${p.id}`}
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <h2>New profile</h2>
      <form className="card" onSubmit={createProfile} data-testid="qp-create-form">
        <label>Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} data-testid="qp-name" />
        <label>Project type</label>
        <select value={projectTypeId} onChange={(e) => setProjectTypeId(e.target.value)} data-testid="qp-projecttype">
          {PROJECT_TYPES.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <label>Dimensions (JSON array)</label>
        <textarea value={dimensions} onChange={(e) => setDimensions(e.target.value)} rows={3} data-testid="qp-dimensions" />
        <label>Mandatory dimensions (JSON array of ids)</label>
        <textarea value={mandatory} onChange={(e) => setMandatory(e.target.value)} rows={2} data-testid="qp-mandatory" />
        <label>Target levels (JSON array)</label>
        <select
          multiple
          value={[]}
          onChange={(e) => setTargetLevels(JSON.stringify(Array.from(e.target.selectedOptions).map((o) => o.value)))}
          data-testid="qp-targetlevels"
        >
          {QUALITY_LEVELS.map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <label>Status</label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="qp-status">
          <option value="DRAFT">DRAFT</option>
          <option value="APPROVED">APPROVED</option>
          <option value="SUPERSEDED">SUPERSEDED</option>
        </select>
        {error && <div className="error" data-testid="qp-error">{error}</div>}
        <div style={{ marginTop: 12 }}>
          <button className="btn" type="submit" disabled={busy || !projectId} data-testid="qp-submit">Create Profile</button>
        </div>
      </form>
    </div>
  );
}
