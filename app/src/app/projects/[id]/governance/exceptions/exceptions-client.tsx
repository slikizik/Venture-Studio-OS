"use client";

import { useState } from "react";

export interface ExceptionView {
  id: string;
  classification: string;
  title: string;
  status: string;
  resolvedBy: string;
}

export default function ExceptionsClient({ projectId, initial }: { projectId: string; initial: ExceptionView[] }) {
  const [list, setList] = useState<ExceptionView[]>(initial);
  const [title, setTitle] = useState("");
  const [classification, setClassification] = useState("RECOVERABLE");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/exceptions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId, title, classification }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setList([...list, data.exception]);
      setTitle("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function resolve(id: string, status: string, resolvedBy: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/exceptions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, resolvedBy }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "resolve failed");
      setList(list.map((x) => (x.id === id ? data.exception : x)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>New exception</h3>
        <input placeholder="Title" value={title} onChange={(e) => setTitle(e.target.value)} data-testid="ex-title" />
        <select value={classification} onChange={(e) => setClassification(e.target.value)} data-testid="ex-class">
          <option value="RECOVERABLE">RECOVERABLE</option>
          <option value="ASSUMPTION">ASSUMPTION</option>
          <option value="DIRECTION_REQUIRED">DIRECTION_REQUIRED</option>
          <option value="CRITICAL">CRITICAL</option>
        </select>
        <button className="btn" onClick={create} disabled={busy} data-testid="ex-create">Classify</button>
        {error && <div className="error" data-testid="ex-error">{error}</div>}
      </div>

      <h2>Exceptions</h2>
      <div className="card">
        {list.length === 0 ? <div className="empty">No exceptions yet.</div> : (
          <ul>
            {list.map((e) => (
              <li key={e.id} data-testid={`exception-${e.id}`} style={{ marginBottom: 12 }}>
                <span className={`badge badge-${e.status.toLowerCase()}`}>{e.status}</span>{" "}
                <strong>{e.title}</strong> <span className="muted small">({e.classification})</span>
                {e.status === "OPEN" && (
                  <div className="row">
                    <button className="btn btn-secondary" onClick={() => resolve(e.id, "RESOLVED", "OWNER")} disabled={busy} data-testid={`ex-resolve-${e.id}`}>Resolve</button>
                    <button className="btn btn-secondary" onClick={() => resolve(e.id, "ACCEPTED", "OWNER")} disabled={busy} data-testid={`ex-accept-${e.id}`}>Accept</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
