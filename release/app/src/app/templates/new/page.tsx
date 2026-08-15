import NewTemplateClient from "./new-template-client";

export default function NewTemplatePage() {
  return (
    <div data-testid="new-template-page">
      <h1>New Custom Template</h1>
      <p className="muted small">Define a reusable project template (stages, deliverables, gates, brain sections, quality profile).</p>
      <NewTemplateClient />
    </div>
  );
}
