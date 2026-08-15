"use client";
import { useEffect, useState } from "react";

interface Agent { id: string; name: string; kind: string; provider: string | null; model: string | null; capabilities: string; autonomyLevel: string; status: string; queue: { queued: number; active: number }; }

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [name, setName] = useState("");
  const [kind, setKind] = useState("AI");
  const [provider, setProvider] = useState("");
  const [model, setModel] = useState("");
  const [capabilities, setCapabilities] = useState("");
  const [autonomy, setAutonomy] = useState("MANUAL");
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/agents");
    const d = await res.json();
    setAgents(d.agents ?? []);
  }
  useEffect(() => { load(); }, []);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/agents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, kind, provider: provider || null, model: model || null, capabilities: capabilities.split(",").map((s) => s.trim()).filter(Boolean), autonomyLevel: autonomy }),
    });
    if (!res.ok) { setError("Create agent failed"); return; }
    setName(""); setProvider(""); setModel(""); setCapabilities(""); load();
  }

  return (
    <div data-testid="agents-page">
      <h1>Agents</h1>
      <div className="card">
        <h2>Register agent (AGT-001)</h2>
        <form onSubmit={create}>
          <div className="grid grid-cols-3">
            <div><label>Name *</label><input value={name} onChange={(e) => setName(e.target.value)} required data-testid="agent-name" /></div>
            <div><label>Kind</label><select value={kind} onChange={(e) => setKind(e.target.value)} data-testid="agent-kind"><option>AI</option><option>HUMAN</option></select></div>
            <div><label>Autonomy</label><select value={autonomy} onChange={(e) => setAutonomy(e.target.value)}><option>MANUAL</option><option>SUPERVISED</option><option>BOUNDED_AUTONOMY</option></select></div>
            <div><label>Provider</label><input value={provider} onChange={(e) => setProvider(e.target.value)} /></div>
            <div><label>Model</label><input value={model} onChange={(e) => setModel(e.target.value)} /></div>
            <div><label>Capabilities (comma)</label><input value={capabilities} onChange={(e) => setCapabilities(e.target.value)} /></div>
          </div>
          {error && <div className="error">{error}</div>}
          <button className="btn" style={{ marginTop: 12 }} type="submit" data-testid="agent-create">Register</button>
        </form>
      </div>

      <div className="card">
        <h2>Registered agents</h2>
        {agents.length === 0 ? <div className="empty">No agents yet.</div> : (
          <table>
            <thead><tr><th>Name</th><th>Kind</th><th>Provider/Model</th><th>Autonomy</th><th>Status</th><th>Queue</th></tr></thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.id} data-testid={`agent-row-${a.id}`}>
                  <td>{a.name}</td>
                  <td>{a.kind}</td>
                  <td className="muted small">{a.provider ?? "—"}{a.model ? ` / ${a.model}` : ""}</td>
                  <td>{a.autonomyLevel}</td>
                  <td><span className={`badge badge-${a.status.toLowerCase()}`}>{a.status}</span></td>
                  <td className="muted small">q:{a.queue.queued} a:{a.queue.active}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
