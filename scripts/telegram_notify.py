#!/usr/bin/env python3
from __future__ import annotations
import argparse
from pathlib import Path
from telegram_common import load_json, bot_token, send_message, resolve_repo


def main() -> int:
    ap = argparse.ArgumentParser(description='Send a VSO project notification to its registered Telegram topic.')
    ap.add_argument('--registry', default='09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json')
    ap.add_argument('--project', required=True)
    ap.add_argument('--level', choices=['INFO','ATTENTION','DIRECTION_REQUIRED','CRITICAL'], default='INFO')
    ap.add_argument('--message', required=True)
    args = ap.parse_args()

    path = Path(args.registry)
    reg = load_json(path)
    project = reg.get('projects', {}).get(args.project)
    if not project or not project.get('enabled'):
        raise SystemExit(f'Project {args.project!r} is missing or disabled in {path}')
    levels = set(reg.get('telegram', {}).get('defaultNotificationLevels', []))
    if args.level not in levels and args.level != 'DIRECTION_REQUIRED':
        print(f'Notification level {args.level} is disabled; no message sent.')
        return 0
    token = bot_token(reg)
    tg = project['telegram']
    text = f'[{args.level}] {project["name"]}\n\n{args.message}'
    send_message(token, tg['chatId'], text, int(tg.get('topicId', 0) or 0))
    print('sent')
    return 0

if __name__ == '__main__':
    raise SystemExit(main())
