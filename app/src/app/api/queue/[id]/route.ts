import { NextRequest, NextResponse } from "next/server";
import { getExecutionQueue, updateQueueItem, removeQueueItem, markEvidence } from "@/lib/queue";
import { z } from "zod";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    if (body?.action === "markEvidence") {
      const item = await markEvidence(id, body.evidenceId, body?.actor ?? "SYSTEM");
      return NextResponse.json({ item });
    }
    const item = await updateQueueItem(id, body);
    return NextResponse.json({ item });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await removeQueueItem(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
