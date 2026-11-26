@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
title Blue Lab - Soak Status

if not exist ".run\soak-24h.log" (
  echo [ERROR] 没找到 .run\soak-24h.log
  echo 先确认 24h soak 已经启动。
  pause
  exit /b 1
)

powershell -NoProfile -Command "$l=Get-Content '.run\soak-24h.log' -Tail 1 | ConvertFrom-Json; if ($null -eq $l.elapsed_sec) { Write-Host 'soak 已结束或最后一行不是进度行。'; exit 0 }; $last=(Get-Item '.run\soak-24h.log').LastWriteTime; $start=$last.AddSeconds(-[double]$l.elapsed_sec); $eta=$start.AddHours(24); $remain=($eta-(Get-Date)).TotalHours; Write-Host ('已跑:   ' + [math]::Round([double]$l.elapsed_sec/60,1) + ' 分钟'); Write-Host ('开始:   ' + $start); Write-Host ('预计完: ' + $eta); if ($remain -gt 0) { Write-Host ('剩余:   ' + [math]::Round($remain,1) + ' 小时') } else { Write-Host '剩余:   已完成或已超时' }; Write-Host ('计数:   safe=' + $l.safe + ' attack=' + $l.attack + ' blocked=' + $l.blocked + ' errors=' + $l.errors)"

echo.
pause
