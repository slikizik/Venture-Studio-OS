// Built-in project templates (TPL-001 / TPL-002 built-ins).
// Normative source: 04-architecture/DATA_MODEL.md and UX screen specs.
// Each template seeds ProjectStage, Deliverable, QualityGate, ProjectBrain,
// and a default QualityProfile appropriate to its project type (QLT-001).
import { z } from "zod";
import {
  templateDefSchema,
  TemplateDef,
  ProjectTypeId,
} from "./validation";

export type BuiltInTemplate = z.input<typeof templateDefSchema> & { id: string; description: string };

function def(d: z.input<typeof templateDefSchema>): TemplateDef {
  return templateDefSchema.parse(d);
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "blank",
    name: "Blank Project",
    description: "Start empty with a single Draft stage and an empty Project Brain.",
    key: "blank",
    projectTypeId: "BLANK",
    stages: [{ name: "Draft", order: 0, entryCriteria: [], exitCriteria: [] }],
    deliverables: [],
    gates: [],
    brainSections: [],
    qualityProfile: {
      name: "Default Profile",
      projectTypeId: "BLANK",
      dimensions: ["Functional Completeness", "Documentation"],
      mandatoryDimensions: ["Functional Completeness"],
      targetLevels: ["BASIC"],
    },
  },
  {
    id: "standard-venture",
    name: "Standard Venture Build",
    description: "Discovery, Build, Validate, Launch, and Operate stages with a seeded Project Brain.",
    key: "standard-venture",
    projectTypeId: "STANDARD_VENTURE",
    stages: [
      { name: "Discovery", order: 0, entryCriteria: [], exitCriteria: ["Problem validated"] },
      { name: "Build", order: 1, entryCriteria: ["Problem validated"], exitCriteria: ["MVP complete"] },
      { name: "Validate", order: 2, entryCriteria: ["MVP complete"], exitCriteria: ["Evidence retained"] },
      { name: "Launch", order: 3, entryCriteria: ["Evidence retained"], exitCriteria: ["Live"] },
      { name: "Operate", order: 4, entryCriteria: ["Live"], exitCriteria: [] },
    ],
    deliverables: [
      { key: "problem", title: "Problem Statement", type: "Brief", priority: "HIGH", order: 0, stageKey: "Discovery" },
      { key: "mvp", title: "MVP Build", type: "Product", priority: "HIGH", order: 1, stageKey: "Build", dependsOn: ["problem"] },
      { key: "validation", title: "Validation Report", type: "Report", priority: "MEDIUM", order: 2, stageKey: "Validate", dependsOn: ["mvp"] },
      { key: "launch", title: "Launch Checklist", type: "Checklist", priority: "HIGH", order: 3, stageKey: "Launch", dependsOn: ["validation"] },
    ],
    gates: [
      { level: "STAGE", name: "Discovery Gate", criteria: ["Problem validated"], order: 0 },
      { level: "STAGE", name: "Build Gate", criteria: ["MVP meets acceptance criteria"], order: 1 },
      { level: "RELEASE", name: "Launch Gate", criteria: ["Validation evidence retained", "Launch checklist complete"], order: 0 },
    ],
    brainSections: [
      { section: "VISION", title: "Vision", content: "", order: 0 },
      { section: "AUDIENCE", title: "Audience", content: "", order: 1 },
      { section: "PROBLEM", title: "Problem", content: "", order: 2 },
      { section: "OUTCOMES", title: "Desired Outcomes", content: "", order: 3 },
      { section: "CONSTRAINTS", title: "Constraints", content: "", order: 4 },
      { section: "NON_GOALS", title: "Non-Goals", content: "", order: 5 },
      { section: "SUCCESS_METRICS", title: "Success Metrics", content: "", order: 6 },
      { section: "COMMERCIAL_MODEL", title: "Commercial Model", content: "", order: 7 },
    ],
    qualityProfile: {
      name: "Standard Venture Quality Profile",
      projectTypeId: "STANDARD_VENTURE",
      dimensions: ["Functional Completeness", "Reliability", "Security", "Usability", "Commercial Readiness"],
      mandatoryDimensions: ["Functional Completeness", "Security"],
      targetLevels: ["COMMERCIAL"],
    },
  },
  {
    id: "product-release",
    name: "Product Release",
    description: "Plan, Develop, Test, Release stages for a scoped product release.",
    key: "product-release",
    projectTypeId: "PRODUCT_RELEASE",
    stages: [
      { name: "Plan", order: 0, entryCriteria: [], exitCriteria: ["Scope agreed"] },
      { name: "Develop", order: 1, entryCriteria: ["Scope agreed"], exitCriteria: ["Build done"] },
      { name: "Test", order: 2, entryCriteria: ["Build done"], exitCriteria: ["Quality gate passed"] },
      { name: "Release", order: 3, entryCriteria: ["Quality gate passed"], exitCriteria: ["Shipped"] },
    ],
    deliverables: [
      { key: "scope", title: "Release Scope", type: "Brief", priority: "HIGH", order: 0, stageKey: "Plan" },
      { key: "build", title: "Release Build", type: "Product", priority: "HIGH", order: 1, stageKey: "Develop", dependsOn: ["scope"] },
      { key: "test", title: "Test Evidence", type: "Evidence", priority: "HIGH", order: 2, stageKey: "Test", dependsOn: ["build"] },
    ],
    gates: [
      { level: "DELIVERABLE", name: "Build Gate", criteria: ["All deliverable acceptance criteria met"], order: 0 },
      { level: "RELEASE", name: "Release Gate", criteria: ["Quality gate passed", "Release notes published"], order: 0 },
    ],
    brainSections: [
      { section: "VISION", title: "Vision", content: "", order: 0 },
      { section: "OUTCOMES", title: "Desired Outcomes", content: "", order: 1 },
      { section: "CONSTRAINTS", title: "Constraints", content: "", order: 2 },
    ],
    qualityProfile: {
      name: "Product Release Quality Profile",
      projectTypeId: "PRODUCT_RELEASE",
      dimensions: ["Functional Completeness", "Reliability", "Security", "Performance"],
      mandatoryDimensions: ["Functional Completeness", "Security", "Performance"],
      targetLevels: ["COMMERCIAL"],
    },
  },
  {
    id: "research",
    name: "Research Initiative",
    description: "Literature, Experiment, Analysis, and Write-up stages for a research effort.",
    key: "research",
    projectTypeId: "RESEARCH",
    stages: [
      { name: "Literature", order: 0, entryCriteria: [], exitCriteria: ["Survey complete"] },
      { name: "Experiment", order: 1, entryCriteria: ["Survey complete"], exitCriteria: ["Data collected"] },
      { name: "Analysis", order: 2, entryCriteria: ["Data collected"], exitCriteria: ["Findings drafted"] },
      { name: "Write-up", order: 3, entryCriteria: ["Findings drafted"], exitCriteria: ["Paper finalized"] },
    ],
    deliverables: [
      { key: "survey", title: "Literature Survey", type: "Report", priority: "MEDIUM", order: 0, stageKey: "Literature" },
      { key: "experiment", title: "Experiment Design + Run", type: "Research", priority: "HIGH", order: 1, stageKey: "Experiment", dependsOn: ["survey"] },
      { key: "analysis", title: "Analysis", type: "Report", priority: "HIGH", order: 2, stageKey: "Analysis", dependsOn: ["experiment"] },
      { key: "paper", title: "Write-up", type: "Document", priority: "MEDIUM", order: 3, stageKey: "Write-up", dependsOn: ["analysis"] },
    ],
    gates: [
      { level: "STAGE", name: "Experiment Gate", criteria: ["Ethics/design review passed"], order: 0 },
      { level: "RELEASE", name: "Publication Gate", criteria: ["Peer review complete"], order: 0 },
    ],
    brainSections: [
      { section: "VISION", title: "Research Question", content: "", order: 0 },
      { section: "PROBLEM", title: "Problem", content: "", order: 1 },
      { section: "CONSTRAINTS", title: "Constraints", content: "", order: 2 },
      { section: "SUCCESS_METRICS", title: "Success Metrics", content: "", order: 3 },
    ],
    qualityProfile: {
      name: "Research Quality Profile",
      projectTypeId: "RESEARCH",
      dimensions: ["Rigor", "Reproducibility", "Documentation"],
      mandatoryDimensions: ["Rigor", "Reproducibility"],
      targetLevels: ["COMPETITIVE"],
    },
  },
  {
    id: "service",
    name: "Service Delivery",
    description: "Intake, Delivery, Review, and Handover stages for a client service engagement.",
    key: "service",
    projectTypeId: "SERVICE",
    stages: [
      { name: "Intake", order: 0, entryCriteria: [], exitCriteria: ["Requirements agreed"] },
      { name: "Delivery", order: 1, entryCriteria: ["Requirements agreed"], exitCriteria: ["Service delivered"] },
      { name: "Review", order: 2, entryCriteria: ["Service delivered"], exitCriteria: ["Client accepted"] },
      { name: "Handover", order: 3, entryCriteria: ["Client accepted"], exitCriteria: ["Docs handed over"] },
    ],
    deliverables: [
      { key: "reqs", title: "Requirements", type: "Brief", priority: "HIGH", order: 0, stageKey: "Intake" },
      { key: "service", title: "Service Deliverable", type: "Product", priority: "HIGH", order: 1, stageKey: "Delivery", dependsOn: ["reqs"] },
      { key: "review", title: "Client Review", type: "Review", priority: "MEDIUM", order: 2, stageKey: "Review", dependsOn: ["service"] },
    ],
    gates: [
      { level: "DELIVERABLE", name: "Delivery Gate", criteria: ["Acceptance criteria met"], order: 0 },
      { level: "RELEASE", name: "Handover Gate", criteria: ["Client sign-off"], order: 0 },
    ],
    brainSections: [
      { section: "PROBLEM", title: "Client Problem", content: "", order: 0 },
      { section: "OUTCOMES", title: "Desired Outcomes", content: "", order: 1 },
      { section: "CONSTRAINTS", title: "Constraints", content: "", order: 2 },
    ],
    qualityProfile: {
      name: "Service Delivery Quality Profile",
      projectTypeId: "SERVICE",
      dimensions: ["Requirement Coverage", "Quality", "Timeliness"],
      mandatoryDimensions: ["Requirement Coverage", "Quality"],
      targetLevels: ["COMPETITIVE"],
    },
  },
  {
    id: "internal-tool",
    name: "Internal Tool",
    description: "Spec, Build, Rollout stages for an internal productivity tool.",
    key: "internal-tool",
    projectTypeId: "INTERNAL_TOOL",
    stages: [
      { name: "Spec", order: 0, entryCriteria: [], exitCriteria: ["Spec approved"] },
      { name: "Build", order: 1, entryCriteria: ["Spec approved"], exitCriteria: ["Tool working"] },
      { name: "Rollout", order: 2, entryCriteria: ["Tool working"], exitCriteria: ["Adopted"] },
    ],
    deliverables: [
      { key: "spec", title: "Tool Spec", type: "Brief", priority: "MEDIUM", order: 0, stageKey: "Spec" },
      { key: "tool", title: "Tool Build", type: "Product", priority: "MEDIUM", order: 1, stageKey: "Build", dependsOn: ["spec"] },
      { key: "rollout", title: "Rollout Plan", type: "Plan", priority: "LOW", order: 2, stageKey: "Rollout", dependsOn: ["tool"] },
    ],
    gates: [
      { level: "DELIVERABLE", name: "Build Gate", criteria: ["Smoke test passes"], order: 0 },
      { level: "RELEASE", name: "Rollout Gate", criteria: ["Stakeholder approval"], order: 0 },
    ],
    brainSections: [
      { section: "PROBLEM", title: "Problem", content: "", order: 0 },
      { section: "OUTCOMES", title: "Desired Outcomes", content: "", order: 1 },
    ],
    qualityProfile: {
      name: "Internal Tool Quality Profile",
      projectTypeId: "INTERNAL_TOOL",
      dimensions: ["Functional Completeness", "Usability"],
      mandatoryDimensions: ["Functional Completeness"],
      targetLevels: ["BASIC"],
    },
  },
];

export function getBuiltInTemplate(id: string): TemplateDef | undefined {
  const t = BUILT_IN_TEMPLATES.find((t) => t.id === id);
  return t ? templateDefSchema.parse(t) : undefined;
}

// TPL-001 — lightweight list (id, name, description, projectTypeId) for UIs.
export function listBuiltInTemplates() {
  return BUILT_IN_TEMPLATES.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    projectTypeId: t.projectTypeId,
  }));
}

// TPL-001 — validate a template definition (built-in or custom payload).
export function validateTemplate(def: unknown): TemplateDef {
  return templateDefSchema.parse(def);
}

// TPL-001 — validate all built-in templates at module load (fail fast on
// a malformed built-in so the bug surfaces at boot rather than at project create).
for (const t of BUILT_IN_TEMPLATES) {
  validateTemplate(t);
}

export const ProjectTypeIdEnum = ProjectTypeId;
