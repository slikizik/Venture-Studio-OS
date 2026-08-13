#!/usr/bin/env python3
from __future__ import annotations
import argparse,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]

def git(*args):
    p=subprocess.run(['git',*args],cwd=ROOT,text=True,capture_output=True); return p.returncode,(p.stdout or '').strip()

def main()->int:
    ap=argparse.ArgumentParser(); ap.add_argument('--state',default='09-hermes/EXECUTION_STATE.json'); ap.add_argument('--require-lease',action='store_true'); ap.add_argument('--project',default='VSO'); a=ap.parse_args()
    state=json.loads((ROOT/a.state).read_text()); errors=[]
    if not state.get('safeToResume'): errors.append('checkpoint says safeToResume=false')
    code,b=git('branch','--show-current')
    if code==0 and b:
        expected=state.get('git',{}).get('branch')
        if expected and expected!=b: errors.append(f'branch mismatch checkpoint={expected} current={b}')
        _,sha=git('rev-parse','HEAD'); expected_sha=state.get('git',{}).get('commit')
        if expected_sha and expected_sha!=sha: errors.append('commit differs from checkpoint; explicit review required')
        _,dirty=git('status','--porcelain')
        if dirty: errors.append('worktree is dirty')
    if state.get('status') in {'executing','migrating'} and not state.get('lastSuccessfulAction'): errors.append('active checkpoint lacks lastSuccessfulAction boundary')
    if errors:
        for e in errors: print('RESUME BLOCKED:',e)
        return 2
    print('RESUME VERIFIED')
    return 0
if __name__=='__main__': raise SystemExit(main())
