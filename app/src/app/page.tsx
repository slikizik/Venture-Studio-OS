import { prisma } from "@/lib/prisma";

// Portfolio dashboard (minimal Phase 01 shell). Proves the app boots, connects
// to the local SQLite database, and reads real data — the smallest end-to-end
// loop required before optional breadth (per SEVL priority).
export const dynamic = "force-dynamic";

async function getSummary() {
  const [projectCount, activeCount, blockedCount] = await Promise.all([
    prisma.project.count(),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.project.count({ where: { health: "BLOCKED" } }),
  ]);
  return { projectCount, activeCount, blockedCount };
}

export default async function HomePage() {
  let summary = { projectCount: 0, activeCount: 0, blockedCount: 0 };
  let dbError: string | null = null;
  try {
    summary = await getSummary();
  } catch (e) {
    dbError = e instanceof Error ? e.message : "unknown database error";
  }

  return (
    <main style={{ padding: "var(--vso-space-8)" }}>
      <h1 style={{ fontSize: 22, marginBottom: "var(--vso-space-2)" }}>Venture Studio OS</h1>
      <p style={{ color: "var(--vso-text-muted)", marginTop: 0 }}>
        Phase 01 Foundation — local-first application shell.
      </p>

      {dbError ? (
        <div
          data-testid="db-error"
          role="alert"
          style={{ color: "var(--vso-blocked)", marginTop: "var(--vso-space-4)" }}
        >
          Database connection error: {dbError}
        </div>
      ) : (
        <section
          data-testid="portfolio-summary"
          style={{
            display: "flex",
            gap: "var(--vso-space-4)",
            marginTop: "var(--vso-space-4)",
          }}
        >
          <Card label="Projects" value={summary.projectCount} />
          <Card label="Active" value={summary.activeCount} />
          <Card label="Blocked" value={summary.blockedCount} />
        </section>
      )}
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div
      data-testid={`card-${label.toLowerCase()}`}
      style={{
        background: "var(--vso-surface)",
        border: "1px solid var(--vso-border)",
        borderRadius: "var(--vso-radius)",
        padding: "var(--vso-space-4)",
        minWidth: 120,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 600 }}>{value}</div>
      <div style={{ color: "var(--vso-text-muted)", fontSize: 13 }}>{label}</div>
    </div>
  );
}
