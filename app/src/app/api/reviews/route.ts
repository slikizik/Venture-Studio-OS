import { NextRequest, NextResponse } from "next/server";
import { createReview, decideReview, addReviewComment, listReviews, getReviewOrThrow } from "@/lib/reviews";
import { z } from "zod";

export async function GET(req: NextRequest) {
  const workPacketId = req.nextUrl.searchParams.get("workPacketId");
  if (!workPacketId) return NextResponse.json({ error: "workPacketId required" }, { status: 400 });
  return NextResponse.json({ reviews: await listReviews(workPacketId) });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const review = await createReview(body);
    return NextResponse.json({ review }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
