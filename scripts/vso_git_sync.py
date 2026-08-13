#!/usr/bin/env python3
"""Safe cross-workstation Git handoff/resume helper for Venture Studio OS.

Commands:
  status   Show local/remote relationship and safety checks.
  handoff  Validate, commit local changes, and push the active branch.
  resume   Require a clean tree, fetch, and fast-forward pull the active branch.

The tool deliberately refuses automatic merges, force pushes, dirty pulls,
and direct automated commits on main.
"""
from __future__ import annotations

import argparse
import json
import os
import platform
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FORBIDDEN_TRACKED = {
    ".env",
    ".env.telegram",
    ".vso-machine.local.json",
}
FORBIDDEN_PREFIXES = (
    "node_modules/",
    ".next/",
    "dist/",
    "build/",
    "runtime/telegram/",
)


class SyncError(RuntimeError):
    pass


def run(*args: str, check: bool = True, capture: bool = True) -> subprocess.CompletedProcess[str]:
    proc = subprocess.run(
        list(args), cwd=ROOT, text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
    )
    if check and proc.returncode != 0:
        detail = (proc.stderr or proc.stdout or "command failed").strip()
        raise SyncError(f"{' '.join(args)}: {detail}")
    return proc


def git(*args: str, check: bool = True) -> str:
    return (run("git", *args, check=check).stdout or "").strip()


def require_git_repo() -> None:
    if not shutil.which("git"):
        raise SyncError("Git is not installed or not on PATH.")
    if git("rev-parse", "--is-inside-work-tree", check=False) != "true":
        raise SyncError(f"Not a Git repository: {ROOT}")


def branch() -> str:
    value = git("branch", "--show-current")
    if not value:
        raise SyncError("Detached HEAD is not supported for smart sync.")
    return value


def dirty() -> bool:
    return bool(git("status", "--porcelain"))


def ensure_safe_tracked_files() -> None:
    tracked = set(git("ls-files").splitlines())
    bad = sorted(
        p for p in tracked
        if p in FORBIDDEN_TRACKED or any(p.startswith(prefix) for prefix in FORBIDDEN_PREFIXES)
    )
    if bad:
        raise SyncError("Unsafe machine-local/generated files are tracked: " + ", ".join(bad))


def remote_exists() -> bool:
    return "origin" in git("remote").splitlines()


def upstream() -> str | None:
    value = git("rev-parse", "--abbrev-ref", "--symbolic-full-name", "@{u}", check=False)
    return value or None


def ahead_behind(upstream_ref: str) -> tuple[int, int]:
    raw = git("rev-list", "--left-right", "--count", f"HEAD...{upstream_ref}")
    left, right = raw.split()
    return int(left), int(right)  # ahead, behind


def fetch() -> None:
    if not remote_exists():
        raise SyncError("Remote 'origin' is not configured. Add your private Git remote first.")
    run("git", "fetch", "--prune", "origin", capture=False)


def machine_name() -> str:
    config = ROOT / ".vso-machine.local.json"
    if config.exists():
        try:
            data = json.loads(config.read_text(encoding="utf-8"))
            if data.get("machineId"):
                return str(data["machineId"])
        except (json.JSONDecodeError, OSError):
            pass
    return platform.node() or platform.system()


def run_validation(skip: bool) -> None:
    if skip:
        return
    validator = ROOT / "scripts" / "validate_package.py"
    if validator.exists():
        print("Running package validation...")
        proc = subprocess.run([sys.executable, str(validator)], cwd=ROOT)
        if proc.returncode != 0:
            raise SyncError("Package validation failed. Handoff cancelled.")


def lease(command: str, project: str = "VSO") -> None:
    script = ROOT / "scripts" / "vso_execution_lease.py"
    if not script.exists():
        raise SyncError("Execution lease manager is missing.")
    proc = subprocess.run([sys.executable, str(script), command, "--project", project], cwd=ROOT, text=True)
    if proc.returncode != 0:
        raise SyncError(f"Execution lease {command} failed.")


def status_cmd() -> None:
    require_git_repo()
    ensure_safe_tracked_files()
    b = branch()
    print(f"Repository: {ROOT}")
    print(f"Machine:    {machine_name()}")
    print(f"Branch:     {b}")
    print(f"Worktree:   {'DIRTY' if dirty() else 'clean'}")
    if not remote_exists():
        print("Remote:     origin NOT CONFIGURED")
        return
    fetch()
    up = upstream()
    if up:
        a, d = ahead_behind(up)
        print(f"Upstream:   {up}")
        print(f"Ahead:      {a}")
        print(f"Behind:     {d}")
    else:
        print("Upstream:   not set (first handoff will set it)")
    print("Execution lease:")
    subprocess.run([sys.executable, str(ROOT/"scripts"/"vso_execution_lease.py"), "status", "--project", "VSO"], cwd=ROOT)


def handoff_cmd(message: str | None, skip_validation: bool) -> None:
    require_git_repo()
    ensure_safe_tracked_files()
    b = branch()
    if b == "main":
        raise SyncError("Automated handoff is blocked on 'main'. Switch to an approved development/feature branch.")
    fetch()
    up = upstream()
    if up:
        ahead, behind = ahead_behind(up)
        if behind:
            raise SyncError(
                f"Remote has {behind} newer commit(s). Handoff cancelled. "
                "Use 'resume' on this machine, resolve any local work safely, then retry."
            )
    run_validation(skip_validation)
    if dirty():
        run("git", "add", "-A", capture=False)
        ensure_safe_tracked_files()
        staged = git("diff", "--cached", "--name-only")
        if staged:
            msg = message or f"VSO handoff from {machine_name()} — {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
            run("git", "commit", "-m", msg, capture=False)
    else:
        print("No uncommitted changes to save.")

    up = upstream()
    if up:
        run("git", "push", capture=False)
    else:
        run("git", "push", "-u", "origin", b, capture=False)
    lease("release")
    print(f"HANDOFF READY: branch '{b}' is pushed and execution lease released from {machine_name()}.")


def resume_cmd(skip_validation: bool) -> None:
    require_git_repo()
    ensure_safe_tracked_files()
    b = branch()
    if dirty():
        raise SyncError("Local worktree is dirty. Resume refuses to pull over local changes. Commit, handoff, or clean them first.")
    fetch()
    up = upstream()
    if not up:
        candidate = f"origin/{b}"
        if git("rev-parse", "--verify", candidate, check=False):
            run("git", "branch", "--set-upstream-to", candidate, b, capture=False)
            up = candidate
        else:
            raise SyncError(f"No upstream exists for branch '{b}'. Push it from the source workstation first.")
    ahead, behind = ahead_behind(up)
    if ahead and behind:
        raise SyncError("Local and remote histories have diverged. Automatic merge is forbidden; resolve explicitly.")
    if ahead:
        raise SyncError(
            f"This machine has {ahead} unpushed commit(s). Push/handoff them before resuming from another workstation."
        )
    if behind:
        run("git", "pull", "--ff-only", capture=False)
    else:
        print("Already synchronized with remote.")
    run_validation(skip_validation)
    lease("acquire")
    print(f"RESUME READY: branch '{b}' is synchronized and execution lease acquired on {machine_name()}.")


def main() -> int:
    parser = argparse.ArgumentParser(description="Safe VSO Git synchronization across workstations")
    sub = parser.add_subparsers(dest="command", required=True)
    sub.add_parser("status")
    p_handoff = sub.add_parser("handoff")
    p_handoff.add_argument("--message")
    p_handoff.add_argument("--skip-validation", action="store_true")
    p_resume = sub.add_parser("resume")
    p_resume.add_argument("--skip-validation", action="store_true")
    args = parser.parse_args()
    try:
        if args.command == "status":
            status_cmd()
        elif args.command == "handoff":
            handoff_cmd(args.message, args.skip_validation)
        elif args.command == "resume":
            resume_cmd(args.skip_validation)
        return 0
    except SyncError as exc:
        print(f"SYNC BLOCKED: {exc}", file=sys.stderr)
        return 2


if __name__ == "__main__":
    raise SystemExit(main())
