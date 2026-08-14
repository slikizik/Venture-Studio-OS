import { NextRequest, NextResponse } from "next/server";
import { upsertBrainEntry, getProjectOrThrow } from "@/lib/projects";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const project = await getProjectOrThrow(id);
    return NextResponse.json({ brainEntries: project.brainEntries });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const entry = await upsertBrainEntry(id, body);
    return NextResponse.json({ entry }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
