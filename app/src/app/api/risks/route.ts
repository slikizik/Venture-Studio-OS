import { NextRequest, NextResponse } from "next/server";
import { createRisk, updateRisk, listRisks, getRiskOrThrow } from "@/lib/risks";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  return NextResponse.json({ risks: await listRisks(projectId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const risk = await createRisk(body);
    return NextResponse.json({ risk }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
