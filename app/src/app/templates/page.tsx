import Link from "next/link";
import { BUILT_IN_TEMPLATES } from "@/lib/templates";
import { listCustomTemplates } from "@/lib/customTemplates";

export const dynamic = "force-dynamic";

export default async function TemplatesPage() {
  const builtIns = BUILT_IN_TEMPLATES;
  const custom = await listCustomTemplates();

  return (
    <div data-testid="templates-page">
      <div className="row">
        <h1>Templates</h1>
        <Link className="btn" href="/templates/new" data-testid="new-template-link">New Custom Template</Link>
      </div>

      <h2>Built-in templates</h2>
      <div className="grid grid-cols-3">
        {builtIns.map((t) => (
          <div key={t.id} className="card" data-testid={`builtin-${t.id}`}>
            <h3>{t.name}</h3>
            <p className="muted small">{t.description}</p>
            <div className="muted small">
              {t.stages.length} stage{t.stages.length === 1 ? "" : "s"} ·{" "}
              {(t.deliverables ?? []).length} deliverable{(t.deliverables ?? []).length === 1 ? "" : "s"} ·{" "}
              {(t.gates ?? []).length} gate{(t.gates ?? []).length === 1 ? "" : "s"}
            </div>
          </div>
        ))}
      </div>

      <h2>Custom templates</h2>
      {custom.length === 0 ? (
        <div className="card empty">No custom templates yet.</div>
      ) : (
        <div className="grid grid-cols-3">
          {custom.map((t) => (
            <div key={t.id} className="card" data-testid={`custom-${t.id}`}>
              <h3>{t.name} <span className="badge">v{t.version}</span></h3>
              <p className="muted small">{t.description ?? ""}</p>
              <div className="muted small">
                {t.definition.stages.length} stage{t.definition.stages.length === 1 ? "" : "s"} ·{" "}
                {t.definition.deliverables.length} deliverable{t.definition.deliverables.length === 1 ? "" : "s"}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 16 }}>
        <Link className="btn btn-secondary" href="/quality-profiles">Quality Profiles</Link>
      </div>
    </div>
  );
}
