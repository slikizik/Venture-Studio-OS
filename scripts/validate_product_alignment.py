#!/usr/bin/env python3
from pathlib import Path
import csv, yaml, sys
ROOT=Path(__file__).resolve().parents[1]
errors=[]
required=[
'01-product/VSO_PRODUCT_DOCTRINE.md','01-product/PRODUCT_ALIGNMENT_GATE.md','01-product/SEVL_SCOPE.md','01-product/ARCHITECTURE_FREEZE.md','01-product/BACKLOG.md',
'08-quality/COMMERCIAL_QUALITY_FRAMEWORK.md','08-quality/BENCHMARKING_PROTOCOL.md','08-quality/QUALITY_GATE_MODEL.md','08-quality/EVIDENCE_MODEL.md','08-quality/RELEASE_READINESS_MODEL.md','08-quality/CONTINUOUS_IMPROVEMENT_MODEL.md',
'09-hermes/PRODUCT_INTENT_ALIGNMENT_POLICY.md','docs/OWNER_RUNBOOK.md']
for rel in required:
    if not (ROOT/rel).exists(): errors.append('missing: '+rel)
manifest=yaml.safe_load((ROOT/'BUILD_MANIFEST.yaml').read_text(encoding='utf-8'))
if str(manifest.get('specificationBaseline'))!='1.7.0': errors.append('BUILD_MANIFEST specificationBaseline must be 1.7.0')
required_req={'INT-001','INT-002','DSG-001','DSG-002','QLT-001','QLT-002','QLT-003','QLT-004','LRN-001','LRN-002','AUT-001','AUT-002','AUT-003','AUT-004','SEVL-001'}
func=(ROOT/'02-requirements/FUNCTIONAL_REQUIREMENTS.md').read_text(encoding='utf-8')
missing=[r for r in sorted(required_req) if f'**{r}**' not in func]
if missing: errors.append('functional requirements missing: '+','.join(missing))
with (ROOT/'02-requirements/REQUIREMENTS_TRACEABILITY.csv').open(encoding='utf-8',newline='') as f:
    rows=list(csv.DictReader(f)); ids={r['Requirement ID'] for r in rows}
miss=sorted(required_req-ids)
if miss: errors.append('traceability missing: '+','.join(miss))
for rid in required_req:
    if f'## {rid} ' not in (ROOT/'02-requirements/ACCEPTANCE_CRITERIA.md').read_text(encoding='utf-8'):
        errors.append('acceptance missing: '+rid)
    if f'## TEST-{rid}' not in (ROOT/'08-quality/TEST_CASES.md').read_text(encoding='utf-8'):
        errors.append('test case missing: '+rid)
if errors:
    print('\n'.join('ERROR: '+x for x in errors)); raise SystemExit(1)
print('Product alignment validation passed: doctrine, SEVL, quality framework, owner runbook, and traceability are present.')
