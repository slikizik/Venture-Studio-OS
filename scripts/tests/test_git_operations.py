import json, os, shutil, subprocess, tempfile, unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
GIT=shutil.which('git')

def run(cwd,*args,check=True):
    p=subprocess.run(list(args),cwd=cwd,text=True,capture_output=True)
    if check and p.returncode:
        raise AssertionError((p.stderr or p.stdout).strip())
    return p

@unittest.skipUnless(GIT,'git required')
class GitOperationsTests(unittest.TestCase):
    def test_handoff_resume_and_remote_lease(self):
        with tempfile.TemporaryDirectory() as td:
            td=Path(td); a=td/'a'; remote=td/'remote.git'
            shutil.copytree(ROOT,a,ignore=shutil.ignore_patterns('.git','__pycache__','*.pyc'))
            run(a,'git','init','-q'); run(a,'git','config','user.email','test@example.local'); run(a,'git','config','user.name','Test');
            (a/'.vso-machine.local.json').write_text(json.dumps({'machineId':'pc-a'}))
            run(a,'git','add','.'); run(a,'git','commit','-qm','baseline'); run(a,'git','branch','-M','develop')
            run(td,'git','init','-q','--bare',str(remote)); run(a,'git','remote','add','origin',str(remote)); run(a,'git','push','-qu','origin','develop')
            b=td/'b'; run(td,'git','clone','-q','-b','develop',str(remote),str(b)); run(b,'git','config','user.email','test@example.local'); run(b,'git','config','user.name','Test'); (b/'.vso-machine.local.json').write_text(json.dumps({'machineId':'pc-b'}))
            # A publishes a change.
            (a/'PROJECT_STATUS.md').write_text((a/'PROJECT_STATUS.md').read_text()+'\nA handoff test\n')
            p=run(a,os.sys.executable,'scripts/vso_git_sync.py','handoff','--skip-validation'); self.assertIn('HANDOFF READY',p.stdout)
            # B resumes and acquires lease.
            p=run(b,os.sys.executable,'scripts/vso_git_sync.py','resume','--skip-validation'); self.assertIn('RESUME READY',p.stdout); self.assertIn('A handoff test',(b/'PROJECT_STATUS.md').read_text())
            # A cannot acquire while B lease is active.
            p=run(a,os.sys.executable,'scripts/vso_execution_lease.py','acquire','--project','VSO','--ttl','60',check=False); self.assertEqual(p.returncode,2); self.assertIn('pc-b',p.stdout)
            # B releases through handoff; A can then resume/acquire.
            p=run(b,os.sys.executable,'scripts/vso_git_sync.py','handoff','--skip-validation'); self.assertIn('HANDOFF READY',p.stdout)
            p=run(a,os.sys.executable,'scripts/vso_git_sync.py','resume','--skip-validation'); self.assertIn('RESUME READY',p.stdout)

if __name__=='__main__': unittest.main()
