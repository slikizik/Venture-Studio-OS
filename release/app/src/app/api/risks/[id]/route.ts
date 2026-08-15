import { NextRequest, NextResponse } from "next/server";
import { updateRisk, getRiskOrThrow } from "@/lib/risks";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json({ risk: await getRiskOrThrow(id) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const risk = await updateRisk(id, body);
    return NextResponse.json({ risk });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
