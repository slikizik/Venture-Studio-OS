import { NextRequest, NextResponse } from "next/server";
import { createDecision, listDecisions } from "@/lib/decisions";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  return NextResponse.json({ decisions: await listDecisions(projectId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const decision = await createDecision(body);
    return NextResponse.json({ decision }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
