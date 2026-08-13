#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, subprocess, sys, yaml
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def call(args):
    print('+',' '.join(map(str,args))); return subprocess.run(args,cwd=ROOT).returncode

def main()->int:
    ap=argparse.ArgumentParser(description='Fast VSO preflight before long-running execution.'); ap.add_argument('--phase'); ap.add_argument('--completion',action='store_true'); a=ap.parse_args()
    manifest=yaml.safe_load((ROOT/'BUILD_MANIFEST.yaml').read_text()); phase=a.phase or f"PHASE_{int(manifest.get('currentPhase',0)):02d}"
    checks=[([sys.executable,'scripts/validate_product_alignment.py'],'product alignment'),([sys.executable,'scripts/validate_operational_readiness.py'],'operational readiness'),([sys.executable,'scripts/scan_placeholders.py','--phase',phase]+(['--completion'] if a.completion else []),'placeholder gate')]
    for cmd,label in checks:
        if call(cmd): print(f'PREFLIGHT BLOCKED: {label} failed'); return 2
    # Basic repository identity when Git already exists.
    if (ROOT/'.git').exists():
        p=subprocess.run(['git','status','--porcelain'],cwd=ROOT,text=True,capture_output=True)
        if p.returncode: print('PREFLIGHT BLOCKED: Git status failed'); return 2
    print(f'PREFLIGHT READY: {phase}')
    return 0
if __name__=='__main__': raise SystemExit(main())
