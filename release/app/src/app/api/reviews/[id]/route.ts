import { NextRequest, NextResponse } from "next/server";
import { decideReview, addReviewComment, getReviewOrThrow } from "@/lib/reviews";
import { z } from "zod";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    return NextResponse.json({ review: await getReviewOrThrow(id) });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 404 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const body = await req.json();
    const action = body?.action;
    if (action === "decide") {
      const review = await decideReview(id, body);
      return NextResponse.json({ review });
    }
    if (action === "comment") {
      const comment = await addReviewComment(id, body);
      return NextResponse.json({ comment }, { status: 201 });
    }
    return NextResponse.json({ error: "unknown action" }, { status: 400 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
