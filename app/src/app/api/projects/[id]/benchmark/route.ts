import { NextRequest, NextResponse } from "next/server";
import { captureBenchmark, approveBenchmark, getBenchmark } from "@/lib/intent";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const benchmark = await getBenchmark(id);
  return NextResponse.json({ benchmark: benchmark ?? null });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const benchmark = await captureBenchmark(id, body);
    return NextResponse.json({ benchmark }, { status: 201 });
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
      const benchmark = await approveBenchmark(id);
      return NextResponse.json({ benchmark });
    }
    return NextResponse.json({ error: "UNKNOWN_ACTION" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
