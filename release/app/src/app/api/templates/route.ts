// TPL-001 — list built-in templates + validate a template payload.
import { NextRequest, NextResponse } from "next/server";
import { listBuiltInTemplates, validateTemplate } from "@/lib/templates";
import { z } from "zod";

export async function GET() {
  return NextResponse.json({ templates: listBuiltInTemplates() });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Validate an arbitrary template definition (built-in or custom draft).
    const def = validateTemplate(body);
    return NextResponse.json({ template: def }, { status: 200 });
  } catch (err) {
    if (err instanceof z.ZodError)
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
