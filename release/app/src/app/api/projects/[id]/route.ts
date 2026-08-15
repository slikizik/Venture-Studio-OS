import { NextRequest, NextResponse } from "next/server";
import { updateProject, archiveProject, restoreProject, refreshDerived, getProjectOrThrow } from "@/lib/projects";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await getProjectOrThrow(id);
    return NextResponse.json({ project });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const project = await updateProject(id, body);
    await refreshDerived(id);
    return NextResponse.json({ project });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const action = req.nextUrl.searchParams.get("action");
  try {
    if (action === "restore") {
      const project = await restoreProject(id);
      return NextResponse.json({ project });
    }
    const project = await archiveProject(id);
    return NextResponse.json({ project });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
