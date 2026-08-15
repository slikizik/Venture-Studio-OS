import { NextRequest, NextResponse } from "next/server";
import { createAttachment, listAttachments } from "@/lib/attachments";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const evidenceId = req.nextUrl.searchParams.get("evidenceId");
  if (!evidenceId) return NextResponse.json({ error: "evidenceId required" }, { status: 400 });
  const attachments = await listAttachments(evidenceId);
  return NextResponse.json({ attachments });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const att = await createAttachment(body);
    return NextResponse.json({ attachment: att }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
