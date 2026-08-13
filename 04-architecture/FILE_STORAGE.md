# File Storage, Export, Backup, and Recovery

## Local directories

```text
runtime/
├── main/
│   ├── database/
│   ├── attachments/
│   ├── exports/
│   ├── backups/
│   └── logs/
└── <environment-id>/...
```

Runtime data must not be committed to Git.

## Attachments

MVP supports PDF, PNG, JPG, WEBP, TXT, MD, CSV, JSON, DOCX, XLSX, ZIP, and common source-code text files. Default maximum file size is 50 MB, configurable locally.

Filenames are sanitized and stored using generated IDs. Original filenames and checksums are retained as metadata.

Approved evidence files are immutable. Replacements create new evidence records.

## Project export

A project export is a ZIP containing:

```text
manifest.json
project.json
attachments/
checksums.sha256
```

The manifest includes schema version, VSO version, export timestamp, and project ID.

## Import

- Validate manifest and checksums before writing data.
- Reject unsupported future schema versions.
- Present a conflict summary before import.
- Import into a transaction.
- Roll back completely on failure.

## Backup

- Create a database and attachment backup before every destructive migration or import.
- Provide a manual `Create Backup` action.
- Retain at least the latest five local backups unless the owner changes retention.

## Recovery

Document restoration commands in `docs/RECOVERY_GUIDE.md`. Never overwrite the current database without first creating a safety copy.
