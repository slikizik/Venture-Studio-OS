"use client";

import { useState } from "react";

export interface DirectionView {
  id: string;
  title: string;
  question: string;
  status: string;
  severity: string;
  resolution: string;
  decidedBy: string;
}

export default function DirectionClient({ projectId, initial }: { projectId: string; initial: DirectionView[] }) {
  const [list, setList] = useState<DirectionView[]>(initial);
  const [title, setTitle] = useState("");
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/direction-requests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, question }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setList([...list, data.directionRequest]);
      setTitle(""); setQuestion("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function answer(id: string, resolution: string, decidedBy: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/direction-requests/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolution, decidedBy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "answer failed");
      setList(list.map((x) => (x.id === id ? data.directionRequest : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Raise direction request</h3>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="dr-title" />
        <textarea placeholder="Question" value={question} onChange={(e) => setQuestion(e.target.value)} data-testid="dr-question" />
        <button className="btn" onClick={create} disabled={busy} data-testid="dr-create">Raise</button>
        {error && <div className="error" data-testid="dr-error">{error}</div>}
      </div>

      <h2>Direction Requests</h2>
      <div className="card">
        {list.length === 0 ? <div className="empty">No direction requests yet.</div> : (
          <ul>
            {list.map((d) => (
              <li key={d.id} data-testid={`direction-${d.id}`} style={{ marginBottom: 12 }}>
                <span className={`badge badge-${d.status.toLowerCase()}`}>{d.status}</span>{" "}
                <strong>{d.title}</strong> <span className="muted small">({d.severity})</span>
                <div className="muted small">{d.question}</div>
                {d.status === "OPEN" && (
                  <div className="row">
                    <input placeholder="Owner resolution" data-testid={`dr-resolution-${d.id}`}
                      onChange={(e) => answer(d.id, e.target.value, "OWNER")} disabled={busy} />
                  </div>
                )}
                {d.status === "ANSWERED" && <div className="muted small">→ {d.resolution} ({d.decidedBy})</div>}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
