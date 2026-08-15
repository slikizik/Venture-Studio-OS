"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function EditProjectClient(props: {
  projectId: string;
  initialName: string;
  initialSummary: string;
  initialStatus: string;
  initialOwner: string;
  initialTargetDate: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(props.initialName);
  const [summary, setSummary] = useState(props.initialSummary);
  const [status, setStatus] = useState(props.initialStatus);
  const [owner, setOwner] = useState(props.initialOwner);
  const [targetDate, setTargetDate] = useState(props.initialTargetDate);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    const res = await fetch(`/api/projects/${props.projectId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, summary, status, ownerName: owner,
        targetDate: targetDate ? `${targetDate}T00:00` : null,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Update failed");
      return;
    }
    setOpen(false);
    router.refresh();
  }

  return (
    <div className="card" data-testid="edit-project">
      <div className="row">
        <h2>Edit project</h2>
        <button className="btn btn-secondary" onClick={() => setOpen((o) => !o)}>{open ? "Cancel" : "Edit"}</button>
      </div>
      {open && (
        <div>
          <label>Name</label>
          <input value={name} maxLength={150} onChange={(e) => setName(e.target.value)} data-testid="edit-name" />
          <label>Summary</label>
          <textarea value={summary} maxLength={500} onChange={(e) => setSummary(e.target.value)} />
          <label>Status</label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} data-testid="edit-status">
            <option>DRAFT</option><option>ACTIVE</option><option>PAUSED</option><option>COMPLETED</option><option>ARCHIVED</option>
          </select>
          <label>Owner</label>
          <input value={owner} maxLength={120} onChange={(e) => setOwner(e.target.value)} />
          <label>Target date</label>
          <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} />
          {error && <div className="error">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} onClick={save} data-testid="edit-save">Save</button>
        </div>
      )}
    </div>
  );
}
