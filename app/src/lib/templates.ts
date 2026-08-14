// Built-in project templates (PRJ-001 / TPL-001 built-ins).
// Normative source: 04-architecture/DATA_MODEL.md and UX screen specs.
// Each template seeds ProjectStage rows and a default Project Brain structure.

export interface BuiltInTemplateStage {
  name: string;
  order: number;
  entryCriteria?: string[];
  exitCriteria?: string[];
}

export interface BuiltInTemplateBrainSection {
  section: string;
  title: string;
  content: string;
  order: number;
}

export interface BuiltInTemplate {
  id: string;
  name: string;
  description: string;
  stages: BuiltInTemplateStage[];
  brainSections: BuiltInTemplateBrainSection[];
}

export const BUILT_IN_TEMPLATES: BuiltInTemplate[] = [
  {
    id: "blank",
    name: "Blank Project",
    description: "Start empty with a single Draft stage and an empty Project Brain.",
    stages: [{ name: "Draft", order: 0, entryCriteria: [], exitCriteria: [] }],
    brainSections: [],
  },
  {
    id: "standard-venture",
    name: "Standard Venture Build",
    description:
      "Discovery, Build, Validate, Launch, and Operate stages with a seeded Project Brain.",
    stages: [
      { name: "Discovery", order: 0, entryCriteria: [], exitCriteria: ["Problem validated"] },
      { name: "Build", order: 1, entryCriteria: ["Problem validated"], exitCriteria: ["MVP complete"] },
      { name: "Validate", order: 2, entryCriteria: ["MVP complete"], exitCriteria: ["Evidence retained"] },
      { name: "Launch", order: 3, entryCriteria: ["Evidence retained"], exitCriteria: ["Live"] },
      { name: "Operate", order: 4, entryCriteria: ["Live"], exitCriteria: [] },
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
  },
  {
    id: "product-release",
    name: "Product Release",
    description: "Plan, Develop, Test, Release stages for a scoped product release.",
    stages: [
      { name: "Plan", order: 0, entryCriteria: [], exitCriteria: ["Scope agreed"] },
      { name: "Develop", order: 1, entryCriteria: ["Scope agreed"], exitCriteria: ["Build done"] },
      { name: "Test", order: 2, entryCriteria: ["Build done"], exitCriteria: ["Quality gate passed"] },
      { name: "Release", order: 3, entryCriteria: ["Quality gate passed"], exitCriteria: ["Shipped"] },
    ],
    brainSections: [
      { section: "VISION", title: "Vision", content: "", order: 0 },
      { section: "OUTCOMES", title: "Desired Outcomes", content: "", order: 1 },
      { section: "CONSTRAINTS", title: "Constraints", content: "", order: 2 },
    ],
  },
];

export function getBuiltInTemplate(id: string): BuiltInTemplate | undefined {
  return BUILT_IN_TEMPLATES.find((t) => t.id === id);
}
