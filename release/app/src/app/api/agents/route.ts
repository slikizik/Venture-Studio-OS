import { NextRequest, NextResponse } from "next/server";
import { createAgent, listAgents, agentQueueSummary } from "@/lib/agents";
import { z } from "zod";

export async function GET(_req: NextRequest) {
  const agents = await listAgents();
  const withSummary = await Promise.all(
    agents.map(async (a) => ({ ...a, queue: await agentQueueSummary(a.id) })),
  );
  return NextResponse.json({ agents: withSummary });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const agent = await createAgent(body);
    return NextResponse.json({ agent }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: "VALIDATION", issues: err.issues }, { status: 400 });
    }
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
}
