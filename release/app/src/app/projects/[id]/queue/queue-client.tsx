"use client";

import { useState } from "react";

export interface QueueItemView {
  id: string;
  workPacketId: string;
  order: number;
  queueStatus: string;
  dependsOnId: string | null;
  readiness: string;
  effectiveStatus: string;
  title: string;
}

export interface PacketView {
  id: string;
  title: string;
}

export default function QueueClient({ projectId, items, packets }: { projectId: string; items: QueueItemView[]; packets: PacketView[] }) {
  const [workPacketId, setWorkPacketId] = useState("");
  const [order, setOrder] = useState(0);
  const [dependsOnId, setDependsOnId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [list, setList] = useState<QueueItemView[]>(items);

  async function enqueue() {
    if (!workPacketId) { setError("Select a work packet"); return; }
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/queue`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          workPacketId,
          order: Number(order),
          dependsOnId: dependsOnId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "enqueue failed");
      setList([...list, { ...data.item, title: packets.find((p) => p.id === workPacketId)?.title ?? "" }]);
      setWorkPacketId(""); setDependsOnId("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function setState(itemId: string, queueStatus: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/queue/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "update failed");
      setList(list.map((q) => (q.id === itemId ? { ...q, queueStatus: data.item.queueStatus, effectiveStatus: data.item.queueStatus } : q)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(itemId: string) {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/queue/${itemId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("remove failed");
      setList(list.filter((q) => q.id !== itemId));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>Enqueue work packet</h3>
        <div className="row">
          <select value={workPacketId} onChange={(e) => setWorkPacketId(e.target.value)} data-testid="q-packet">
            <option value="">— select —</option>
            {packets.map((p) => <option key={p.id} value={p.id}>{p.title}</option>)}
          </select>
          <input type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} data-testid="q-order" style={{ width: 80 }} />
          <select value={dependsOnId} onChange={(e) => setDependsOnId(e.target.value)} data-testid="q-depends">
            <option value="">— no dependency —</option>
            {list.map((q) => <option key={q.id} value={q.id}>{q.title} (#{q.order})</option>)}
          </select>
          <button className="btn" onClick={enqueue} disabled={busy} data-testid="q-enqueue">Enqueue</button>
        </div>
        {error && <div className="error" data-testid="q-error">{error}</div>}
      </div>

      <h2>Ordered queue</h2>
      <div className="card">
        {list.length === 0 ? <div className="empty">Queue is empty.</div> : (
          <ol>
            {[...list].sort((a, b) => a.order - b.order).map((q) => (
              <li key={q.id} data-testid={`queue-item-${q.id}`} style={{ marginBottom: 8 }}>
                <span className={`badge badge-${(q.effectiveStatus || q.queueStatus).toLowerCase()}`}>{q.effectiveStatus || q.queueStatus}</span>{" "}
                <strong>{q.title}</strong>
                <span className="muted small"> · {q.readiness}</span>
                {q.dependsOnId && <span className="muted small"> · depends on {q.dependsOnId.slice(0, 8)}</span>}
                <div className="row">
                  <select value={q.queueStatus} onChange={(e) => setState(q.id, e.target.value)} data-testid={`q-status-${q.id}`}>
                    {["NOT_STARTED", "READY", "IN_PROGRESS", "IN_REVIEW", "BLOCKED", "COMPLETE", "DEFERRED"].map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                  <button className="btn btn-secondary" onClick={() => remove(q.id)} disabled={busy} data-testid={`q-remove-${q.id}`}>Remove</button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
