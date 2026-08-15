// CLI entry point for DAT-004 backups. Invoked by migration/import flows and
// manually. Refuses to proceed if the backup cannot be created.
//
// Usage:
//   npm run db:backup -- --trigger MIGRATION --reason "schema v2" \
//       --source ./dev.db --dir ./backups
import { parseArgs } from "node:util";
import { createBackup, pruneBackups } from "../lib/backup";
import { backupRequestSchema } from "../lib/validation";

async function main() {
  const { values } = parseArgs({
    options: {
      trigger: { type: "string", default: "MANUAL" },
      reason: { type: "string", default: "manual backup" },
      source: { type: "string", default: process.env.DATABASE_URL?.replace("file:", "") ?? "./dev.db" },
      dir: { type: "string", default: process.env.VSO_BACKUP_DIR ?? "./backups" },
      retain: { type: "string", default: "10" },
    },
  });

  const req = backupRequestSchema.parse({
    trigger: values.trigger,
    reason: values.reason,
    sourceDbPath: values.source!,
    backupDir: values.dir!,
  });

  const result = await createBackup(req);
  console.log(`BACKUP_OK ${result.backupFilePath} (${result.bytes} bytes)`);

  const removed = await pruneBackups(req.backupDir, Number(values.retain));
  if (removed.length) console.log(`PRUNED ${removed.length} old backup(s)`);
  console.log("SAFE_TO_PROCEED");
}

main().catch((err) => {
  console.error("BACKUP_REFUSED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
