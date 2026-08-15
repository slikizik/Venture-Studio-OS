"use client";

import { useState } from "react";

export interface ReviewView {
  id: string;
  workPacketId: string;
  reviewerName: string;
  status: string;
  summary: string;
  submittedVersion: number;
  decidedAt: Date | null;
  comments: { id: string; authorName: string; body: string }[];
}

export default function ReviewsClient({ projectId, initial }: { projectId: string; initial: ReviewView[] }) {
  const [list, setList] = useState<ReviewView[]>(initial);
  const [workPacketId, setWorkPacketId] = useState("");
  const [reviewer, setReviewer] = useState("REVIEWER");
  const [version, setVersion] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function create() {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workPacketId,
          reviewerName: reviewer,
          submittedVersion: Number(version),
          criteria: [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "create failed");
      setList([...list, data.review]);
      setWorkPacketId("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function decide(id: string, decision: "APPROVED" | "REVISION_REQUESTED" | "REJECTED") {
    setBusy(true); setError(null);
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "decide", decision, decidedBy: "REVIEWER" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "decide failed");
      setList(list.map((r) => (r.id === id ? data.review : r)));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="card">
        <h3>New review</h3>
        <input placeholder="Work packet id" value={workPacketId} onChange={(e) => setWorkPacketId(e.target.value)} data-testid="rv-workpacket" />
        <input placeholder="Reviewer" value={reviewer} onChange={(e) => setReviewer(e.target.value)} data-testid="rv-reviewer" />
        <input placeholder="Submitted version" value={version} onChange={(e) => setVersion(e.target.value)} data-testid="rv-version" />
        <button className="btn" onClick={create} disabled={busy} data-testid="rv-create">Create</button>
        {error && <div className="error" data-testid="rv-error">{error}</div>}
      </div>

      <h2>Reviews</h2>
      <div className="card">
        {list.length === 0 ? <div className="empty">No reviews yet.</div> : (
          <ul>
            {list.map((r) => (
              <li key={r.id} data-testid={`review-${r.id}`} style={{ marginBottom: 12 }}>
                <span className={`badge badge-${r.status.toLowerCase()}`}>{r.status}</span>{" "}
                <strong>{r.reviewerName}</strong> <span className="muted small">v{r.submittedVersion}</span>
                <div className="muted small">{r.summary}</div>
                {r.comments.length > 0 && (
                  <ul className="muted small">
                    {r.comments.map((c) => <li key={c.id}>{c.authorName}: {c.body}</li>)}
                  </ul>
                )}
                {r.status === "PENDING" && (
                  <div className="row">
                    <button className="btn btn-secondary" onClick={() => decide(r.id, "APPROVED")} disabled={busy} data-testid={`rv-approve-${r.id}`}>Approve</button>
                    <button className="btn btn-secondary" onClick={() => decide(r.id, "REVISION_REQUESTED")} disabled={busy} data-testid={`rv-revise-${r.id}`}>Request revision</button>
                    <button className="btn btn-secondary" onClick={() => decide(r.id, "REJECTED")} disabled={busy} data-testid={`rv-reject-${r.id}`}>Reject</button>
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
