// TPL-003 — custom template CRUD + versioning endpoints.
import { NextRequest, NextResponse } from "next/server";
import {
  createCustomTemplate,
  listCustomTemplates,
  getCustomTemplate,
} from "@/lib/customTemplates";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const projectId = req.nextUrl.searchParams.get("projectId") ?? undefined;
  return NextResponse.json({ templates: await listCustomTemplates(projectId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const template = await createCustomTemplate(body);
    return NextResponse.json({ template }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
