// QLT-001 — delete a quality profile by id.
import { NextRequest, NextResponse } from "next/server";
import { deleteQualityProfile } from "@/lib/quality";

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    await deleteQualityProfile(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
