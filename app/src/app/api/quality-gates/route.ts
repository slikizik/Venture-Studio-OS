import { NextRequest, NextResponse } from "next/server";
import { evaluateQualityGate, listQualityGates } from "@/lib/qualityGate";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  return NextResponse.json({ gates: await listQualityGates(projectId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const gate = await evaluateQualityGate(body);
    return NextResponse.json({ gate }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
