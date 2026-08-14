import { NextRequest, NextResponse } from "next/server";
import { getSettings, saveSettings } from "@/lib/settings";
import { z } from "zod";

export async function GET() {
  const settings = await getSettings();
  return NextResponse.json({ settings });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const settings = await saveSettings(body);
    return NextResponse.json({ settings });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
