#!/usr/bin/env bash
set -euo pipefail
SERVICE="$HOME/.config/systemd/user/vso-telegram-router.service"
systemctl --user disable --now vso-telegram-router.service 2>/dev/null || true
rm -f "$SERVICE"
systemctl --user daemon-reload
echo 'VSO Telegram router user service removed.'
