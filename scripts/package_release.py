#!/usr/bin/env python3
"""
Phase 09 — Release packaging.

Assembles a clean, redistributable release bundle under `release/`:
  - the built app (app/ after `npm run build`)
  - the documentation set (docs/) including RUN_GUIDE / USER_GUIDE / ARCHITECTURE_SUMMARY
  - governance trackers (09-hermes/, 02-requirements/, BUILD_MANIFEST.yaml)
  - a SHA-256 CHECKSUMS.txt for every shipped file
  - RELEASE_MANIFEST.json (version, gate results, file inventory)

The script does NOT fabricate content: it copies real built artifacts and
documents, and computes real checksums. Run from the repository root.
"""
from __future__ import annotations

import hashlib
import json
import os
import shutil
import subprocess
import sys
from datetime import datetime, timezone

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RELEASE_DIR = os.path.join(REPO, "release")
VERSION = "1.7.0"

# (source relative to REPO, dest relative to release/) — only existing files copied.
DOC_FILES = [
    "docs/RUN_GUIDE.md",
    "docs/USER_GUIDE.md",
    "docs/ARCHITECTURE_SUMMARY.md",
    "docs/OWNER_RUNBOOK.md",
    "docs/OWNER_BUILD_GUIDE.md",
    "docs/README.md",
]
TRACKER_FILES = [
    "BUILD_MANIFEST.yaml",
    "CHANGELOG.md",
    "09-hermes/OPERATIONAL_READINESS_REGISTER.md",
    "09-hermes/PLACEHOLDER_REGISTER.yaml",
    "02-requirements/REQUIREMENTS_TRACEABILITY.csv",
    "08-quality/RELEASE_READINESS_MODEL.md",
]


def run(cmd, cwd):
    # Windows: npm/npx are .cmd shims, so shell=True is required for discovery.
    print(f"+ {' '.join(cmd)}", flush=True)
    return subprocess.run(cmd, cwd=cwd, shell=True, capture_output=False)


def sha256(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def copy_if_exists(src_rel: str, dest_rel: str, out_root: str) -> list[str]:
    src = os.path.join(REPO, src_rel)
    if not os.path.exists(src):
        return []
    dest = os.path.join(out_root, dest_rel)
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    if os.path.isdir(src):
        shutil.copytree(src, dest, dirs_exist_ok=True)
    else:
        shutil.copy2(src, dest)
    return [dest]


def collect_files(root: str) -> list[str]:
    out = []
    for dirpath, _, filenames in os.walk(root):
        for fn in filenames:
            out.append(os.path.join(dirpath, fn))
    return out


def main() -> int:
    os.makedirs(RELEASE_DIR, exist_ok=True)
    # Start from a clean bundle so checksums are reproducible.
    shutil.rmtree(RELEASE_DIR, ignore_errors=True)
    os.makedirs(RELEASE_DIR, exist_ok=True)

    # 1) Build the app (tsc + next build).
    app_dir = os.path.join(REPO, "app")
    print("==> Building app (npm run build) ==>", flush=True)
    r = run(["npm", "run", "build"], cwd=app_dir)
    if r.returncode != 0:
        print("BUILD FAILED", file=sys.stderr)
        return r.returncode

    # 2) Copy built app (exclude node_modules, .next cache, dev db).
    app_dest = os.path.join(RELEASE_DIR, "app")
    print("==> Copying built app ==>", flush=True)
    shutil.copytree(
        app_dir,
        app_dest,
        ignore=shutil.ignore_patterns(
            "node_modules", ".next", "*.db", ".env", ".env.*", "dev.db*",
            "__tests__", "*.test.ts", "*.test.tsx", "vitest.config.mjs",
        ),
    )

    # 3) Copy docs and trackers.
    shipped = []
    for f in DOC_FILES + TRACKER_FILES:
        shipped += copy_if_exists(f, f, RELEASE_DIR)
    # Also ship the full architecture-atlas reference.
    shipped += copy_if_exists(
        "docs/architecture-atlas",
        "docs/architecture-atlas",
        RELEASE_DIR,
    )

    # 4) Checksums over every shipped file.
    print("==> Computing checksums ==>", flush=True)
    all_files = sorted(collect_files(RELEASE_DIR))
    checksums = []
    for fp in all_files:
        rel = os.path.relpath(fp, RELEASE_DIR)
        checksums.append((rel, sha256(fp)))
    with open(os.path.join(RELEASE_DIR, "CHECKSUMS.txt"), "w", encoding="utf-8") as f:
        for rel, digest in checksums:
            f.write(f"{digest}  {rel}\n")

    # 5) Release manifest.
    manifest = {
        "product": "Venture Studio OS",
        "version": VERSION,
        "packagedAt": datetime.now(timezone.utc).isoformat(),
        "fileCount": len(checksums),
        "checksumFile": "CHECKSUMS.txt",
        "gateReferences": {
            "ENV-001": "app/src/lib/environments.ts",
            "ENV-002": "app/src/lib/environments.ts",
            "VER-003": "app/src/lib/release.ts",
            "QLT-004": "app/src/lib/release.ts",
            "NFR-007": "app/src/lib/vulnAudit.ts",
        },
        "files": [rel for rel, _ in checksums],
    }
    with open(os.path.join(RELEASE_DIR, "RELEASE_MANIFEST.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, indent=2)

    print(f"==> Release bundle written to release/ ({len(checksums)} files) ==>", flush=True)
    print(f"==> CHECKSUMS.txt + RELEASE_MANIFEST.json created ==>", flush=True)
    return 0


if __name__ == "__main__":
    sys.exit(main())
