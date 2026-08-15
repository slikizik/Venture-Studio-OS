import { NextRequest, NextResponse } from "next/server";
import { captureIntent, approveIntent, getIntent, traceIntent } from "@/lib/intent";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const intent = await getIntent(id);
  return NextResponse.json({ intent: intent ?? null });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const intent = await captureIntent(id, body);
    return NextResponse.json({ intent }, { status: 201 });
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
    if (body.action === "approve") {
      const intent = await approveIntent(id);
      return NextResponse.json({ intent });
    }
    if (body.action === "trace") {
      const trace = await traceIntent(id, body);
      return NextResponse.json({ trace });
    }
    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
