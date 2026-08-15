"use client";

import { useState } from "react";

export interface QualityGateView {
  id: string;
  level: string;
  entityId: string;
  outcome: string;
  evaluatedBy: string;
  evaluatedAt: Date | null;
}

export default function QualityGatesClient({ projectId, initial }: { projectId: string; initial: QualityGateView[] }) {
  const [list, setList] = useState<QualityGateView[]>(initial);
  const [level, setLevel] = useState("WORK_PACKET");
  const [entityId, setEntityId] = useState("");
  const [outcome, setOutcome] = useState("PASS");
  const [evidenceIds, setEvidenceIds] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function evaluate() {
    setBusy(true); setError(null);
    try {
      const ids = evidenceIds.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await fetch(`/api/quality-gates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          level,
          entityId,
          outcome,
          criterionResults: [],
          evidenceIds: ids,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "evaluate failed");
      setList([...list, data.gate]);
      setEntityId("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Evaluate gate</h3>
        <select value={level} onChange={(e) => setLevel(e.target.value)} data-testid="qg-level">
          <option value="WORK_PACKET">WORK_PACKET</option>
          <option value="DELIVERABLE">DELIVERABLE</option>
          <option value="STAGE">STAGE</option>
          <option value="RELEASE">RELEASE</option>
        </select>
        <input placeholder="Entity id (work packet / deliverable)" value={entityId} onChange={(e) => setEntityId(e.target.value)} data-testid="qg-entity" />
        <select value={outcome} onChange={(e) => setOutcome(e.target.value)} data-testid="qg-outcome">
          <option value="PASS">PASS</option>
          <option value="PASS_WITH_ACCEPTED_RISK">PASS_WITH_ACCEPTED_RISK</option>
          <option value="REVISION_REQUIRED">REVISION_REQUIRED</option>
          <option value="BLOCKED">BLOCKED</option>
        </select>
        <input placeholder="Evidence ids (comma separated)" value={evidenceIds} onChange={(e) => setEvidenceIds(e.target.value)} data-testid="qg-evidence" />
        <button className="btn" onClick={evaluate} disabled={busy} data-testid="qg-evaluate">Evaluate</button>
        {error && <div className="error" data-testid="qg-error">{error}</div>}
      </div>

      <h2>Gates</h2>
      <div className="card">
        {list.length === 0 ? <div className="empty">No quality gates yet.</div> : (
          <ul>
            {list.map((g) => (
              <li key={g.id} data-testid={`gate-${g.id}`} style={{ marginBottom: 12 }}>
                <span className={`badge badge-${g.outcome.toLowerCase()}`}>{g.outcome}</span>{" "}
                <strong>{g.level}</strong> <span className="muted small">@ {g.entityId}</span>
                <div className="muted small">by {g.evaluatedBy}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
