import Link from "next/link";
import { searchProjects } from "@/lib/projects";
import { prisma } from "@/lib/prisma";
import { listAgents } from "@/lib/agents";
import { calculatePortfolioMetrics, calculatePortfolioDigest } from "@/lib/metrics";

export const dynamic = "force-dynamic";

export default async function PortfolioPage() {
  const [projects, metrics, digest] = await Promise.all([
    searchProjects({ archived: false, sortBy: "updatedAt", sortDir: "desc" }),
    calculatePortfolioMetrics(),
    calculatePortfolioDigest(),
  ]);

  return (
    <div data-testid="portfolio-dashboard">
      <h1>Portfolio</h1>
      <div className="grid grid-cols-4" data-testid="portfolio-metrics">
        <div className="card">
          <div className="metric" data-testid="metric-active-projects">{metrics.activeProjects}</div>
          <div className="muted small">Active projects</div>
          <Link className="small" href="/projects">View</Link>
        </div>
        <div className="card">
          <div className="metric" data-testid="metric-blocked-projects">{metrics.blockedProjects}</div>
          <div className="muted small">Blocked projects</div>
        </div>
        <div className="card">
          <div className="metric" data-testid="metric-pending-reviews">{metrics.pendingReviews}</div>
          <div className="muted small">Pending reviews</div>
          <Link className="small" href="/reviews">View</Link>
        </div>
        <div className="card">
          <div className="metric" data-testid="metric-open-risks">{metrics.openHighCriticalRisks}</div>
          <div className="muted small">Open high/critical risks</div>
        </div>
        <div className="card">
          <div className="metric" data-testid="metric-active-agents">{metrics.activeAgents}</div>
          <div className="muted small">Active agents</div>
          <Link className="small" href="/agents">View</Link>
        </div>
        <div className="card">
          <div className="metric" data-testid="metric-open-direction-requests">{metrics.openDirectionRequests}</div>
          <div className="muted small">Open owner escalations</div>
        </div>
      </div>

      {(digest.pendingReviews.length > 0 || digest.openDirectionRequests.length > 0 || digest.blockedProjects.length > 0) && (
        <div className="card" data-testid="portfolio-blockers" style={{ marginTop: 16 }}>
          <h2>Needs attention</h2>
          {digest.openDirectionRequests.length > 0 && (
            <p className="small">
              <strong>{digest.openDirectionRequests.length}</strong> open owner decision{digest.openDirectionRequests.length === 1 ? "" : "s"} awaiting direction.
            </p>
          )}
          {digest.blockedProjects.length > 0 && (
            <p className="small">
              <strong>{digest.blockedProjects.length}</strong> blocked project{digest.blockedProjects.length === 1 ? "" : "s"}:{" "}
              {digest.blockedProjects.map((b) => b.name).join(", ")}
            </p>
          )}
        </div>
      )}

      <h2>Recent decisions</h2>
      {digest.recentDecisions.length === 0 ? (
        <div className="empty">No decisions recorded yet.</div>
      ) : (
        <div className="card">
          <table>
            <thead><tr><th>Title</th><th>Decided by</th><th>When</th></tr></thead>
            <tbody>
              {digest.recentDecisions.map((d) => (
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
