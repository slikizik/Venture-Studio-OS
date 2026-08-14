import { NextRequest, NextResponse } from "next/server";
import { enqueueWorkPacket, getExecutionQueue, updateQueueItem, removeQueueItem } from "@/lib/queue";
import { markEvidence } from "@/lib/queue";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const queue = await getExecutionQueue(projectId);
  return NextResponse.json({ queue });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const item = await enqueueWorkPacket(body);
    return NextResponse.json({ item }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
