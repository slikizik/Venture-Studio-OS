import { NextRequest, NextResponse } from "next/server";
import { recordAgentActivity, listAgentActivity } from "@/lib/agents-activity";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "50");
  const activities = await listAgentActivity(projectId, { limit });
  return NextResponse.json({ activities });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const rec = await recordAgentActivity(body);
    return NextResponse.json({ activity: rec }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
