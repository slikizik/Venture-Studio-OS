#!/usr/bin/env python3
from __future__ import annotations
import json, os, tempfile, urllib.parse, urllib.request, urllib.error
from pathlib import Path
from typing import Any


def load_json(path: Path) -> dict[str, Any]:
    with path.open('r', encoding='utf-8') as f:
        return json.load(f)


def atomic_write_json(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(prefix=path.name + '.', dir=str(path.parent))
    try:
        with os.fdopen(fd, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
            f.write('\n')
        os.replace(tmp, path)
    except Exception:
        try:
            os.unlink(tmp)
        except OSError:
            pass
        raise


def bot_token(registry: dict[str, Any]) -> str:
    env_name = registry['telegram'].get('botTokenEnv', 'TELEGRAM_BOT_TOKEN')
    token = os.environ.get(env_name, '').strip()
    if not token:
        raise RuntimeError(f'Missing Telegram bot token environment variable: {env_name}')
    return token


def telegram_api(token: str, method: str, payload: dict[str, Any] | None = None, timeout: int = 45) -> dict[str, Any]:
    url = f'https://api.telegram.org/bot{token}/{method}'
    data = urllib.parse.urlencode(payload or {}).encode('utf-8')
    request = urllib.request.Request(url, data=data, method='POST')
    try:
        with urllib.request.urlopen(request, timeout=timeout) as response:
            body = response.read().decode('utf-8')
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', errors='replace')
        raise RuntimeError(f'Telegram HTTP {e.code}: {detail}') from e
    except urllib.error.URLError as e:
        raise RuntimeError(f'Telegram network error: {e.reason}') from e
    result = json.loads(body)
    if not result.get('ok'):
        raise RuntimeError(f"Telegram API {method} failed: {result}")
    return result


def send_message(token: str, chat_id: int | str, text: str, topic_id: int | None = None) -> dict[str, Any]:
    payload: dict[str, Any] = {'chat_id': str(chat_id), 'text': text}
    if topic_id:
        payload['message_thread_id'] = str(topic_id)
    return telegram_api(token, 'sendMessage', payload)


def enabled_projects(registry: dict[str, Any]) -> list[tuple[str, dict[str, Any]]]:
    return [(pid, cfg) for pid, cfg in registry.get('projects', {}).items() if cfg.get('enabled')]


def resolve_repo(registry_path: Path, configured: str) -> Path:
    p = Path(configured).expanduser()
    if p.is_absolute():
        return p.resolve()
    # Registry is under <repo>/09-hermes/telegram by contract.
    repo_root = registry_path.resolve().parents[2]
    return (repo_root / p).resolve()


def route_for_message(registry: dict[str, Any], chat_id: int, topic_id: int) -> tuple[str, dict[str, Any]] | None:
    for pid, cfg in enabled_projects(registry):
        tg = cfg.get('telegram', {})
        if int(tg.get('chatId', 0)) == int(chat_id) and int(tg.get('topicId', 0) or 0) == int(topic_id or 0):
            return pid, cfg
    return None
