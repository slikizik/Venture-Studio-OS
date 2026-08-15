import { NextRequest, NextResponse } from "next/server";
import {
  updateDeliverable,
  reorderDeliverable,
  archiveDeliverable,
  restoreDeliverable,
  deleteDeliverable,
  getDeliverableOrThrow,
} from "@/lib/deliverables";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const deliverable = await getDeliverableOrThrow(id);
    return NextResponse.json({ deliverable });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    if (typeof body.order === "number" && Object.keys(body).length === 1) {
      const deliverable = await reorderDeliverable(id, body.order);
      return NextResponse.json({ deliverable });
    }
    const deliverable = await updateDeliverable(id, body);
    return NextResponse.json({ deliverable });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const action = body.action;
    if (action === "archive") {
      const deliverable = await archiveDeliverable(id);
      return NextResponse.json({ deliverable });
    }
    if (action === "restore") {
      const deliverable = await restoreDeliverable(id);
      return NextResponse.json({ deliverable });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const result = await deleteDeliverable(id);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
