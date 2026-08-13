#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess, sys, yaml
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def run(args:list[str])->bool:
    p=subprocess.run(args,cwd=ROOT,text=True); return p.returncode==0

def main()->int:
    errors=[]
    manifest=yaml.safe_load((ROOT/'BUILD_MANIFEST.yaml').read_text())
    if str(manifest.get('specificationBaseline'))!='1.7.0': errors.append('BUILD_MANIFEST specificationBaseline must be 1.7.0')
    state=json.loads((ROOT/'09-hermes/EXECUTION_STATE.json').read_text())
    if '1.7.0' not in str(state.get('lastSuccessfulAction','')): errors.append('EXECUTION_STATE baseline message is stale')
    reg=json.loads((ROOT/'09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json').read_text())
    if reg.get('telegram',{}).get('authorizationMode')!='deny_all_unless_listed': errors.append('Telegram authorizationMode must fail closed')
    required=['09-hermes/OPERATIONAL_READINESS_REGISTER.md','09-hermes/PLACEHOLDER_POLICY.md','09-hermes/PLACEHOLDER_REGISTER.yaml','scripts/scan_placeholders.py','scripts/vso_execution_lease.py']
    for r in required:
        if not (ROOT/r).exists(): errors.append('missing '+r)
    if not run([sys.executable,'scripts/scan_placeholders.py']): errors.append('placeholder scan failed')
    if errors:
        for e in errors: print('ERROR:',e)
        return 2
    print('OPERATIONAL READINESS STRUCTURE READY')
    return 0
if __name__=='__main__': raise SystemExit(main())
