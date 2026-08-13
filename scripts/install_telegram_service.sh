#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PYTHON_BIN="${PYTHON_BIN:-$(command -v python3)}"
if [[ -z "${PYTHON_BIN}" ]]; then echo 'python3 not found' >&2; exit 1; fi
mkdir -p "$HOME/.config/systemd/user"
SERVICE="$HOME/.config/systemd/user/vso-telegram-router.service"
cat > "$SERVICE" <<EOF
[Unit]
Description=VSO Telegram Control Plane
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
WorkingDirectory=$ROOT
EnvironmentFile=-$ROOT/.env.telegram
ExecStart=$PYTHON_BIN $ROOT/scripts/telegram_router.py --registry $ROOT/09-hermes/telegram/PROJECT_COMMUNICATION_REGISTRY.json --state $ROOT/runtime/telegram/router_state.json
Restart=always
RestartSec=5
TimeoutStopSec=20

[Install]
WantedBy=default.target
EOF
systemctl --user daemon-reload
systemctl --user enable --now vso-telegram-router.service
systemctl --user status vso-telegram-router.service --no-pager || true
echo "Installed $SERVICE"
echo "Logs: journalctl --user -u vso-telegram-router.service -f"
