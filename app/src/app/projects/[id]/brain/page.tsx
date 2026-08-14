"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface BrainEntry { id: string; section: string; title: string; content: string; order: number; }

const SECTIONS = ["VISION", "AUDIENCE", "PROBLEM", "OUTCOMES", "CONSTRAINTS", "NON_GOALS", "SUCCESS_METRICS", "TERMINOLOGY", "COMMERCIAL_MODEL", "REFERENCES"];

export default function BrainPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [entries, setEntries] = useState<BrainEntry[]>([]);
  const [active, setActive] = useState(SECTIONS[0]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch(`/api/projects/${projectId}/brain`);
    const d = await res.json();
    setEntries(d.brainEntries ?? []);
  }
  useEffect(() => { load(); }, [projectId]);

  const current = entries.find((e) => e.section === active);

  async function save() {
    setError("");
    const res = await fetch(`/api/projects/${projectId}/brain`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ section: active, title: title || active, content, order: 0 }),
    });
    if (!res.ok) { setError("Save failed"); return; }
    setTitle(""); setContent(""); load();
  }

  return (
    <div data-testid="brain-page">
      <div className="row">
        <h1>Project Brain</h1>
        <Link className="btn btn-secondary" href={`/projects/${projectId}`}>Back</Link>
      </div>
      <div className="card" style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {SECTIONS.map((s) => (
          <button key={s} className={s === active ? "btn" : "btn btn-secondary"} onClick={() => setActive(s)} data-testid={`brain-tab-${s}`}>{s}</button>
        ))}
      </div>
      <div className="card">
        <h3>{active}</h3>
        {current ? <p><strong>{current.title}</strong></p> : <p className="muted small">No entry yet.</p>}
        <label>Content (markdown)</label>
        <textarea value={content} rows={6} onChange={(e) => setContent(e.target.value)} data-testid="brain-content" placeholder={current?.content ?? ""} />
        <label>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={current?.title ?? active} data-testid="brain-title" />
        {error && <div className="error">{error}</div>}
        <button className="btn" style={{ marginTop: 12 }} onClick={save} data-testid="brain-save">Save section</button>
      </div>
    </div>
  );
}
