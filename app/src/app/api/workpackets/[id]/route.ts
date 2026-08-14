import { NextRequest, NextResponse } from "next/server";
import {
  getWorkPacketOrThrow,
  updateWorkPacket,
  submitWorkPacket,
  approveWorkPacket,
  deleteWorkPacket,
  reviseWorkPacket,
} from "@/lib/workpackets";
import { z } from "zod";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const packet = await getWorkPacketOrThrow(id);
    return NextResponse.json({ packet });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 404 },
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const packet = await updateWorkPacket(id, body);
    return NextResponse.json({ packet });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "VALIDATION", issues: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    await deleteWorkPacket(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const body = await req.json();
    const action = body?.action;
    if (action === "submit") {
      const packet = await submitWorkPacket(
        id,
        body?.actor ?? "SYSTEM",
        body?.summary,
      );
      return NextResponse.json({ packet });
    }
    if (action === "approve" || action === "changes_requested") {
      const packet = await approveWorkPacket(id, {
        actor: body?.reviewedBy ?? "SYSTEM",
        decision: action === "approve" ? "APPROVED" : "CHANGES_REQUESTED",
        reviewNote: body?.reviewNote,
      });
      return NextResponse.json({ packet });
    }
    if (action === "revise") {
      const packet = await reviseWorkPacket(id, body?.edits ?? {}, body?.actor ?? "SYSTEM");
      return NextResponse.json({ packet });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: "VALIDATION", issues: err.issues },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 400 },
    );
  }
}
