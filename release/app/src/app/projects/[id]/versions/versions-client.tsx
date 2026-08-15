"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface VRow {
  id: string;
  label: string;
  type: string;
  status: string;
  changeSummary: string;
  createdAt: string;
}

export default function VersionsClient(props: { projectId: string; versions: VRow[] }) {
  const router = useRouter();
  const [label, setLabel] = useState("");
  const [versionType, setVersionType] = useState("DEVELOPMENT");
  const [changeSummary, setChangeSummary] = useState("");
  const [error, setError] = useState("");

  async function record() {
    setError("");
    if (!label.trim()) { setError("Label is required"); return; }
    const res = await fetch("/api/versions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: props.projectId,
        versionLabel: label.trim(),
        versionType,
        changeSummary,
        status: "DRAFT",
        createdBy: "OWNER",
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Record failed");
      return;
    }
    setLabel(""); setChangeSummary("");
    router.refresh();
  }

  async function act(id: string, action: "approve" | "release") {
    const res = await fetch(`/api/versions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Action failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card" data-testid="versions-client">
      <h2>Record version</h2>
      <div className="row">
        <input data-testid="version-label" placeholder="Label (e.g. v0.2.0)" value={label} maxLength={80} onChange={(e) => setLabel(e.target.value)} />
        <select data-testid="version-type" value={versionType} onChange={(e) => setVersionType(e.target.value)}>
          <option>OFFICIAL</option><option>DEVELOPMENT</option><option>TEST</option><option>RELEASED</option>
        </select>
        <input data-testid="version-summary" placeholder="Change summary" value={changeSummary} onChange={(e) => setChangeSummary(e.target.value)} style={{ flex: 1 }} />
        <button className="btn" onClick={record} data-testid="version-record">Record</button>
      </div>
      {error && <div className="error" data-testid="version-error">{error}</div>}

      <h2>Actions</h2>
      <table>
        <thead><tr><th>Label</th><th>Type</th><th>Status</th><th>Approve</th><th>Release</th></tr></thead>
        <tbody>
          {props.versions.map((v) => (
            <tr key={v.id} data-testid={`version-row-${v.id}`}>
              <td>{v.label}</td>
              <td>{v.type}</td>
              <td>{v.status}</td>
              <td>
                <button className="btn btn-secondary" data-testid={`approve-${v.id}`} disabled={v.status === "APPROVED" || v.status === "RELEASED"} onClick={() => act(v.id, "approve")}>Approve</button>
              </td>
              <td>
                <button className="btn btn-secondary" data-testid={`release-${v.id}`} disabled={v.status === "RELEASED"} onClick={() => act(v.id, "release")}>Release</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
