#!/usr/bin/env python3
from __future__ import annotations
import argparse, shutil, subprocess
from pathlib import Path
from telegram_common import load_json, resolve_repo


def run(cmd:list[str], cwd:Path|None=None, check=True):
    print('+',' '.join(cmd))
    return subprocess.run(cmd,cwd=cwd,check=check)


def main()->int:
    ap=argparse.ArgumentParser(description='Create/validate one isolated Hermes profile per enabled Telegram project route.')
    ap.add_argument('--registry',default='09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json')
    ap.add_argument('--clone-from',help='Optional existing Hermes profile whose provider/tool config should be cloned.')
    ap.add_argument('--dry-run',action='store_true')
    args=ap.parse_args()
    if not shutil.which('hermes'): raise SystemExit('hermes CLI is not on PATH')
    reg_path=Path(args.registry).resolve(); reg=load_json(reg_path)
    for pid,cfg in reg.get('projects',{}).items():
        if not cfg.get('enabled'): continue
        profile=cfg['hermesProfile']; repo=resolve_repo(reg_path,cfg['repository'])
        if not repo.exists(): raise SystemExit(f'{pid}: repository not found: {repo}')
        show=subprocess.run(['hermes','profile','show',profile],capture_output=True,text=True)
        if show.returncode==0:
            print(f'{pid}: profile {profile} already exists')
            continue
        cmd=['hermes','profile','create',profile]
        if args.clone_from: cmd += ['--clone-from',args.clone_from]
        if args.dry_run: print('DRY RUN +',' '.join(cmd))
        else: run(cmd)
    return 0
if __name__=='__main__': raise SystemExit(main())
