import { NextRequest, NextResponse } from "next/server";
import { createLearning, convertLearning, listLearnings } from "@/lib/learning";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  return NextResponse.json({ learnings: await listLearnings(projectId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const learning = await createLearning(body);
    return NextResponse.json({ learning }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
