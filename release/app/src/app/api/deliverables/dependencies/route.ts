import { NextRequest, NextResponse } from "next/server";
import { addDependency, removeDependency } from "@/lib/deliverables";
import { z } from "zod";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const dep = await addDependency(body);
    return NextResponse.json({ dependency: dep }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.deliverableId || !body.dependsOnDeliverableId) {
      return NextResponse.json({ error: "deliverableId and dependsOnDeliverableId required" }, { status: 400 });
    }
    const result = await removeDependency(body.deliverableId, body.dependsOnDeliverableId);
    return NextResponse.json({ result });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
