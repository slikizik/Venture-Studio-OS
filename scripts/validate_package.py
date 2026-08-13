#!/usr/bin/env python3
from __future__ import annotations
import json, subprocess, sys, yaml, shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
required=[
 'START_HERE.md','BUILD_MANIFEST.yaml','docs/OWNER_BUILD_GUIDE.md','docs/TELEGRAM_CONTROL_GUIDE.md',
 '09-hermes/prompts/BOOTSTRAP_PROMPT.md','09-hermes/prompts/REUSABLE_PHASE_PROMPT.md',
 '09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json','09-hermes/EXECUTION_STATE.json',
 '09-hermes/OPERATIONAL_READINESS_REGISTER.md','09-hermes/PLACEHOLDER_POLICY.md','09-hermes/PLACEHOLDER_REGISTER.yaml',
 '01-product/VSO_PRODUCT_DOCTRINE.md','01-product/PRODUCT_ALIGNMENT_GATE.md','01-product/SEVL_SCOPE.md','01-product/ARCHITECTURE_FREEZE.md',
 '08-quality/COMMERCIAL_QUALITY_FRAMEWORK.md','08-quality/BENCHMARKING_PROTOCOL.md','08-quality/QUALITY_GATE_MODEL.md','08-quality/EVIDENCE_MODEL.md','08-quality/RELEASE_READINESS_MODEL.md',
 '09-hermes/PRODUCT_INTENT_ALIGNMENT_POLICY.md','docs/OWNER_RUNBOOK.md','scripts/validate_product_alignment.py',
 'scripts/telegram_router.py','scripts/telegram_notify.py','scripts/setup_project_profiles.py',
 'scripts/save_execution_checkpoint.py','scripts/verify_project_routing.py','scripts/vso_git_sync.py','scripts/vso_execution_lease.py',
 'scripts/verify_resume_safety.py','scripts/scan_placeholders.py','scripts/validate_operational_readiness.py','scripts/preflight.py',
 'docs/SMART_GIT_SYNC_GUIDE.md','09-hermes/SMART_GIT_SYNC_POLICY.md','.vso-machine.example.json','.gitattributes',
 'docs/architecture-atlas/README.md','docs/architecture-atlas/DIAGRAM_TRACEABILITY.csv','09-hermes/ARCHITECTURE_DIAGRAM_POLICY.md','scripts/validate_architecture_atlas.py'
]
errors=[]
for rel in required:
    if not (ROOT/rel).exists(): errors.append(f'missing: {rel}')
SKIP_DIRS={'node_modules','.next','.git','__pycache__'}
for p in ROOT.rglob('*.json'):
    if '__pycache__' in p.parts or any(s in p.parts for s in SKIP_DIRS): continue
    try: json.loads(p.read_text(encoding='utf-8'))
    except Exception as e: errors.append(f'JSON {p.relative_to(ROOT)}: {e}')
for p in ROOT.rglob('*.yaml'):
    if any(s in p.parts for s in SKIP_DIRS): continue
    try: yaml.safe_load(p.read_text(encoding='utf-8'))
    except Exception as e: errors.append(f'YAML {p.relative_to(ROOT)}: {e}')
py_files=['telegram_common.py','telegram_router.py','telegram_notify.py','setup_project_profiles.py','save_execution_checkpoint.py','verify_project_routing.py','vso_git_sync.py','vso_execution_lease.py','verify_resume_safety.py','scan_placeholders.py','validate_operational_readiness.py','validate_product_alignment.py','preflight.py']
for name in py_files:
    p=ROOT/'scripts'/name
    try: compile(p.read_text(encoding='utf-8'), str(p), 'exec')
    except Exception as e: errors.append(f'Python {p.name}: {e}')

if not errors:
    checks=[
      ([sys.executable,'scripts/validate_architecture_atlas.py'],'Architecture Atlas validation failed'),
      ([sys.executable,'scripts/validate_operational_readiness.py'],'Operational readiness validation failed'),
      ([sys.executable,'scripts/validate_product_alignment.py'],'Product alignment validation failed'),
      ([sys.executable,'-m','unittest','scripts/tests/test_telegram_control.py','-v'],'Telegram unit tests failed'),
      ([sys.executable,'-m','unittest','scripts/tests/test_git_operations.py','-v'],'Git/lease operational tests failed'),
    ]
    for cmd,msg in checks:
        cp=subprocess.run(cmd,cwd=ROOT)
        if cp.returncode: errors.append(msg)
cp=subprocess.run([sys.executable,'scripts/verify_project_routing.py'],cwd=ROOT,capture_output=True,text=True)
if cp.returncode: errors.append((cp.stdout+cp.stderr).strip())

# Unit tests may create caches locally; remove them before release-hygiene inspection.
for d in ROOT.rglob('__pycache__'):
    if d.is_dir(): shutil.rmtree(d, ignore_errors=True)
for f in ROOT.rglob('*.pyc'):
    try: f.unlink()
    except OSError: pass

# Packaging hygiene: no generated Python caches should ship.
for p in ROOT.rglob('*'):
    if p.name=='__pycache__' or p.suffix=='.pyc': errors.append(f'generated Python cache present: {p.relative_to(ROOT)}')

if errors:
    print('\n'.join('ERROR: '+e for e in errors)); raise SystemExit(1)
print('Package validation passed.')
