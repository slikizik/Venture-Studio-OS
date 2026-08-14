import { NextRequest, NextResponse } from "next/server";
import { recordVersion, listVersions, approveVersion, releaseVersion } from "@/lib/versions";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  const versions = await listVersions(projectId);
  return NextResponse.json({ versions });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const version = await recordVersion(body);
    return NextResponse.json({ version }, { status: 201 });
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
    const action = body.action;
    if (action === "approve") {
      const version = await approveVersion(id);
      return NextResponse.json({ version });
    }
    if (action === "release") {
      const version = await releaseVersion(id);
      return NextResponse.json({ version });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
