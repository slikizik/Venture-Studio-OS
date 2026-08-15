// QLT-001 — Quality Profile CRUD + versioning.
import { NextRequest, NextResponse } from "next/server";
import {
  createQualityProfile,
  listQualityProfiles,
  updateQualityProfile,
  versionQualityProfile,
} from "@/lib/quality";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId");
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
  return NextResponse.json({ profiles: await listQualityProfiles(projectId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, ...rest } = body;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    const profile = await createQualityProfile(projectId, rest);
    return NextResponse.json({ profile }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { projectId, version, ...rest } = body;
    if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });
    if (version) {
      const profile = await versionQualityProfile(projectId, version);
      return NextResponse.json({ profile });
    }
    const profile = await updateQualityProfile(projectId, rest);
    return NextResponse.json({ profile });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
