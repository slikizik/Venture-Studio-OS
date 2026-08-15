import QualityProfilesClient from "./quality-profiles-client";

export const dynamic = "force-dynamic";

export default async function QualityProfilesPage({
  searchParams,
}: {
  searchParams: Promise<{ projectId?: string }>;
}) {
  const { projectId } = await searchParams;
  return (
    <div data-testid="quality-profiles-page">
      <h1>Quality Profiles</h1>
      <p className="muted small">
        Define quality dimensions, mandatory dimensions, and target levels for a project type.
        Versions are immutable snapshots; saving creates a new version.
      </p>
      <QualityProfilesClient initialProjectId={projectId ?? ""} />
    </div>
  );
}
