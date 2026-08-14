import { NextRequest, NextResponse } from "next/server";
import { addCriterion, updateCriterion } from "@/lib/deliverables";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const crit = await addCriterion(body);
    return NextResponse.json({ criterion: crit }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const crit = await updateCriterion(id, body);
    return NextResponse.json({ criterion: crit });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
