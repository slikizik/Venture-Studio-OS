"use client";

import { useState } from "react";

export interface LearningView {
  id: string;
  sourceType: string;
  summary: string;
  status: string;
  convertedReference: string;
}

export default function LearningsClient({ projectId, initial }: { projectId: string; initial: LearningView[] }) {
  const [list, setList] = useState<LearningView[]>(initial);
  const [summary, setSummary] = useState("");
  const [sourceType, setSourceType] = useState("FEEDBACK");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/learnings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, summary, sourceType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setList([...list, data.learning]);
      setSummary("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function convert(id: string, target: string, reference: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/learnings/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target, reference }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "convert failed");
      setList(list.map((x) => (x.id === id ? data.learning : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>New learning</h3>
        <textarea placeholder="Summary" value={summary} onChange={(e) => setSummary(e.target.value)} data-testid="ln-summary" />
        <select value={sourceType} onChange={(e) => setSourceType(e.target.value)} data-testid="ln-source">
          <option value="BUG">BUG</option>
          <option value="FEEDBACK">FEEDBACK</option>
          <option value="TEST_FAILURE">TEST_FAILURE</option>
          <option value="BENCHMARK_GAP">BENCHMARK_GAP</option>
          <option value="USABILITY">USABILITY</option>
          <option value="COMMERCIAL_INSIGHT">COMMERCIAL_INSIGHT</option>
          <option value="AGENT_FAILURE">AGENT_FAILURE</option>
          <option value="RETROSPECTIVE">RETROSPECTIVE</option>
        </select>
        <button className="btn" onClick={create} disabled={busy} data-testid="ln-create">Capture</button>
        {error && <div className="error" data-testid="ln-error">{error}</div>}
      </div>

      <h2>Learnings</h2>
      <div className="card">
        {list.length === 0 ? <div className="empty">No learnings yet.</div> : (
          <ul>
            {list.map((l) => (
              <li key={l.id} data-testid={`learning-${l.id}`} style={{ marginBottom: 12 }}>
                <span className={`badge badge-${l.status.toLowerCase()}`}>{l.status}</span>{" "}
                <strong>{l.summary}</strong> <span className="muted small">({l.sourceType})</span>
                {l.status === "NEW" && (
                  <div className="row">
                    <button className="btn btn-secondary" onClick={() => convert(l.id, "REQUIREMENT", "REQ-NEW")} disabled={busy} data-testid={`ln-conv-req-${l.id}`}>→ Requirement</button>
                    <button className="btn btn-secondary" onClick={() => convert(l.id, "BACKLOG", "BL-NEW")} disabled={busy} data-testid={`ln-conv-bl-${l.id}`}>→ Backlog</button>
                    <button className="btn btn-secondary" onClick={() => convert(l.id, "CHANGE_REQUEST", "CR-NEW")} disabled={busy} data-testid={`ln-conv-cr-${l.id}`}>→ Change Request</button>
                  </div>
                )}
                {l.status === "CONVERTED" && <div className="muted small">→ {l.convertedReference}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
