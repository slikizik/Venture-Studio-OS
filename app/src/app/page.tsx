import Link from "next/link";
import { searchProjects } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { listAgents } from "@/lib/agents";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [projects, pendingReviews, openRisks, recentDecisions, agents] = await Promise.all([
    searchProjects({ archived: false, sortBy: "updatedAt", sortDir: "desc" }),
    prisma.review.count({ where: { status: "PENDING" } }),
    prisma.riskRecord.count({ where: { status: { in: ["OPEN", "MITIGATING"] }, impact: { in: ["HIGH", "CRITICAL"] } } }),
    prisma.decisionRecord.findMany({ orderBy: { decidedAt: "desc" }, take: 5 }),
    listAgents(),
  ]);

  const activeCount = projects.filter((p) => p.status !== "ARCHIVED").length;
  const blockedCount = projects.filter((p) => p.health === "BLOCKED").length;
  const activeAgents = agents.filter((a) => a.status === "ACTIVE").length;

  return (
    <div>
      <h1>Portfolio</h1>
      <div className="grid grid-cols-4" data-testid="portfolio-metrics">
        <div className="card">
          <div className="metric" data-testid="metric-active-projects">{activeCount}</div>
          <div className="muted small">Active projects</div>
          <Link className="small" href="/projects">View</Link>
        </div>
        <div className="card">
          <div className="metric" data-testid="metric-blocked-projects">{blockedCount}</div>
          <div className="muted small">Blocked projects</div>
        </div>
        <div className="card">
          <div className="metric" data-testid="metric-pending-reviews">{pendingReviews}</div>
          <div className="muted small">Pending reviews</div>
          <Link className="small" href="/reviews">View</Link>
        </div>
        <div className="card">
          <div className="metric" data-testid="metric-open-risks">{openRisks}</div>
          <div className="muted small">Open high/critical risks</div>
        </div>
        <div className="card">
          <div className="metric" data-testid="metric-active-agents">{activeAgents}</div>
          <div className="muted small">Active agents</div>
          <Link className="small" href="/agents">View</Link>
        </div>
      </div>

      <h2>Recent decisions</h2>
      {recentDecisions.length === 0 ? (
        <div className="empty">No decisions recorded yet.</div>
      ) : (
        <div className="card">
          <table>
            <thead><tr><th>Title</th><th>Decided by</th><th>When</th></tr></thead>
            <tbody>
              {recentDecisions.map((d) => (
                <tr key={d.id}>
                  <td>{d.title}</td>
                  <td className="muted small">{d.decidedBy}</td>
                  <td className="muted small">{d.decidedAt.toISOString().slice(0, 10)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
