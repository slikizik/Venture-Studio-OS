import { NextRequest, NextResponse } from "next/server";
import { createWorkPacket, listWorkPackets } from "@/lib/workpackets";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const packets = await listWorkPackets(projectId);
  return NextResponse.json({ packets });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const packet = await createWorkPacket(body);
    return NextResponse.json({ packet }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
