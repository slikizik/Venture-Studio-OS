// TPL-003 — custom template by-id (get a specific version/snapshot).
import { NextRequest, NextResponse } from "next/server";
import { getCustomTemplate } from "@/lib/customTemplates";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const template = await getCustomTemplate(id);
  if (!template) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({ template });
}
