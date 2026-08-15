"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface Intent { problem: string; audience: string; desiredOutcome: string; constraints: string; nonGoals: string; successMeasures: { measure: string; target: string }[]; ownerPriorities: string[]; commercialTarget: string | null; status: string; }
interface Benchmark { purpose: string; dimensions: string[]; differentiators: string[]; intentionalOmissions: string[]; marketBaseline: string | null; targetSummary: string | null; status: string; }

export default function IntentPage({ params }: { params: { id: string } }) {
  const projectId = params.id;
  const [intent, setIntent] = useState<Intent | null>(null);
  const [benchmark, setBenchmark] = useState<Benchmark | null>(null);
  const [tab, setTab] = useState("intent");
  const [error, setError] = useState("");

  const [problem, setProblem] = useState("");
  const [audience, setAudience] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [constraints, setConstraints] = useState("");
  const [commercialTarget, setCommercialTarget] = useState("");

  const [benchPurpose, setBenchPurpose] = useState("");
  const [benchDimensions, setBenchDimensions] = useState("");
  const [benchDiff, setBenchDiff] = useState("");
  const [benchOmissions, setBenchOmissions] = useState("");

  const [traceReqs, setTraceReqs] = useState("");

  async function load() {
    const [i, b] = await Promise.all([
      fetch(`/api/projects/${projectId}/intent`).then((r) => r.json()),
      fetch(`/api/projects/${projectId}/benchmark`).then((r) => r.json()),
    ]);
    if (i.intent) {
      setIntent(i.intent);
      setProblem(i.intent.problem); setAudience(i.intent.audience);
      setDesiredOutcome(i.intent.desiredOutcome); setConstraints(i.intent.constraints);
      setCommercialTarget(i.intent.commercialTarget ?? "");
    }
    if (b.benchmark) {
      setBenchmark(b.benchmark);
      setBenchPurpose(b.benchmark.purpose);
      setBenchDimensions((b.benchmark.dimensions ?? []).join(", "));
      setBenchDiff((b.benchmark.differentiators ?? []).join(", "));
      setBenchOmissions((b.benchmark.intentionalOmissions ?? []).join(", "));
    }
  }
  useEffect(() => { load(); }, [projectId]);

  async function saveIntent() {
    setError("");
    const res = await fetch(`/api/projects/${projectId}/intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ problem, audience, desiredOutcome, constraints, nonGoals: "", successMeasures: [], ownerPriorities: [], commercialTarget: commercialTarget || null }),
    });
    if (!res.ok) { setError("Save intent failed"); return; }
    load();
  }
  async function approveIntent() {
    const res = await fetch(`/api/projects/${projectId}/intent`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
    if (!res.ok) { setError("Approve intent failed"); return; }
    load();
  }
  async function saveBenchmark() {
    setError("");
    const res = await fetch(`/api/projects/${projectId}/benchmark`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose: benchPurpose, dimensions: benchDimensions.split(",").map((s) => s.trim()).filter(Boolean), differentiators: benchDiff.split(",").map((s) => s.trim()).filter(Boolean), intentionalOmissions: benchOmissions.split(",").map((s) => s.trim()).filter(Boolean) }),
    });
    if (!res.ok) { setError("Save benchmark failed"); return; }
    load();
  }
  async function approveBenchmark() {
    const res = await fetch(`/api/projects/${projectId}/benchmark`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve" }) });
    if (!res.ok) { setError("Approve benchmark failed"); return; }
    load();
  }
  async function trace() {
    setError("");
    const res = await fetch(`/api/projects/${projectId}/intent`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "trace", requirementIds: traceReqs.split(",").map((s) => s.trim()).filter(Boolean), acceptanceCriterionIds: [] }),
    });
    if (!res.ok) { const d = await res.json().catch(() => ({})); setError(d.error ?? "Trace failed"); return; }
    load();
  }

  return (
    <div data-testid="intent-page">
      <div className="row">
        <h1>Intent &amp; Benchmark</h1>
        <Link className="btn btn-secondary" href={`/projects/${projectId}`}>Back</Link>
      </div>
      <div className="card" style={{ display: "flex", gap: 12 }}>
        <button className={tab === "intent" ? "btn" : "btn btn-secondary"} onClick={() => setTab("intent")}>Intent</button>
        <button className={tab === "benchmark" ? "btn" : "btn btn-secondary"} onClick={() => setTab("benchmark")}>Benchmark</button>
        <button className={tab === "trace" ? "btn" : "btn btn-secondary"} onClick={() => setTab("trace")}>Trace (DSG-001)</button>
      </div>
      {error && <div className="error">{error}</div>}

      {tab === "intent" && (
        <div className="card">
          {intent && <p className="muted small">Status: <strong>{intent.status}</strong></p>}
          <label>Problem *</label><textarea value={problem} onChange={(e) => setProblem(e.target.value)} data-testid="intent-problem" />
          <label>Audience *</label><textarea value={audience} onChange={(e) => setAudience(e.target.value)} />
          <label>Desired outcome *</label><textarea value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)} />
          <label>Constraints *</label><textarea value={constraints} onChange={(e) => setConstraints(e.target.value)} />
          <label>Commercial target</label><textarea value={commercialTarget} onChange={(e) => setCommercialTarget(e.target.value)} />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn" onClick={saveIntent} data-testid="intent-save">Save draft</button>
            <button className="btn btn-secondary" onClick={approveIntent} data-testid="intent-approve">Approve</button>
          </div>
        </div>
      )}

      {tab === "benchmark" && (
        <div className="card">
          {benchmark && <p className="muted small">Status: <strong>{benchmark.status}</strong></p>}
          <label>Purpose *</label><textarea value={benchPurpose} onChange={(e) => setBenchPurpose(e.target.value)} data-testid="benchmark-purpose" />
          <label>Target dimensions (comma separated)</label><input value={benchDimensions} onChange={(e) => setBenchDimensions(e.target.value)} />
          <label>Differentiators (comma separated)</label><input value={benchDiff} onChange={(e) => setBenchDiff(e.target.value)} />
          <label>Intentional omissions (comma separated)</label><input value={benchOmissions} onChange={(e) => setBenchOmissions(e.target.value)} />
          <div style={{ marginTop: 12, display: "flex", gap: 8 }}>
            <button className="btn" onClick={saveBenchmark} data-testid="benchmark-save">Save draft</button>
            <button className="btn btn-secondary" onClick={approveBenchmark}>Approve</button>
          </div>
        </div>
      )}

      {tab === "trace" && (
        <div className="card">
          <p className="muted small">Trace the approved intent into requirements (DSG-001). The stored owner intent text is never modified — this only records traceability.</p>
          <label>Requirement IDs (comma separated)</label>
          <input value={traceReqs} onChange={(e) => setTraceReqs(e.target.value)} data-testid="trace-reqs" />
          <button className="btn" style={{ marginTop: 12 }} onClick={trace} data-testid="trace-save">Record trace</button>
        </div>
      )}
    </div>
  );
}
