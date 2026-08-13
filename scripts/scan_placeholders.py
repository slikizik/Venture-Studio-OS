#!/usr/bin/env python3
from __future__ import annotations
import argparse, re, sys, yaml
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REG=ROOT/'09-hermes/PLACEHOLDER_REGISTER.yaml'
PROD_SUFFIXES={'.py','.ts','.tsx','.js','.jsx','.sql','.prisma','.sh','.ps1'}
SKIP_PARTS={'.git','node_modules','.next','dist','build','coverage','__pycache__','tests','docs'}
PATTERNS=[
 ('TODO',re.compile(r'\bTODO\b',re.I)),('FIXME',re.compile(r'\bFIXME\b',re.I)),('NOT_IMPLEMENTED',re.compile(r'not\s+implemented',re.I)),('PLACEHOLDER',re.compile(r'\bplaceholder\b',re.I)),('DUMMY',re.compile(r'\bdummy\b',re.I)),('FAKE',re.compile(r'\bfake\b',re.I)),
]

def phase_num(v:str)->int|None:
    m=re.fullmatch(r'PHASE_(\d+)',str(v)); return int(m.group(1)) if m else None

def main()->int:
    ap=argparse.ArgumentParser(); ap.add_argument('--phase',default=None); ap.add_argument('--completion',action='store_true'); a=ap.parse_args()
    data=yaml.safe_load(REG.read_text()) or {}; entries=data.get('placeholders',[]); locations={str(x.get('location')):x for x in entries}
    errors=[]; warnings=[]
    # Registered placeholder file existence/status.
    for e in entries:
        loc=ROOT/str(e.get('location',''))
        if not loc.exists(): errors.append(f"Registered placeholder {e.get('id')} location missing: {e.get('location')}")
        if e.get('status')=='OPEN' and a.phase:
            due=phase_num(e.get('mustBeResolvedBy','')); active=phase_num(a.phase)
            if due is not None and active is not None and due < active: errors.append(f"Overdue placeholder {e.get('id')} due {e.get('mustBeResolvedBy')}: {e.get('description')}")
            elif due is not None and active==due:
                msg=f"Placeholder {e.get('id')} must be resolved during {a.phase}: {e.get('description')}"
                (errors if a.completion else warnings).append(msg)
    # Production stub scan. Docs/tests/examples are not production runtime.
    for p in ROOT.rglob('*'):
        if not p.is_file() or p.suffix.lower() not in PROD_SUFFIXES: continue
        rel=p.relative_to(ROOT)
        if any(part in SKIP_PARTS for part in rel.parts): continue
        text=p.read_text(encoding='utf-8',errors='ignore')
        for name,rx in PATTERNS:
            for m in rx.finditer(text):
                line=text.count('\n',0,m.start())+1
                # Explicit policy/scanner references can contain these words.
                if rel.as_posix() in {'scripts/scan_placeholders.py','scripts/validate_operational_readiness.py','scripts/preflight.py'}: continue
                errors.append(f'Unregistered production placeholder marker {name}: {rel}:{line}')
    print(f'Registered placeholders: {len(entries)}')
    for w in warnings: print('WARNING:',w)
    if errors:
        for e in errors: print('ERROR:',e)
        return 2
    print('PLACEHOLDER CHECK READY')
    return 0
if __name__=='__main__': raise SystemExit(main())
