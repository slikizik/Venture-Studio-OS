// TPL-002 — instantiate a template into a project: seeds ProjectStage,
// Deliverable, QualityGate, ProjectBrain, and a default QualityProfile.
import { prisma } from "./prisma";
import { TemplateDef } from "./validation";
import { resolveTemplate } from "./customTemplates";
import { createQualityProfile } from "./quality";

export type SeedStage = Awaited<ReturnType<typeof prisma.projectStage.create>>;
export type SeedDeliverable = Awaited<ReturnType<typeof prisma.deliverable.create>>;
export type SeedGate = Awaited<ReturnType<typeof prisma.qualityGateResult.create>>;
export type SeedBrain = Awaited<ReturnType<typeof prisma.projectBrainEntry.create>>;
export type SeedProfile = Awaited<ReturnType<typeof prisma.qualityProfile.create>>;

export interface InstantiationResult {
  stages: SeedStage[];
  deliverables: SeedDeliverable[];
  gates: SeedGate[];
  brainSections: SeedBrain[];
  qualityProfile: SeedProfile | null;
}

// Resolve a template id to a normalized definition, or throw if unknown.
export async function getTemplateDef(templateId: string): Promise<TemplateDef> {
  const res = await resolveTemplate(templateId);
  if (!res) throw new Error(`Unknown template: ${templateId}`);
  return res.def;
}

// Seed all template-derived entities for a project. Idempotent per call; callers
// should only invoke this once at project creation (or when applying a template to
// an empty project). Returns the created entities.
export async function instantiateTemplate(projectId: string, templateId: string): Promise<InstantiationResult> {
  const def = await getTemplateDef(templateId);

  const stages = [];
  for (const s of [...def.stages].sort((a, b) => a.order - b.order)) {
    stages.push(await prisma.projectStage.create({
      data: {
        projectId, name: s.name, order: s.order,
        entryCriteria: JSON.stringify(s.entryCriteria),
        exitCriteria: JSON.stringify(s.exitCriteria),
      },
    }));
  }
  const stageByName = new Map(stages.map((s) => [s.name, s.id]));

  const createdDeliverables = [];
  for (const d of [...def.deliverables].sort((a, b) => a.order - b.order)) {
    createdDeliverables.push(await prisma.deliverable.create({
      data: {
        projectId,
        stageId: d.stageKey ? stageByName.get(d.stageKey) ?? null : null,
        title: d.title,
        description: d.description ?? "",
        type: d.type,
        priority: d.priority,
        order: d.order,
        weight: d.weight,
      },
    }));
  }
  // resolve parent/dependency keys to created deliverable ids (Deliverable has no key column)
  const keyToId = new Map(createdDeliverables.map((dl, i) => [def.deliverables[i].key, dl.id]));
  for (let i = 0; i < createdDeliverables.length; i++) {
    const d = def.deliverables[i];
    const parentId = d.parentKey ? (keyToId.get(d.parentKey) ?? null) : null;
    const dependsOnIds = d.dependsOn.map((k) => keyToId.get(k)).filter(Boolean) as string[];
    if (parentId) {
      await prisma.deliverable.update({
        where: { id: createdDeliverables[i].id },
        data: { parentId },
      });
    }
    for (const depId of dependsOnIds) {
      await prisma.deliverableDependency.create({
        data: { deliverableId: createdDeliverables[i].id, dependsOnDeliverableId: depId },
      });
    }
  }

  const gates = [];
  for (const g of [...def.gates].sort((a, b) => a.order - b.order)) {
    gates.push(await prisma.qualityGateResult.create({
      data: {
        projectId,
        level: g.level,
        entityId: projectId, // template gate applies at project scope
        outcome: "NOT_RUN",
        evaluatedBy: "system",
        criterionResults: JSON.stringify(g.criteria.map((c) => ({ statement: c, met: null }))),
      },
    }));
  }

  const brainSections = [];
  for (const b of [...def.brainSections].sort((a, b) => a.order - b.order)) {
    brainSections.push(await prisma.projectBrainEntry.create({
      data: { projectId, section: b.section, title: b.title, content: b.content, order: b.order },
    }));
  }

  let qualityProfile: SeedProfile | null = null;
  if (def.qualityProfile) {
    qualityProfile = await createQualityProfile(projectId, {
      name: def.qualityProfile.name,
      projectTypeId: def.qualityProfile.projectTypeId,
      dimensions: def.qualityProfile.dimensions.map((id, i) => ({ id, name: id, description: null })),
      mandatoryDimensions: def.qualityProfile.mandatoryDimensions,
      targetLevels: def.qualityProfile.targetLevels,
      status: "DRAFT",
    });
  }

  return { stages, deliverables: createdDeliverables, gates, brainSections, qualityProfile };
}
