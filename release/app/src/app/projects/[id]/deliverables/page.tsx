import Link from "next/link";
import { notFound } from "next/navigation";
import { listDeliverables } from "@/lib/deliverables";
import { getProjectOrThrow } from "@/lib/projects";
import DeliverablesClient from "./deliverables-client";

export const dynamic = "force-dynamic";

interface DeliverableNode {
  id: string;
  title: string;
  status: string;
  priority: string;
  order: number;
  parentId: string | null;
  dependencies: { id: string; dependsOnDeliverableId: string }[];
}

type TreeNode = DeliverableNode & { children: TreeNode[] };

function buildTree(rows: DeliverableNode[]) {
  const byId = new Map<string, TreeNode>();
  rows.forEach((r) => byId.set(r.id, { ...r, children: [] }));
  const rootList: TreeNode[] = [];
  for (const n of byId.values()) {
    if (n.parentId && byId.has(n.parentId)) {
      byId.get(n.parentId)!.children.push(n);
    } else {
      rootList.push(n);
    }
  }
  const sortRec = (list: TreeNode[]) => {
    list.sort((a, b) => a.order - b.order);
    list.forEach((c) => sortRec(c.children));
  };
  sortRec(rootList);
  return rootList;
}

function renderTree(nodes: TreeNode[], depth = 0) {
  return (
    <ul style={{ marginLeft: depth ? 16 : 0 }}>
      {nodes.map((n) => (
        <li key={n.id} data-testid={`deliverable-${n.id}`}>
          <span className={`badge badge-${n.status.toLowerCase()}`}>{n.status}</span>{" "}
          <strong>{n.title}</strong>{" "}
          <span className="muted small">({n.priority})</span>
          {n.dependencies.length > 0 && (
            <span className="muted small"> → deps: {n.dependencies.map((d) => d.dependsOnDeliverableId.slice(0, 8)).join(", ")}</span>
          )}
          {n.children.length > 0 && renderTree(n.children, depth + 1)}
        </li>
      ))}
    </ul>
  );
}

export default async function DeliverablesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let project;
  try {
    project = await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const rows = await listDeliverables(id);
  const tree = buildTree(rows.map((r) => ({
    id: r.id, title: r.title, status: r.status, priority: r.priority, order: r.order, parentId: r.parentId,
    dependencies: r.dependencies.map((d) => ({ id: d.id, dependsOnDeliverableId: d.dependsOnDeliverableId })),
  })));

  return (
    <div data-testid="deliverables-page">
      <div className="row">
        <h1>Deliverables</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}`}>Back</Link>
      </div>
      <p className="muted small">Project: {project.name}</p>

      <DeliverablesClient projectId={id} deliverables={rows.map((r) => ({
        id: r.id, title: r.title, status: r.status, priority: r.priority, order: r.order,
        parentId: r.parentId, type: r.type, dueDate: r.dueDate ? r.dueDate.toISOString() : null,
        dependencies: r.dependencies.map((d) => d.dependsOnDeliverableId),
        acceptanceCriteria: r.acceptanceCriteria.map((c) => ({ id: c.id, statement: c.statement, status: c.status })),
      }))} />

      <h2>Tree</h2>
      <div className="card">
        {tree.length === 0 ? <div className="empty">No deliverables yet.</div> : renderTree(tree)}
      </div>
    </div>
  );
}
