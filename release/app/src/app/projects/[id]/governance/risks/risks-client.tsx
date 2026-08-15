"use client";

import { useState } from "react";

export interface RiskView {
  id: string;
  title: string;
  impact: string;
  likelihood: string;
  status: string;
  mitigation: string;
}

export default function RisksClient({ projectId, initial }: { projectId: string; initial: RiskView[] }) {
  const [list, setList] = useState<RiskView[]>(initial);
  const [title, setTitle] = useState("");
  const [impact, setImpact] = useState("MEDIUM");
  const [likelihood, setLikelihood] = useState("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/risks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, impact, likelihood }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setList([...list, data.risk]);
      setTitle("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function update(id: string, status: string, mitigation: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/risks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, mitigation }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "update failed");
      setList(list.map((r) => (r.id === id ? data.risk : r)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>New risk</h3>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="rk-title" />
        <select value={impact} onChange={(e) => setImpact(e.target.value)} data-testid="rk-impact">
          <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
        </select>
        <select value={likelihood} onChange={(e) => setLikelihood(e.target.value)} data-testid="rk-likelihood">
          <option value="LOW">LOW</option><option value="MEDIUM">MEDIUM</option><option value="HIGH">HIGH</option><option value="CRITICAL">CRITICAL</option>
        </select>
        <button className="btn" onClick={create} disabled={busy} data-testid="rk-create">Add</button>
        {error && <div className="error" data-testid="rk-error">{error}</div>}
      </div>

      <h2>Risks</h2>
      <div className="card">
        {list.length === 0 ? <div className="empty">No risks yet.</div> : (
          <ul>
            {list.map((r) => (
              <li key={r.id} data-testid={`risk-${r.id}`} style={{ marginBottom: 12 }}>
                <strong>{r.title}</strong> <span className="muted small">{r.impact}/{r.likelihood}</span>{" "}
                <span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span>
                <div className="row">
                  <select
                    defaultValue=""
                    onChange={(e) => { if (e.target.value) update(r.id, e.target.value, r.mitigation); }}
                    data-testid={`rk-status-${r.id}`}
                  >
                    <option value="" disabled>Set status…</option>
                    <option value="OPEN">OPEN</option>
                    <option value="MITIGATING">MITIGATING</option>
                    <option value="ACCEPTED">ACCEPTED</option>
                    <option value="CLOSED">CLOSED</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
