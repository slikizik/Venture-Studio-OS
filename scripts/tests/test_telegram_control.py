import tempfile, unittest, json
from unittest.mock import patch
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from telegram_common import route_for_message
from telegram_router import authorized, find_direction_request, validate_direction_choice, write_owner_response, append_decision_log, validate_startup, WorkerManager, process_message

class TelegramControlTests(unittest.TestCase):
    def test_exact_topic_routing(self):
        reg={'telegram':{},'projects':{'A':{'enabled':True,'telegram':{'chatId':-100,'topicId':10}},'B':{'enabled':True,'telegram':{'chatId':-100,'topicId':11}}}}
        self.assertEqual(route_for_message(reg,-100,10)[0],'A'); self.assertEqual(route_for_message(reg,-100,11)[0],'B'); self.assertIsNone(route_for_message(reg,-100,12))

    def test_authorization_fails_closed(self):
        self.assertFalse(authorized({'telegram':{'allowedUserIds':[]}},123))
        self.assertTrue(authorized({'telegram':{'allowedUserIds':[123]}},123))
        self.assertFalse(authorized({'telegram':{'allowedUserIds':[123]}},999))
        with self.assertRaises(RuntimeError): validate_startup({'telegram':{'allowedUserIds':[]}})

    def _request(self,repo:Path,status='OPEN'):
        d=repo/'09-hermes/direction-requests'; d.mkdir(parents=True)
        p=d/'DIRECTION_REQUIRED_VSO-DR-004.md'
        p.write_text(f'''---\ndecisionId: VSO-DR-004\nstatus: {status}\noptions:\n  - id: A\n    label: Archive only\n  - id: B\n    label: Permanent delete\n---\n# Direction Required\n''',encoding='utf-8')
        return p

    def test_direction_choice_validation_and_persistence(self):
        with tempfile.TemporaryDirectory() as td:
            repo=Path(td); req=self._request(repo); cfg={'directionRequestDirectory':'09-hermes/direction-requests','directionResponseDirectory':'09-hermes/direction-responses','decisionLog':'09-hermes/DECISION_LOG.md'}
            self.assertEqual(validate_direction_choice(req,'VSO-DR-004','A')['status'],'OPEN')
            with self.assertRaises(RuntimeError): validate_direction_choice(req,'VSO-DR-004','BANANA')
            response=write_owner_response(repo,cfg,'VSO-DR-004','A','Preserve history',123); append_decision_log(repo,cfg,'VSO-DR-004','A',response)
            self.assertIn('VSO-DR-004',(repo/'09-hermes/DECISION_LOG.md').read_text())
            with self.assertRaises(RuntimeError): write_owner_response(repo,cfg,'VSO-DR-004','B','Duplicate',123)

    def test_closed_direction_rejected(self):
        with tempfile.TemporaryDirectory() as td:
            req=self._request(Path(td),status='RESOLVED')
            with self.assertRaises(RuntimeError): validate_direction_choice(req,'VSO-DR-004','A')


    def test_free_form_message_does_not_execute_hermes(self):
        class Workers:
            called=False
            def submit(self,*args,**kwargs): self.called=True
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); regpath=root/'09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json'; regpath.parent.mkdir(parents=True)
            (root/'START_HERE.md').write_text('x')
            reg={'telegram':{'allowedUserIds':[123]},'projects':{'VSO':{'enabled':True,'name':'VSO','repository':'.','hermesProfile':'vso','telegram':{'chatId':-100,'topicId':10}}}}
            regpath.write_text(json.dumps(reg)); workers=Workers(); msg={'chat':{'id':-100},'message_thread_id':10,'from':{'id':123},'text':'redesign the database'}
            with patch('telegram_router.send_message') as send:
                process_message(regpath,reg,'token',msg,workers)
            self.assertFalse(workers.called)
            self.assertIn('Free-form execution is disabled',send.call_args.args[2])

    def test_worker_manager_creates_isolated_project_queues(self):
        with tempfile.TemporaryDirectory() as td:
            root=Path(td); (root/'START_HERE.md').write_text('x')
            regpath=root/'09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json'; regpath.parent.mkdir(parents=True)
            reg={'telegram':{'workerQueueMaxPerProject':3,'hermesTimeoutSeconds':10},'projects':{
                'A':{'enabled':True,'repository':'.','hermesProfile':'a','telegram':{'chatId':1,'topicId':1}},
                'B':{'enabled':True,'repository':'.','hermesProfile':'b','telegram':{'chatId':1,'topicId':2}},}}
            regpath.write_text(json.dumps(reg))
            wm=WorkerManager(regpath,reg,'token')
            self.assertIsNot(wm.workers['A'].q,wm.workers['B'].q)
            self.assertNotEqual(wm.workers['A'].thread.name,wm.workers['B'].thread.name)

if __name__=='__main__': unittest.main()
