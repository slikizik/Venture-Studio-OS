#!/usr/bin/env python3
from pathlib import Path
import csv, re, sys
ROOT=Path(__file__).resolve().parents[1]
ATLAS=ROOT/'docs/architecture-atlas'
MER=ROOT/'docs/diagrams/mermaid'
PUM=ROOT/'docs/diagrams/plantuml'
errors=[]
required=['README.md','DIAGRAM_TRACEABILITY.csv']+[f'{i:02d}-'+n for i,n in enumerate([
'system-overview.md','major-components.md','system-architecture.md','project-lifecycle.md','human-ai-collaboration.md','work-packet-execution.md','direction-workflow.md','autonomous-hermes.md','telegram-control.md','gateway-recovery.md','smart-git-sync.md','multi-project-routing.md','c4-system-context.md','c4-containers.md','application-components.md','core-data-model.md','work-packet-state-machine.md','review-approval-state-machine.md','deployment-security.md'])]
for rel in required:
    if not (ATLAS/rel).exists(): errors.append('missing atlas file: '+rel)
for p in sorted(ATLAS.glob('[0-9][0-9]-*.md')):
    txt=p.read_text(encoding='utf-8')
    if '```mermaid' not in txt: errors.append(f'no Mermaid fence: {p.relative_to(ROOT)}')
    mmd=MER/(p.stem+'.mmd')
    if not mmd.exists(): errors.append(f'missing Mermaid source: {mmd.relative_to(ROOT)}')
    for src in re.findall(r'`([^`]+)`', re.search(r'> \*\*Source of truth:\*\* (.+)',txt).group(1) if re.search(r'> \*\*Source of truth:\*\* (.+)',txt) else ''):
        if '*' not in src and not (ROOT/src).exists(): errors.append(f'missing referenced source {src} in {p.name}')

technical_stems={f'{i:02d}-'+n[:-3] for i,n in enumerate([
'system-overview.md','major-components.md','system-architecture.md','project-lifecycle.md','human-ai-collaboration.md','work-packet-execution.md','direction-workflow.md','autonomous-hermes.md','telegram-control.md','gateway-recovery.md','smart-git-sync.md','multi-project-routing.md','c4-system-context.md','c4-containers.md','application-components.md','core-data-model.md','work-packet-state-machine.md','review-approval-state-machine.md','deployment-security.md']) if i>=12}
for stem in sorted(technical_stems):
    md=ATLAS/(stem+'.md')
    txt=md.read_text(encoding='utf-8') if md.exists() else ''
    if '```plantuml' not in txt: errors.append(f'no PlantUML fence: {md.relative_to(ROOT)}')
    puml=PUM/(stem+'.puml')
    if not puml.exists(): errors.append(f'missing PlantUML source: {puml.relative_to(ROOT)}')

for p in PUM.glob('*.puml'):
    t=p.read_text(encoding='utf-8')
    if '@startuml' not in t or '@enduml' not in t: errors.append(f'invalid PlantUML wrapper: {p.relative_to(ROOT)}')
trace=ATLAS/'DIAGRAM_TRACEABILITY.csv'
if trace.exists():
    with trace.open(encoding='utf-8',newline='') as f:
        rows=list(csv.DictReader(f))
    traced={Path(r['atlas_file']).name for r in rows}
    actual={p.name for p in ATLAS.glob('[0-9][0-9]-*.md')}
    if traced != actual: errors.append(f'traceability mismatch: missing={sorted(actual-traced)} extra={sorted(traced-actual)}')
if errors:
    print('\n'.join('ERROR: '+e for e in errors)); raise SystemExit(1)
print(f'Architecture Atlas validation passed: {len(list(ATLAS.glob("[0-9][0-9]-*.md")))} layered views.')
