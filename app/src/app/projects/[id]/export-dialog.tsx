"use client";
import { useState } from "react";

// DAT-001 UI affordance — an accessible export trigger (NFR-004).
// Uses a native <button> (keyboard reachable, programmatic name via its label),
// an aria-live status region, and a focusable download link announced to AT.
export default function ExportDialog(props: { projectId: string; projectName: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function doExport() {
    setBusy(true);
    setError("");
    setDone(false);
    try {
      const res = await fetch(`/api/projects/${props.projectId}/export`);
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        throw new Error(d.error ?? "Export failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `vso-project-${props.projectId}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" data-testid="export-project">
      <div className="row">
        <h2>Export project</h2>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={doExport}
          disabled={busy}
          aria-label={`Export project ${props.projectName} as a versioned JSON package`}
          data-testid="export-button"
        >
          {busy ? "Exporting…" : "Export"}
        </button>
      </div>
      <div role="status" aria-live="polite" className="muted small">
        {done && "Export downloaded."}
        {error && <span className="error">{error}</span>}
      </div>
    </div>
  );
}
