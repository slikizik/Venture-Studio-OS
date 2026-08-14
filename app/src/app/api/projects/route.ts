import { NextRequest, NextResponse } from "next/server";
import { createProject, searchProjects } from "@/lib/projects";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const archived = sp.get("archived");
  const result = await searchProjects({
    status: sp.get("status") ?? undefined,
    health: sp.get("health") ?? undefined,
    templateId: sp.get("templateId") ?? undefined,
    archived: archived === null ? undefined : archived === "true",
    search: sp.get("search") ?? undefined,
    sortBy: (sp.get("sortBy") as "updatedAt" | "name" | "createdAt" | "targetDate") ?? "updatedAt",
    sortDir: (sp.get("sortDir") as "asc" | "desc") ?? "desc",
  });
  return NextResponse.json({ projects: result });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const project = await createProject(body);
    return NextResponse.json({ project }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
