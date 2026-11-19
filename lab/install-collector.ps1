# 在 Windows 服务器上安装蓝队日志采集器为开机任务。
# 用法（管理员 PowerShell）：
#   .\install-collector.ps1 -Url http://DSH:端口 -Token <token> -Engagement ENG-xxx -Log C:\logs\access.log
param(
  [Parameter(Mandatory = $true)][string]$Url,
  [Parameter(Mandatory = $true)][string]$Token,
  [Parameter(Mandatory = $true)][string]$Engagement,
  [string]$Log = "C:\logs\access.log"
)
$ErrorActionPreference = "Stop"
$dir = Join-Path $env:ProgramData "blue-collector"
New-Item -ItemType Directory -Force -Path $dir | Out-Null
Invoke-WebRequest -Uri "$Url/blue/collector.mjs" -OutFile (Join-Path $dir "blue-collector.mjs") -UseBasicParsing
$envFile = Join-Path $dir "collector.env"
@"
BLUE_COLLECTOR_TOKEN=$Token
BLUE_COLLECTOR_URL=$Url
BLUE_COLLECTOR_ENGAGEMENT=$Engagement
BLUE_COLLECTOR_LOG=$Log
"@ | Set-Content -Encoding utf8 $envFile
$runner = Join-Path $dir "run-collector.cmd"
@"
@echo off
set BLUE_COLLECTOR_TOKEN=$Token
node "$dir\blue-collector.mjs" --url "$Url" --engagement "$Engagement" --log "$Log"
"@ | Set-Content -Encoding ascii $runner
$action = New-ScheduledTaskAction -Execute "cmd.exe" -Argument "/c `"$runner`""
$trigger = New-ScheduledTaskTrigger -AtStartup
Register-ScheduledTask -TaskName "BlueCollector" -Action $action -Trigger $trigger -RunLevel Highest -Force | Out-Null
Start-ScheduledTask -TaskName "BlueCollector"
Write-Host "已安装计划任务 BlueCollector；token 存在 $envFile"
