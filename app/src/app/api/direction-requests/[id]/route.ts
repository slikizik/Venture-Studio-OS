import { NextRequest, NextResponse } from "next/server";
import { resolveDirectionRequest } from "@/lib/direction";
import { z } from "zod";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const dr = await resolveDirectionRequest(id, body);
    return NextResponse.json({ directionRequest: dr });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
