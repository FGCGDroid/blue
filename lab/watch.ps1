param(
  [int]$IntervalSeconds = 2,
  [switch]$Once
)

$ErrorActionPreference = 'Stop'
$log = Join-Path $PSScriptRoot '.run\soak-24h.log'

if (-not (Test-Path $log)) {
  Write-Host "找不到 $log" -ForegroundColor Red
  Write-Host "先启动 lab\soak-24h.cmd"
  exit 1
}

while ($true) {
  if (-not $Once) { Clear-Host }

  $line = Get-Content $log -Tail 1 -ErrorAction SilentlyContinue
  if ([string]::IsNullOrWhiteSpace($line)) {
    Write-Host "日志还是空的，等 soak 写第一行..."
    Start-Sleep -Seconds $IntervalSeconds
    continue
  }

  try {
    $data = $line | ConvertFrom-Json
  } catch {
    Write-Host "最后一行不是完整 JSON，稍后重试..."
    Start-Sleep -Seconds $IntervalSeconds
    continue
  }

  $last = (Get-Item $log).LastWriteTime
  $age = ((Get-Date) - $last).TotalSeconds

  Write-Host "================================" -ForegroundColor Cyan
  Write-Host " Blue Lab 24h Soak 实时状态" -ForegroundColor Cyan
  Write-Host "================================" -ForegroundColor Cyan

  if ($null -eq $data.elapsed_sec) {
    Write-Host "状态: 已结束 / 最后一行是 summary" -ForegroundColor Yellow
    $data | ConvertTo-Json -Depth 6
    break
  }

  $start = $last.AddSeconds(-[double]$data.elapsed_sec)
  $eta = $start.AddHours(24)
  $elapsed = ((Get-Date) - $start).TotalSeconds
  $remain = ($eta - (Get-Date)).TotalHours
  $total = [double]$data.safe + [double]$data.attack
  $rate = if ($elapsed -gt 0) { $total / $elapsed } else { 0 }

  Write-Host ("已跑:    {0:N1} 分钟" -f ($elapsed / 60))
  Write-Host ("开始:    {0}" -f $start)
  Write-Host ("预计完:  {0}" -f $eta)
  if ($remain -gt 0) {
    Write-Host ("剩余:    {0:N1} 小时" -f $remain) -ForegroundColor Green
  } else {
    Write-Host "剩余:    已到时间，等待最后 summary" -ForegroundColor Yellow
  }
  Write-Host ""
  Write-Host ("safe:    {0}" -f $data.safe)
  Write-Host ("attack:  {0}" -f $data.attack)
  Write-Host ("blocked: {0}" -f $data.blocked)
  Write-Host ("errors:  {0}" -f $data.errors) -ForegroundColor $(if ($data.errors -eq 0) { 'Green' } else { 'Red' })
  Write-Host ("速率:    ~{0:N1} req/s" -f $rate)
  Write-Host ("日志:    {0}" -f $log)
  Write-Host ("更新:    {0:N0} 秒前" -f $age)

  if ($age -gt 30) {
    Write-Host ""
    Write-Host "警告: 日志超过 30 秒没更新，soak 可能已停止。" -ForegroundColor Red
  }

  Write-Host ""
  Write-Host "Ctrl+C 退出观察，不会停止 soak。" -ForegroundColor DarkGray

  if ($Once) { break }
  Start-Sleep -Seconds $IntervalSeconds
}
