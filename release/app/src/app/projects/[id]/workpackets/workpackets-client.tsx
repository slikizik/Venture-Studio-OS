"use client";

import { useState } from "react";

export interface WorkPacketView {
  id: string;
  title: string;
  status: string;
  priority: string;
  objective: string;
  scope: string;
  exclusions: string;
  expectedOutputs: string;
  versionNumber: number;
  queueStatus: string | null;
}

const SUBMITTABLE = ["DRAFT", "REVISION_REQUESTED"];

export default function WorkPacketsClient({ projectId, packets }: { projectId: string; packets: WorkPacketView[] }) {
  const [title, setTitle] = useState("");
  const [objective, setObjective] = useState("");
  const [scope, setScope] = useState("");
  const [exclusions, setExclusions] = useState("");
  const [outputs, setOutputs] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<WorkPacketView[]>(packets);

  async function create() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/workpackets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          title,
          objective,
          scope,
          exclusions,
          expectedOutputs: outputs.split("\n").map((s) => s.trim()).filter(Boolean),
          priority,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setList([...list, data.packet]);
      setTitle(""); setObjective(""); setScope(""); setExclusions(""); setOutputs("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function submit(id: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/workpackets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "submit", actor: "USER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "submit failed");
      setList(list.map((p) => (p.id === id ? data.packet : p)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function approve(id: string, decision: "APPROVED" | "CHANGES_REQUESTED") {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/workpackets/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve", reviewedBy: "USER", decision }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "approve failed");
      setList(list.map((p) => (p.id === id ? data.packet : p)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>New work packet</h3>
        <div className="row">
          <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="wp-title" />
          <select value={priority} onChange={(e) => setPriority(e.target.value)} data-testid="wp-priority">
            <option value="LOW">LOW</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="HIGH">HIGH</option>
            <option value="CRITICAL">CRITICAL</option>
          </select>
        </div>
        <textarea placeholder="Objective (1-500)" value={objective} onChange={(e) => setObjective(e.target.value)} data-testid="wp-objective" />
        <textarea placeholder="In scope (1-2000)" value={scope} onChange={(e) => setScope(e.target.value)} data-testid="wp-scope" />
        <textarea placeholder="Out of scope / exclusions (1-2000)" value={exclusions} onChange={(e) => setExclusions(e.target.value)} data-testid="wp-exclusions" />
        <textarea placeholder="Expected outputs (one per line)" value={outputs} onChange={(e) => setOutputs(e.target.value)} data-testid="wp-outputs" />
        <button className="btn" onClick={create} disabled={busy} data-testid="wp-create">Create</button>
        {error && <div className="error" data-testid="wp-error">{error}</div>}
      </div>

      <h2>Packets</h2>
      <div className="card">
        {list.length === 0 ? <div className="empty">No work packets yet.</div> : (
          <ul>
            {list.map((p) => (
              <li key={p.id} data-testid={`workpacket-${p.id}`} style={{ marginBottom: 12 }}>
                <span className={`badge badge-${p.status.toLowerCase()}`}>{p.status}</span>{" "}
                <strong>{p.title}</strong> <span className="muted small">({p.priority})</span>
                <span className="muted small"> v{p.versionNumber}</span>
                {p.queueStatus && <span className="muted small"> · queue: {p.queueStatus}</span>}
                <div className="muted small">{p.objective}</div>
                <div className="row">
                  {SUBMITTABLE.includes(p.status) && (
                    <button className="btn btn-secondary" onClick={() => submit(p.id)} disabled={busy} data-testid={`wp-submit-${p.id}`}>Submit</button>
                  )}
                  {p.status === "IN_REVIEW" && (
                    <>
                      <button className="btn btn-secondary" onClick={() => approve(p.id, "APPROVED")} disabled={busy} data-testid={`wp-approve-${p.id}`}>Approve</button>
                      <button className="btn btn-secondary" onClick={() => approve(p.id, "CHANGES_REQUESTED")} disabled={busy} data-testid={`wp-changes-${p.id}`}>Request changes</button>
                    </>
                  )}
                  {p.status === "APPROVED" && <span className="muted small">✓ approved</span>}
                  {p.status === "REVISION_REQUESTED" && <span className="muted small">↺ changes requested</span>}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
