"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { BUILT_IN_TEMPLATES } from "@/lib/templates";

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [templateId, setTemplateId] = useState("blank");
  const [targetDate, setTargetDate] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const selected = BUILT_IN_TEMPLATES.find((t) => t.id === templateId);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    const res = await fetch("/api/projects", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, summary, ownerName, templateId: templateId === "blank" ? null : templateId,
        targetDate: targetDate ? `${targetDate}T00:00` : null,
      }),
    });
    setBusy(false);
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Create failed");
      return;
    }
    const d = await res.json();
    router.push(`/projects/${d.project.id}`);
  }

  return (
    <div>
      <h1>Create Project</h1>
      <form className="card" onSubmit={onSubmit} data-testid="create-project-form">
        <label>Template</label>
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} data-testid="field-template">
          {BUILT_IN_TEMPLATES.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
        {selected && <p className="muted small">{selected.description}</p>}
        {selected && selected.stages.length > 0 && (
          <p className="muted small">Stages: {selected.stages.map((s) => s.name).join(" → ")}</p>
        )}

        <label>Name *</label>
        <input value={name} maxLength={150} onChange={(e) => setName(e.target.value)} required data-testid="field-name" />

        <label>Summary</label>
        <textarea value={summary} maxLength={500} onChange={(e) => setSummary(e.target.value)} data-testid="field-summary" />

        <label>Owner *</label>
        <input value={ownerName} maxLength={120} onChange={(e) => setOwnerName(e.target.value)} required data-testid="field-owner" />

        <label>Target date</label>
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} data-testid="field-targetdate" />

        {error && <div className="error" data-testid="create-error">{error}</div>}
        <div style={{ marginTop: 16 }}>
          <button className="btn" type="submit" disabled={busy} data-testid="submit-create">Create</button>
        </div>
      </form>
    </div>
  );
}
