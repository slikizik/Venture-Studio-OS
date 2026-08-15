import Link from "next/link";
import { notFound } from "next/navigation";
import { getProjectOrThrow } from "@/lib/projects";
import { listExceptions } from "@/lib/exceptions";
import ExceptionsClient from "./exceptions-client";

export const dynamic = "force-dynamic";

export default async function ExceptionsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await getProjectOrThrow(id);
  } catch {
    notFound();
  }
  const exceptions = await listExceptions(id).catch(() => []);

  return (
    <div data-testid="exceptions-page">
      <div className="row">
        <h1>Exceptions</h1>
        <Link className="btn btn-secondary" href={`/projects/${id}/governance/risks`}>Risks</Link>
      </div>
      <p className="muted small">Classify and resolve ambiguities/risks (EXC-001).</p>

      <ExceptionsClient
        projectId={id}
        initial={exceptions.map((e) => ({
          id: e.id,
          classification: e.classification,
          title: e.title,
          status: e.status,
          resolvedBy: e.resolvedBy ?? "",
        }))}
      />
    </div>
  );
}
