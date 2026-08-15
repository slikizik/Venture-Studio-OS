import { NextRequest, NextResponse } from "next/server";
import { listAuditForProject } from "@/lib/audit";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const records = await listAuditForProject(id);
  return NextResponse.json({ records });
}
