"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const DEFAULT_DEF = {
  key: "my-template",
  name: "My Custom Flow",
  description: "Describe this template",
  projectTypeId: "STANDARD_VENTURE",
  stages: [{ name: "Discovery", order: 1, entryCriteria: [], exitCriteria: [] }],
  deliverables: [
    {
      key: "d1",
      title: "Scoping doc",
      type: "DOCUMENT",
      priority: "HIGH",
      order: 1,
      weight: 1,
      dependsOn: [],
    },
  ],
  gates: [{ level: "STAGE", name: "Discovery gate", criteria: [], order: 1 }],
  brainSections: [{ section: "VISION", title: "Vision", content: "", order: 1 }],
  qualityProfile: {
    name: "Default Profile",
    projectTypeId: "STANDARD_VENTURE",
    dimensions: [{ id: "functional", name: "Functional" }],
    mandatoryDimensions: ["functional"],
    targetLevels: ["COMMERCIAL"],
  },
};

export default function NewTemplateClient() {
  const router = useRouter();
  const [projectId, setProjectId] = useState("");
  const [json, setJson] = useState(JSON.stringify(DEFAULT_DEF, null, 2));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreated(null);
    let definition: unknown;
    try {
      definition = JSON.parse(json);
    } catch {
      setError("Definition is not valid JSON.");
      return;
    }
    setBusy(true);
    try {
      // 1) validate the definition shape
      const vres = await fetch("/api/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(definition),
      });
      if (!vres.ok) {
        const d = await vres.json().catch(() => ({}));
        throw new Error(d.error || "validation failed");
      }
      // 2) create the custom template
      const cres = await fetch("/api/templates/custom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ projectId: projectId || null, definition }),
      });
      const cd = await cres.json();
      if (!cres.ok) throw new Error(cd.error || "create failed");
      setCreated(cd.template.id);
      setTimeout(() => router.push("/templates"), 600);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form className="card" onSubmit={onSubmit} data-testid="new-template-form">
      <label>Scope to project (optional)</label>
      <input
        placeholder="project id (leave blank for org-wide)"
        value={projectId}
        onChange={(e) => setProjectId(e.target.value)}
        data-testid="field-projectid"
      />
      <label>Definition (TemplateDef JSON)</label>
      <textarea
        value={json}
        onChange={(e) => setJson(e.target.value)}
        rows={24}
        style={{ fontFamily: "monospace", fontSize: 12 }}
        data-testid="field-definition"
      />
      {error && <div className="error" data-testid="new-template-error">{error}</div>}
      {created && <div className="success" data-testid="new-template-success">Created {created}</div>}
      <div style={{ marginTop: 16 }}>
        <button className="btn" type="submit" disabled={busy} data-testid="submit-template">Create Template</button>
        <Link className="btn btn-secondary" style={{ marginLeft: 8 }} href="/templates">Cancel</Link>
      </div>
    </form>
  );
}
