import { NextRequest, NextResponse } from "next/server";
import { createException, resolveException, listExceptions } from "@/lib/exceptions";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  const classification = req.nextUrl.searchParams.get("classification") ?? undefined;
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  return NextResponse.json({ exceptions: await listExceptions(projectId, classification) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const exc = await createException(body);
    return NextResponse.json({ exception: exc }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
