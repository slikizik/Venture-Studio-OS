"use client";

import { useState } from "react";

export interface DecisionView {
  id: string;
  decisionId: string;
  title: string;
  selectedOption: string;
  decidedBy: string;
  decidedAt: Date | null;
}

export default function DecisionsClient({ projectId, initial }: { projectId: string; initial: DecisionView[] }) {
  const [list, setList] = useState<DecisionView[]>(initial);
  const [decisionId, setDecisionId] = useState("");
  const [title, setTitle] = useState("");
  const [context, setContext] = useState("");
  const [options, setOptions] = useState("A,B");
  const [selected, setSelected] = useState("A");
  const [rationale, setRationale] = useState("");
  const [decidedBy, setDecidedBy] = useState("OWNER");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      const opts = options.split(",").map((s) => s.trim()).filter(Boolean).map((o) => ({ id: o, label: o }));
      const res = await fetch(`/api/decisions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          decisionId,
          title,
          context,
          options: opts,
          selectedOption: selected,
          rationale,
          decidedBy,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setList([...list, data.decision]);
      setDecisionId(""); setTitle(""); setContext(""); setRationale("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>New decision</h3>
        <input placeholder="Decision id (e.g. DEC-1)" value={decisionId} onChange={(e) => setDecisionId(e.target.value)} data-testid="dec-id" />
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="dec-title" />
        <textarea placeholder="Context" value={context} onChange={(e) => setContext(e.target.value)} data-testid="dec-context" />
        <input placeholder="Options (comma separated)" value={options} onChange={(e) => setOptions(e.target.value)} data-testid="dec-options" />
        <input placeholder="Selected option" value={selected} onChange={(e) => setSelected(e.target.value)} data-testid="dec-selected" />
        <textarea placeholder="Rationale" value={rationale} onChange={(e) => setRationale(e.target.value)} data-testid="dec-rationale" />
        <input placeholder="Decided by" value={decidedBy} onChange={(e) => setDecidedBy(e.target.value)} data-testid="dec-by" />
        <button className="btn" onClick={create} disabled={busy} data-testid="dec-create">Record</button>
        {error && <div className="error" data-testid="dec-error">{error}</div>}
      </div>

      <h2>Decisions</h2>
      <div className="card">
        {list.length === 0 ? <div className="empty">No decisions yet.</div> : (
          <ul>
            {list.map((d) => (
              <li key={d.id} data-testid={`decision-${d.id}`} style={{ marginBottom: 12 }}>
                <strong>{d.decisionId}</strong> — {d.title} <span className="muted small">({d.selectedOption})</span>
                <div className="muted small">by {d.decidedBy}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
