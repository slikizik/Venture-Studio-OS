"use client";

import { useState } from "react";

export interface LinkView {
  id: string;
  requirementId: string;
  requirementText: string;
  targetType: string;
  deliverableId: string | null;
  workPacketId: string | null;
  isExclusion: boolean;
  dependencyDetail: string | null;
  expectedEvidence: string | null;
}

export interface DeliverableView {
  id: string;
  title: string;
}

export default function RequirementsClient({ projectId, links, deliverables }: { projectId: string; links: LinkView[]; deliverables: DeliverableView[] }) {
  const [requirementId, setRequirementId] = useState("");
  const [requirementText, setRequirementText] = useState("");
  const [targetType, setTargetType] = useState("DELIVERABLE");
  const [deliverableId, setDeliverableId] = useState("");
  const [isExclusion, setIsExclusion] = useState(false);
  const [dependencyDetail, setDependencyDetail] = useState("");
  const [expectedEvidence, setExpectedEvidence] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<LinkView[]>(links);

  async function add() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/requirements/links`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          requirementId,
          requirementText,
          targetType,
          deliverableId: targetType === "DELIVERABLE" ? deliverableId || undefined : undefined,
          isExclusion,
          dependencyDetail: dependencyDetail || undefined,
          expectedEvidence: expectedEvidence || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "add failed");
      setList([...list, data.link]);
      setRequirementId(""); setRequirementText(""); setDependencyDetail(""); setExpectedEvidence("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Map requirement</h3>
        <div className="row">
          <input placeholder="Requirement ID (e.g. REQ-1)" value={requirementId} onChange={(e) => setRequirementId(e.target.value)} data-testid="r-id" />
          <input placeholder="Requirement text" value={requirementText} onChange={(e) => setRequirementText(e.target.value)} data-testid="r-text" style={{ flex: 2 }} />
        </div>
        <div className="row">
          <select value={targetType} onChange={(e) => setTargetType(e.target.value)} data-testid="r-type">
            <option value="DELIVERABLE">DELIVERABLE</option>
            <option value="WORK_PACKET">WORK_PACKET</option>
            <option value="PROJECT">PROJECT</option>
          </select>
          {targetType === "DELIVERABLE" && (
            <select value={deliverableId} onChange={(e) => setDeliverableId(e.target.value)} data-testid="r-deliverable">
              <option value="">— select deliverable —</option>
              {deliverables.map((d) => <option key={d.id} value={d.id}>{d.title}</option>)}
            </select>
          )}
          <label className="muted small"><input type="checkbox" checked={isExclusion} onChange={(e) => setIsExclusion(e.target.checked)} data-testid="r-exclusion" /> exclusion</label>
        </div>
        <textarea placeholder="Dependency detail (optional)" value={dependencyDetail} onChange={(e) => setDependencyDetail(e.target.value)} data-testid="r-dep" />
        <textarea placeholder="Expected evidence (optional)" value={expectedEvidence} onChange={(e) => setExpectedEvidence(e.target.value)} data-testid="r-evidence" />
        <button className="btn" onClick={add} disabled={busy} data-testid="r-add">Add link</button>
        {error && <div className="error" data-testid="r-error">{error}</div>}
      </div>

      <h2>Links</h2>
      <div className="card">
        {list.length === 0 ? <div className="empty">No requirement links yet.</div> : (
          <ul>
            {list.map((l) => (
              <li key={l.id} data-testid={`req-link-${l.id}`} style={{ marginBottom: 8 }}>
                <strong>{l.requirementId}</strong> <span className="muted small">{l.targetType}{l.isExclusion ? " · EXCLUDED" : ""}</span>
                <div className="muted small">{l.requirementText}</div>
                {l.dependencyDetail && <div className="muted small">dep: {l.dependencyDetail}</div>}
                {l.expectedEvidence && <div className="muted small">evidence: {l.expectedEvidence}</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
