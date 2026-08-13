param(
  [string]$TaskName = "VSO-Telegram-Router",
  [string]$Python = "python"
)
$ErrorActionPreference = "Stop"
$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Script = Join-Path $Root "scripts\telegram_router.py"
$Registry = Join-Path $Root "09-hermes\telegram\PROJECT_COMMUNICATION_REGISTRY.json"
$State = Join-Path $Root "runtime\telegram\router_state.json"
$EnvFile = Join-Path $Root ".env.telegram"
if (!(Test-Path $EnvFile)) { throw "Missing $EnvFile. Copy .env.telegram.example and set TELEGRAM_BOT_TOKEN first." }
$tokenLine = Get-Content $EnvFile | Where-Object { $_ -match '^TELEGRAM_BOT_TOKEN=' } | Select-Object -First 1
if (!$tokenLine) { throw "TELEGRAM_BOT_TOKEN is missing from $EnvFile" }
$token = $tokenLine.Substring('TELEGRAM_BOT_TOKEN='.Length)
$cmd = "`$env:TELEGRAM_BOT_TOKEN='$($token.Replace("'","''"))'; Set-Location '$($Root.Replace("'","''"))'; & '$Python' '$Script' --registry '$Registry' --state '$State'"
$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -Command `"$cmd`""
$trigger = New-ScheduledTaskTrigger -AtLogOn
$settings = New-ScheduledTaskSettingsSet -RestartCount 99 -RestartInterval (New-TimeSpan -Minutes 1) -ExecutionTimeLimit ([TimeSpan]::Zero) -MultipleInstances IgnoreNew
Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Settings $settings -Description "VSO Telegram control plane with restart-on-failure" -Force | Out-Null
Start-ScheduledTask -TaskName $TaskName
Write-Host "Installed and started Task Scheduler task: $TaskName"
