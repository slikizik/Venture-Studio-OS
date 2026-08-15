"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

interface DRow {
  id: string;
  title: string;
  status: string;
  priority: string;
  order: number;
  parentId: string | null;
  type: string;
  dueDate: string | null;
  dependencies: string[];
  acceptanceCriteria: { id: string; statement: string; status: string }[];
}

export default function DeliverablesClient(props: { projectId: string; deliverables: DRow[] }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [type, setType] = useState("feature");
  const [parentId, setParentId] = useState("");
  const [priority, setPriority] = useState("MEDIUM");
  const [order, setOrder] = useState(0);
  const [error, setError] = useState("");

  async function create() {
    setError("");
    if (!title.trim()) { setError("Title is required"); return; }
    const res = await fetch("/api/deliverables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        projectId: props.projectId,
        title: title.trim(),
        type,
        parentId: parentId || null,
        priority,
        order: Number(order) || 0,
      }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Create failed");
      return;
    }
    setTitle(""); setParentId(""); setOrder(0);
    router.refresh();
  }

  async function act(id: string, action: "archive" | "restore", body?: Record<string, unknown>) {
    const res = await fetch(`/api/deliverables/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, ...body }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Action failed");
      return;
    }
    router.refresh();
  }

  async function remove(id: string) {
    const res = await fetch(`/api/deliverables/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Delete failed");
      return;
    }
    router.refresh();
  }

  async function addDep(deliverableId: string, dependsOn: string) {
    if (!dependsOn || dependsOn === deliverableId) return;
    const res = await fetch("/api/deliverables/dependencies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ deliverableId, dependsOnDeliverableId: dependsOn }),
    });
    if (!res.ok) {
      const d = await res.json().catch(() => ({}));
      setError(d.error ?? "Dependency failed");
      return;
    }
    router.refresh();
  }

  return (
    <div className="card" data-testid="deliverables-client">
      <h2>Add deliverable</h2>
      <div className="row">
        <input data-testid="deliverable-title" placeholder="Title" value={title} maxLength={180} onChange={(e) => setTitle(e.target.value)} />
        <input data-testid="deliverable-type" placeholder="Type" value={type} maxLength={80} onChange={(e) => setType(e.target.value)} />
        <select data-testid="deliverable-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">(root)</option>
          {props.deliverables.map((d) => (
            <option key={d.id} value={d.id}>{d.title}</option>
          ))}
        </select>
        <select data-testid="deliverable-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>
          <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>CRITICAL</option>
        </select>
        <input data-testid="deliverable-order" type="number" value={order} onChange={(e) => setOrder(Number(e.target.value))} style={{ width: 70 }} />
        <button className="btn" onClick={create} data-testid="deliverable-create">Add</button>
      </div>
      {error && <div className="error" data-testid="deliverable-error">{error}</div>}

      <h2>List</h2>
      <table>
        <thead><tr><th>#</th><th>Title</th><th>Status</th><th>Priority</th><th>Parent</th><th>Deps</th><th>Criteria</th><th>Actions</th></tr></thead>
        <tbody>
          {props.deliverables.map((d) => (
            <tr key={d.id} data-testid={`deliverable-row-${d.id}`}>
              <td>{d.order}</td>
              <td>{d.title}</td>
              <td>{d.status}</td>
              <td>{d.priority}</td>
              <td>{d.parentId ? props.deliverables.find((x) => x.id === d.parentId)?.title ?? d.parentId.slice(0, 8) : "—"}</td>
              <td>
                {d.dependencies.map((dep) => (
                  <span key={dep} className="muted small">{dep.slice(0, 8)} </span>
                ))}
                <select
                  data-testid={`dep-add-${d.id}`}
                  defaultValue=""
                  onChange={(e) => { if (e.target.value) { addDep(d.id, e.target.value); e.target.value = ""; } }}
                >
                  <option value="">+dep</option>
                  {props.deliverables.filter((x) => x.id !== d.id).map((x) => (
                    <option key={x.id} value={x.id}>{x.title}</option>
                  ))}
                </select>
              </td>
              <td>{d.acceptanceCriteria.length}</td>
              <td className="row">
                {d.status !== "ARCHIVED" ? (
                  <button className="btn btn-secondary" data-testid={`archive-${d.id}`} onClick={() => act(d.id, "archive")}>Archive</button>
                ) : (
                  <button className="btn btn-secondary" data-testid={`restore-${d.id}`} onClick={() => act(d.id, "restore")}>Restore</button>
                )}
                <button className="btn btn-secondary" data-testid={`delete-${d.id}`} onClick={() => remove(d.id)}>Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
