// Owner application settings (Settings screen; NFR-008 owner timezone).
// Persisted as key/value rows. Owner display name + IANA timezone drive all
// date display in the UI.
import { prisma } from "./prisma";
import { isValidTimeZone } from "./datetime";

const DEFAULTS: Record<string, string> = {
  ownerDisplayName: "Owner",
  ownerTimeZone: "UTC",
  dataDirectory: "",
  backupRetentionDays: "30",
  defaultExportLocation: "",
};

export interface OwnerSettings {
  ownerDisplayName: string;
  ownerTimeZone: string;
  dataDirectory: string;
  backupRetentionDays: number;
  defaultExportLocation: string;
}

export async function getSettings(): Promise<OwnerSettings> {
  const rows = await prisma.appSetting.findMany();
  const map: Record<string, string> = {};
  for (const r of rows) map[r.key] = r.value;
  return {
    ownerDisplayName: map.ownerDisplayName ?? DEFAULTS.ownerDisplayName,
    ownerTimeZone: isValidTimeZone(map.ownerTimeZone ?? "") ? map.ownerTimeZone! : DEFAULTS.ownerTimeZone,
    dataDirectory: map.dataDirectory ?? DEFAULTS.dataDirectory,
    backupRetentionDays: Number(map.backupRetentionDays ?? DEFAULTS.backupRetentionDays) || 30,
    defaultExportLocation: map.defaultExportLocation ?? DEFAULTS.defaultExportLocation,
  };
}

export async function saveSettings(input: Partial<OwnerSettings>, updatedBy = "SYSTEM") {
  const next = await getSettings();
  const merged: OwnerSettings = {
    ...next,
    ...(input.ownerDisplayName !== undefined ? { ownerDisplayName: input.ownerDisplayName } : {}),
    ...(input.ownerTimeZone !== undefined
      ? { ownerTimeZone: isValidTimeZone(input.ownerTimeZone) ? input.ownerTimeZone : next.ownerTimeZone }
      : {}),
    ...(input.dataDirectory !== undefined ? { dataDirectory: input.dataDirectory } : {}),
    ...(input.backupRetentionDays !== undefined ? { backupRetentionDays: input.backupRetentionDays } : {}),
    ...(input.defaultExportLocation !== undefined ? { defaultExportLocation: input.defaultExportLocation } : {}),
  };
  await prisma.$transaction(
    (Object.keys(merged) as (keyof OwnerSettings)[]).map((k) =>
      prisma.appSetting.upsert({
        where: { key: k },
        create: { key: k, value: String(merged[k]), updatedBy },
        update: { value: String(merged[k]), updatedBy },
      }),
    ),
  );
  return merged;
}
