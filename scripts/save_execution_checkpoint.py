#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, subprocess
from datetime import datetime, timezone
from pathlib import Path
from telegram_common import load_json, atomic_write_json, resolve_repo


def git(repo: Path, *args: str) -> str | None:
    try:
        cp = subprocess.run(['git','-C',str(repo),*args], capture_output=True, text=True, timeout=15, check=True)
        return cp.stdout.strip()
    except Exception:
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description='Persist a durable project execution checkpoint.')
    ap.add_argument('--registry', default='09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json')
    ap.add_argument('--project', required=True)
    ap.add_argument('--status', default='executing')
    ap.add_argument('--phase')
    ap.add_argument('--work-packet')
    ap.add_argument('--last-action')
    ap.add_argument('--resume')
    ap.add_argument('--unsafe', action='store_true')
    ap.add_argument('--error')
    args = ap.parse_args()

    reg_path = Path(args.registry)
    reg = load_json(reg_path)
    cfg = reg.get('projects', {}).get(args.project)
    if not cfg:
        raise SystemExit(f'Unknown project: {args.project}')
    repo = resolve_repo(reg_path, cfg['repository'])
    state_path = repo / cfg.get('executionState', '09-hermes/EXECUTION_STATE.json')
    state = load_json(state_path) if state_path.exists() else {'schemaVersion':1,'projectId':args.project}

    state.update({
        'projectId': args.project,
        'status': args.status,
        'lastCheckpointAt': datetime.now(timezone.utc).isoformat(),
        'safeToResume': not args.unsafe,
    })
    if args.phase is not None: state['currentPhase'] = args.phase
    if args.work_packet is not None: state['currentWorkPacket'] = args.work_packet
    if args.last_action is not None: state['lastSuccessfulAction'] = args.last_action
    if args.resume is not None: state['resumeInstruction'] = args.resume
    state['lastError'] = args.error
    state['git'] = {
        'branch': git(repo, 'branch', '--show-current'),
        'commit': git(repo, 'rev-parse', 'HEAD'),
        'dirty': bool(git(repo, 'status', '--porcelain') or ''),
    }
    atomic_write_json(state_path, state)
    print(state_path)
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
