#!/usr/bin/env python3
from __future__ import annotations
import argparse, json, os, queue, re, signal, subprocess, sys, threading, time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from telegram_common import load_json, atomic_write_json, bot_token, telegram_api, send_message, route_for_message, resolve_repo, enabled_projects

DIRECTION_RE = re.compile(r'^([A-Za-z0-9_-]+-DR-[0-9]+)\s+([A-Za-z0-9_-]+)(?:\s*\|\s*(.*))?$', re.S)
STOP=False

def now_iso(): return datetime.now(timezone.utc).isoformat()
def on_signal(signum,frame):
    global STOP; STOP=True

def authorized(reg:dict[str,Any],user_id:int)->bool:
    allowed=reg.get('telegram',{}).get('allowedUserIds',[])
    # Fail closed. Discovery mode is the only mode allowed without an allowlist.
    return bool(allowed) and int(user_id) in {int(x) for x in allowed}

def rel_or_abs(repo:Path,value:str)->Path:
    p=Path(value).expanduser(); return p if p.is_absolute() else repo/p

def find_direction_request(repo:Path,cfg:dict[str,Any],decision_id:str)->Path|None:
    directory=rel_or_abs(repo,cfg.get('directionRequestDirectory','09-hermes/direction-requests'))
    exact=directory/f'DIRECTION_REQUIRED_{decision_id}.md'
    if exact.exists(): return exact
    for p in directory.glob('*.md'):
        try:
            if decision_id.lower() in p.name.lower() or decision_id.lower() in p.read_text(encoding='utf-8',errors='ignore').lower(): return p
        except OSError: pass
    return None

def parse_direction_metadata(path:Path)->dict[str,Any]:
    text=path.read_text(encoding='utf-8',errors='replace')
    if not text.startswith('---\n'):
        raise RuntimeError(f'{path.name} lacks required YAML front matter.')
    end=text.find('\n---\n',4)
    if end<0: raise RuntimeError(f'{path.name} has invalid YAML front matter.')
    import yaml
    meta=yaml.safe_load(text[4:end]) or {}
    if not isinstance(meta,dict): raise RuntimeError('Direction metadata must be a mapping.')
    return meta

def validate_direction_choice(path:Path,decision_id:str,option:str)->dict[str,Any]:
    meta=parse_direction_metadata(path)
    if str(meta.get('decisionId','')).strip()!=decision_id: raise RuntimeError('Direction request ID does not match file/request.')
    if str(meta.get('status','')).upper()!='OPEN': raise RuntimeError(f"Direction request is not OPEN (status={meta.get('status')}).")
    options=meta.get('options') or []
    valid=[]
    for item in options:
        valid.append(str(item.get('id')) if isinstance(item,dict) else str(item))
    if option not in valid: raise RuntimeError(f"Invalid option {option!r}. Valid options: {', '.join(valid)}")
    return meta

def write_owner_response(repo:Path,cfg:dict[str,Any],decision_id:str,option:str,reason:str,source_user:int)->Path:
    directory=rel_or_abs(repo,cfg.get('directionResponseDirectory','09-hermes/direction-responses')); directory.mkdir(parents=True,exist_ok=True)
    dest=directory/f'OWNER_RESPONSE_{decision_id}.md'
    if dest.exists(): raise RuntimeError(f'Response already exists: {dest}')
    text=f'''# Owner Direction Response — {decision_id}\n\n- **Selected option:** {option}\n- **Decision:** Select option {option} from `{decision_id}`.\n- **Reason:** {reason or 'No additional reason supplied.'}\n- **Constraints:** none supplied\n- **Approved scope change:** none unless explicitly stated in the referenced request\n- **Approved by:** Project Owner via Telegram user `{source_user}`\n- **Date:** {datetime.now().date().isoformat()}\n- **Source:** Telegram\n- **Resume instruction:** Record this decision, update the request and affected work item, then continue only approved work.\n'''
    tmp=dest.with_suffix('.md.tmp'); tmp.write_text(text,encoding='utf-8'); os.replace(tmp,dest); return dest

def append_decision_log(repo:Path,cfg:dict[str,Any],decision_id:str,option:str,response_path:Path)->None:
    log=rel_or_abs(repo,cfg.get('decisionLog','09-hermes/DECISION_LOG.md')); log.parent.mkdir(parents=True,exist_ok=True)
    if not log.exists(): log.write_text('# Decision Log\n',encoding='utf-8')
    rel=response_path.relative_to(repo) if response_path.is_relative_to(repo) else response_path
    with log.open('a',encoding='utf-8') as f: f.write(f'\n## {decision_id}\n\n- Date: {datetime.now().date().isoformat()}\n- Source: Telegram\n- Selected option: {option}\n- Response: `{rel}`\n')

def mark_paused(repo:Path,paused:bool)->str:
    p=repo/'09-hermes/EXECUTION_STATE.json'; state=json.loads(p.read_text()) if p.exists() else {}
    state['status']='paused' if paused else state.get('status','idle') if state.get('status')!='paused' else 'idle'; state['operatorPause']=paused; state['lastCheckpointAt']=now_iso(); atomic_write_json(p,state)
    return 'PAUSED' if paused else 'UNPAUSED'

def status_text(repo:Path,project_name:str)->str:
    parts=[f'{project_name} status']
    for rel in ['PROJECT_STATUS.md','09-hermes/EXECUTION_STATE.json','09-hermes/OPERATIONAL_READINESS_REGISTER.md']:
        p=repo/rel
        if p.exists():
            raw=p.read_text(encoding='utf-8',errors='replace').strip(); raw=raw[:1600]+('…' if len(raw)>1600 else ''); parts.append(f'\n{rel}:\n{raw}')
    return '\n'.join(parts)[:3900]

def invoke_hermes(repo:Path,profile:str,prompt:str,timeout:int)->str:
    resumed=['hermes','-p',profile,'chat','--quiet','--continue','-q',prompt]
    base=['hermes','-p',profile,'chat','--quiet','-q',prompt]
    cp=subprocess.run(resumed,cwd=repo,capture_output=True,text=True,timeout=timeout)
    if cp.returncode!=0: cp=subprocess.run(base,cwd=repo,capture_output=True,text=True,timeout=timeout)
    if cp.returncode!=0: raise RuntimeError((cp.stderr or cp.stdout or 'Hermes invocation failed').strip())
    return cp.stdout.strip() or 'Hermes completed the governed request without text output.'

class ProjectWorker:
    def __init__(self,pid:str,cfg:dict[str,Any],repo:Path,token:str,maxsize:int,timeout:int):
        self.pid,self.cfg,self.repo,self.token,self.timeout=pid,cfg,repo,token,timeout
        self.q:queue.Queue[tuple[int,int,str]]=queue.Queue(maxsize=maxsize)
        self.thread=threading.Thread(target=self.run,name=f'vso-worker-{pid}',daemon=True); self.thread.start()
    def submit(self,chat:int,topic:int,prompt:str):
        try:self.q.put_nowait((chat,topic,prompt))
        except queue.Full: send_message(self.token,chat,'[ATTENTION] Project execution queue is full. Nothing was started.',topic)
    def run(self):
        while True:
            chat,topic,prompt=self.q.get()
            try:
                # Respect operator pause.
                sp=self.repo/'09-hermes/EXECUTION_STATE.json'
                if sp.exists() and json.loads(sp.read_text()).get('operatorPause'):
                    send_message(self.token,chat,'Project is paused. Governed Hermes execution was not started.',topic); continue
                out=invoke_hermes(self.repo,self.cfg['hermesProfile'],prompt,self.timeout)
                send_message(self.token,chat,('Hermes completed governed work.\n\n'+out)[:3900],topic)
            except Exception as e: send_message(self.token,chat,f'[ATTENTION] Governed Hermes execution failed: {e}',topic)
            finally:self.q.task_done()

class WorkerManager:
    def __init__(self,reg_path:Path,reg:dict[str,Any],token:str):
        self.workers={}; maxsize=int(reg.get('telegram',{}).get('workerQueueMaxPerProject',25)); timeout=int(reg.get('telegram',{}).get('hermesTimeoutSeconds',1800))
        for pid,cfg in enabled_projects(reg): self.workers[pid]=ProjectWorker(pid,cfg,resolve_repo(reg_path,cfg['repository']),token,maxsize,timeout)
    def submit(self,pid:str,chat:int,topic:int,prompt:str): self.workers[pid].submit(chat,topic,prompt)

def process_message(reg_path:Path,reg:dict[str,Any],token:str,msg:dict[str,Any],workers:WorkerManager|None)->None:
    chat_id=int(msg['chat']['id']); topic_id=int(msg.get('message_thread_id',0) or 0); user_id=int(msg.get('from',{}).get('id',0)); text=(msg.get('text') or '').strip()
    if not text:return
    if not authorized(reg,user_id):
        # Do not reveal project existence to unauthorized users.
        return
    route=route_for_message(reg,chat_id,topic_id)
    if not route: send_message(token,chat_id,'This chat/topic is not registered to a project.',topic_id); return
    pid,cfg=route; repo=resolve_repo(reg_path,cfg['repository'])
    if text in {'/help','help'}:
        send_message(token,chat_id,'Allowed commands:\n/status — read repository status\n/pause — stop new governed execution\n/unpause — allow governed execution\n/resume — queue a governed resume from repository state\n<ID> <OPTION> | <reason> — answer an OPEN direction request\nFree-form Telegram text is intentionally NOT executed by Hermes.',topic_id); return
    if text=='/status': send_message(token,chat_id,status_text(repo,cfg['name']),topic_id); return
    if text=='/pause': send_message(token,chat_id,mark_paused(repo,True),topic_id); return
    if text=='/unpause': send_message(token,chat_id,mark_paused(repo,False),topic_id); return
    if text=='/resume':
        if workers is None: send_message(token,chat_id,'Hermes execution is disabled in this router mode.',topic_id); return
        prompt='Resume from repository state only. Read the reusable prompt and operational readiness register. Validate readiness, queue, stop conditions, checkpoint, Git state, and any open direction requests before changing files. Continue only work already authorized by the active READY phase. Do not broaden scope.'
        workers.submit(pid,chat_id,topic_id,prompt); send_message(token,chat_id,'Governed resume queued for this project.',topic_id); return
    m=DIRECTION_RE.match(text)
    if m:
        decision_id,option,reason=m.group(1),m.group(2),m.group(3) or ''; req=find_direction_request(repo,cfg,decision_id)
        if not req: send_message(token,chat_id,f'No direction request matching {decision_id} was found. Nothing changed.',topic_id); return
        try:
            validate_direction_choice(req,decision_id,option)
            response=write_owner_response(repo,cfg,decision_id,option,reason,user_id); append_decision_log(repo,cfg,decision_id,option,response)
        except Exception as e: send_message(token,chat_id,f'Decision rejected: {e}. Hermes was not resumed.',topic_id); return
        send_message(token,chat_id,f'{decision_id} option {option} was persisted to {response.relative_to(repo)}.',topic_id)
        if workers:
            prompt=f'Read `{response.relative_to(repo)}` and the matching direction request. Validate that the request is OPEN and that the selected option is permitted. Record and apply the decision only within its stated scope, mark the request RESOLVED, update affected queue/state records, then resume approved work under the reusable prompt and operational readiness rules.'
            workers.submit(pid,chat_id,topic_id,prompt)
        return
    send_message(token,chat_id,'Free-form execution is disabled. Use /help. This protects VSO governance from Telegram bypass.',topic_id)

def discover(token:str,seconds:int)->int:
    print('Send a message in each project topic. Discovery prints IDs only; it cannot execute Hermes.')
    offset=None; end=time.time()+seconds if seconds>0 else None; seen=set()
    while end is None or time.time()<end:
        payload={'timeout':'20'}
        if offset is not None:payload['offset']=str(offset)
        result=telegram_api(token,'getUpdates',payload,timeout=25)
        for upd in result.get('result',[]):
            offset=upd['update_id']+1; msg=upd.get('message') or upd.get('edited_message')
            if not msg:continue
            key=(msg['chat']['id'],int(msg.get('message_thread_id',0) or 0),msg.get('from',{}).get('id'))
            if key not in seen: seen.add(key); print(f'chatId={key[0]} topicId={key[1]} userId={key[2]} title={msg["chat"].get("title")!r}')
    return 0

def validate_startup(reg:dict[str,Any])->None:
    allowed=reg.get('telegram',{}).get('allowedUserIds',[])
    if not allowed: raise RuntimeError('Normal router startup is blocked because allowedUserIds is empty. Run --discover first, then configure explicit owner IDs.')

def main()->int:
    ap=argparse.ArgumentParser(description='Fail-closed Telegram control router with isolated per-project Hermes workers.')
    ap.add_argument('--registry',default='09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json'); ap.add_argument('--state',default='runtime/telegram/router_state.json'); ap.add_argument('--discover',action='store_true'); ap.add_argument('--discover-seconds',type=int,default=120); ap.add_argument('--no-hermes',action='store_true')
    a=ap.parse_args(); reg_path=Path(a.registry).resolve(); reg=load_json(reg_path); token=bot_token(reg); telegram_api(token,'getMe',{},timeout=15)
    if a.discover:return discover(token,a.discover_seconds)
    validate_startup(reg)
    state_path=Path(a.state).resolve(); state=load_json(state_path) if state_path.exists() else {'lastUpdateId':None,'cleanShutdown':True}; restored=not bool(state.get('cleanShutdown',True)); state.update({'cleanShutdown':False,'startedAt':now_iso(),'pid':os.getpid()}); atomic_write_json(state_path,state)
    signal.signal(signal.SIGINT,on_signal); signal.signal(signal.SIGTERM,on_signal); workers=None if a.no_hermes else WorkerManager(reg_path,reg,token)
    for pid,cfg in enabled_projects(reg):
        tg=cfg['telegram']; label='CONTROL PLANE RESTORED' if restored else 'CONTROL PLANE ONLINE'
        try:send_message(token,tg['chatId'],f'[{label}] {cfg["name"]}\nProfile: {cfg["hermesProfile"]}\nGoverned routing is active.',int(tg.get('topicId',0) or 0))
        except Exception as e:print(f'Notify startup {pid}: {e}',file=sys.stderr)
    offset=state.get('lastUpdateId'); backoff=1
    while not STOP:
        try:
            payload={'timeout':str(int(reg.get('telegram',{}).get('pollTimeoutSeconds',30)))}
            if offset is not None:payload['offset']=str(int(offset)+1)
            result=telegram_api(token,'getUpdates',payload,timeout=int(payload['timeout'])+10)
            for upd in result.get('result',[]):
                uid=int(upd['update_id']); msg=upd.get('message') or upd.get('edited_message')
                if msg:process_message(reg_path,reg,token,msg,workers)
                offset=uid; state['lastUpdateId']=uid; state['lastHandledAt']=now_iso(); atomic_write_json(state_path,state)
            backoff=1
        except Exception as e:
            state['lastError']=str(e); state['lastErrorAt']=now_iso(); atomic_write_json(state_path,state); print(f'Router error: {e}',file=sys.stderr); time.sleep(backoff); backoff=min(backoff*2,60)
    state['cleanShutdown']=True; state['stoppedAt']=now_iso(); atomic_write_json(state_path,state); return 0
if __name__=='__main__':raise SystemExit(main())
