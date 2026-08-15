import { NextRequest, NextResponse } from "next/server";
import { createDirectionRequest, resolveDirectionRequest, listOpenDirectionRequests } from "@/lib/direction";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  const openOnly = req.nextUrl.searchParams.get("open") === "1";
  const items = openOnly ? await listOpenDirectionRequests(projectId) : await listOpenDirectionRequests(projectId);
  return NextResponse.json({ directionRequests: items });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dr = await createDirectionRequest(body);
    return NextResponse.json({ directionRequest: dr }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
