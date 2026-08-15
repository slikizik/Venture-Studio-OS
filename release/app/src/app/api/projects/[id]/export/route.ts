import { NextRequest, NextResponse } from "next/server";
import { exportProjectString } from "@/lib/dataPort";

// DAT-001 — Export a complete project as a versioned JSON package.
// GET /api/projects/:id/export -> application/json download.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  try {
    const json = await exportProjectString(id);
    const filename = `vso-project-${id}.json`;
    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Export failed";
    return NextResponse.json({ error: message }, { status: 404 });
  }
}
