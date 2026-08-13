#!/usr/bin/env python3
from __future__ import annotations
import argparse, shutil, subprocess
from pathlib import Path
from telegram_common import load_json, resolve_repo


def main() -> int:
    ap = argparse.ArgumentParser(description='Validate project/topic/profile routing before starting Telegram control.')
    ap.add_argument('--registry', default='09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json')
    ap.add_argument('--check-profiles', action='store_true')
    args = ap.parse_args()
    path = Path(args.registry)
    reg = load_json(path)
    seen = set(); errors=[]
    allowed=reg.get('telegram',{}).get('allowedUserIds',[])
    enabled_count=sum(1 for cfg in reg.get('projects',{}).values() if cfg.get('enabled'))
    if enabled_count and not allowed: errors.append('Telegram enabled but allowedUserIds is empty; normal control must fail closed')
    for pid, cfg in reg.get('projects', {}).items():
        if not cfg.get('enabled'): continue
        tg=cfg.get('telegram',{}); key=(int(tg.get('chatId',0)), int(tg.get('topicId',0) or 0))
        if key == (0,0): errors.append(f'{pid}: chatId/topicId not configured')
        if key in seen: errors.append(f'{pid}: duplicate Telegram route {key}')
        seen.add(key)
        repo=resolve_repo(path,cfg.get('repository','.'))
        if not repo.exists(): errors.append(f'{pid}: repository does not exist: {repo}')
        if not (repo/'START_HERE.md').exists(): errors.append(f'{pid}: repository lacks START_HERE.md: {repo}')
        profile=cfg.get('hermesProfile','')
        if not profile: errors.append(f'{pid}: hermesProfile missing')
        elif args.check_profiles and shutil.which('hermes'):
            cp=subprocess.run(['hermes','profile','show',profile],capture_output=True,text=True)
            if cp.returncode != 0: errors.append(f'{pid}: Hermes profile {profile!r} not found')
    if errors:
        print('\n'.join('ERROR: '+e for e in errors)); return 1
    print(f'Routing valid for {len(seen)} enabled project(s); allowlisted owner IDs: {len(allowed)}.')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
