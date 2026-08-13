#!/usr/bin/env python3
"""Git-remote execution lease for cross-workstation autonomous VSO execution.

The lease lives in a dedicated remote ref, not in the development branch:
  refs/heads/vso-leases/<project-id>/<branch>

Acquisition/heartbeat/release use git push --force-with-lease so competing
workstations cannot silently overwrite one another's ownership.
"""
from __future__ import annotations
import argparse, json, os, platform, subprocess, tempfile, time
from datetime import datetime, timezone
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
DEFAULT_TTL=300

class LeaseError(RuntimeError): pass

def run(*args:str, check=True)->str:
    p=subprocess.run(list(args),cwd=ROOT,text=True,capture_output=True)
    if check and p.returncode:
        raise LeaseError((p.stderr or p.stdout or 'command failed').strip())
    return (p.stdout or '').strip()

def machine_id()->str:
    p=ROOT/'.vso-machine.local.json'
    if p.exists():
        try:
            v=json.loads(p.read_text())
            if v.get('machineId'): return str(v['machineId'])
        except Exception: pass
    return platform.node() or platform.system()

def branch()->str:
    b=run('git','branch','--show-current')
    if not b: raise LeaseError('Detached HEAD is not supported.')
    return b

def ref_name(project:str)->str:
    safe=''.join(c if c.isalnum() or c in '-_.' else '-' for c in project)
    b=''.join(c if c.isalnum() or c in '-_.' else '-' for c in branch())
    return f'refs/heads/vso-leases/{safe}/{b}'

def fetch_remote_ref(ref:str)->str|None:
    out=run('git','ls-remote','origin',ref,check=False)
    if not out: return None
    sha=out.split()[0]
    # Ensure the remote lease commit/object exists locally before reading lease.json.
    p=subprocess.run(['git','fetch','-q','origin',ref],cwd=ROOT,text=True,capture_output=True)
    if p.returncode:
        raise LeaseError((p.stderr or p.stdout or 'could not fetch lease ref').strip())
    return sha

def read_commit_json(sha:str|None)->dict|None:
    if not sha: return None
    raw=run('git','show',f'{sha}:lease.json',check=False)
    if not raw: return None
    try:return json.loads(raw)
    except json.JSONDecodeError:return None

def make_commit(data:dict,parent:str|None)->str:
    blob=run('git','hash-object','-w','--stdin',check=True) if False else None
    payload=(json.dumps(data,indent=2,sort_keys=True)+'\n').encode()
    p=subprocess.run(['git','hash-object','-w','--stdin'],cwd=ROOT,input=payload,capture_output=True)
    if p.returncode: raise LeaseError(p.stderr.decode(errors='replace'))
    blob=p.stdout.decode().strip()
    tree_in=f'100644 blob {blob}\tlease.json\n'.encode()
    p=subprocess.run(['git','mktree'],cwd=ROOT,input=tree_in,capture_output=True)
    if p.returncode: raise LeaseError(p.stderr.decode(errors='replace'))
    tree=p.stdout.decode().strip()
    args=['git','commit-tree',tree]
    if parent: args += ['-p',parent]
    env=dict(os.environ); env.setdefault('GIT_AUTHOR_NAME','VSO Lease Manager'); env.setdefault('GIT_AUTHOR_EMAIL','vso-lease@local'); env.setdefault('GIT_COMMITTER_NAME','VSO Lease Manager'); env.setdefault('GIT_COMMITTER_EMAIL','vso-lease@local')
    p=subprocess.run(args,cwd=ROOT,input=b'VSO execution lease\n',capture_output=True,env=env)
    if p.returncode: raise LeaseError(p.stderr.decode(errors='replace'))
    return p.stdout.decode().strip()

def is_active(data:dict|None)->bool:
    return bool(data and data.get('status')=='ACTIVE' and float(data.get('expiresEpoch',0))>time.time())

def push_atomic(newsha:str,ref:str,oldsha:str|None):
    expected=oldsha or '0000000000000000000000000000000000000000'
    p=subprocess.run(['git','push',f'--force-with-lease={ref}:{expected}','origin',f'{newsha}:{ref}'],cwd=ROOT,text=True,capture_output=True)
    if p.returncode:
        raise LeaseError('Lease changed remotely while this operation was running. Another workstation may own it. '+(p.stderr or p.stdout).strip())

def status(project:str):
    ref=ref_name(project); sha=fetch_remote_ref(ref); data=read_commit_json(sha)
    print(json.dumps({'ref':ref,'sha':sha,'lease':data,'active':is_active(data)},indent=2))

def acquire(project:str,ttl:int):
    ref=ref_name(project); old=fetch_remote_ref(ref); prior=read_commit_json(old); me=machine_id()
    if is_active(prior) and prior.get('owner')!=me:
        raise LeaseError(f"Project is leased to {prior.get('owner')} until {prior.get('expiresAt')}.")
    now=time.time(); data={'schemaVersion':1,'project':project,'branch':branch(),'owner':me,'status':'ACTIVE','acquiredAt':prior.get('acquiredAt') if prior and prior.get('owner')==me and is_active(prior) else datetime.now(timezone.utc).isoformat(),'heartbeatAt':datetime.now(timezone.utc).isoformat(),'expiresAt':datetime.fromtimestamp(now+ttl,timezone.utc).isoformat(),'expiresEpoch':now+ttl}
    new=make_commit(data,old); push_atomic(new,ref,old); print(f'LEASE ACQUIRED: {project} by {me}')

def heartbeat(project:str,ttl:int):
    ref=ref_name(project); old=fetch_remote_ref(ref); prior=read_commit_json(old); me=machine_id()
    if not is_active(prior) or prior.get('owner')!=me: raise LeaseError('Cannot heartbeat: this workstation does not own an active lease.')
    now=time.time(); prior.update({'heartbeatAt':datetime.now(timezone.utc).isoformat(),'expiresAt':datetime.fromtimestamp(now+ttl,timezone.utc).isoformat(),'expiresEpoch':now+ttl})
    new=make_commit(prior,old); push_atomic(new,ref,old); print(f'LEASE HEARTBEAT: {project} by {me}')

def release(project:str):
    ref=ref_name(project); old=fetch_remote_ref(ref); prior=read_commit_json(old); me=machine_id()
    if not prior: print('LEASE ALREADY FREE'); return
    if is_active(prior) and prior.get('owner')!=me: raise LeaseError(f"Cannot release lease owned by {prior.get('owner')}.")
    prior.update({'status':'RELEASED','releasedAt':datetime.now(timezone.utc).isoformat(),'expiresEpoch':0})
    new=make_commit(prior,old); push_atomic(new,ref,old); print(f'LEASE RELEASED: {project} by {me}')

def main()->int:
    ap=argparse.ArgumentParser(); ap.add_argument('command',choices=['status','acquire','heartbeat','release']); ap.add_argument('--project',default='VSO'); ap.add_argument('--ttl',type=int,default=DEFAULT_TTL); a=ap.parse_args()
    try:
        {'status':status,'acquire':lambda p:acquire(p,a.ttl),'heartbeat':lambda p:heartbeat(p,a.ttl),'release':release}[a.command](a.project); return 0
    except LeaseError as e: print(f'LEASE BLOCKED: {e}'); return 2
if __name__=='__main__': raise SystemExit(main())
