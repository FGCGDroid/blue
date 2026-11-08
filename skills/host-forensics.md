---
name: host-forensics
description: 【取证】主机取证：Windows/Linux 进程、网络、账号、服务、计划任务、文件时间线
whenToUse: 主机失陷、需要确认攻击者在主机上做了什么、或恢复前保全证据时
role: forensics
category: 取证
tags: [forensics, windows, linux, timeline]
enabled: true
---

# 主机取证

## 只读原则
- 先计算磁盘/镜像哈希，再分析副本；原始介质不写。
- 易失数据优先：内存 → 网络连接 → 进程 → 登录会话 → 磁盘。
- 所有命令输出带时间戳与主机名，保存到证据目录。

## Windows
### 进程与网络
```powershell
Get-CimInstance Win32_Process | Select ProcessId,ParentProcessId,CreationDate,Name,ExecutablePath,CommandLine | Export-Csv proc.csv -NoTypeInformation
Get-NetTCPConnection | Select LocalAddress,LocalPort,RemoteAddress,RemotePort,State,OwningProcess
```
关注：
- `w3wp.exe`/`sqlservr.exe`/`java.exe` 的子进程是 `cmd.exe`/`powershell.exe`。
- 进程路径在 `%TEMP%`、`%APPDATA%`、`C:\ProgramData`。
- 无签名/签名异常、命令行含 `-enc`、`IEX`、`DownloadString`。

### 持久化
```powershell
Get-ScheduledTask | Select TaskName,TaskPath,State,Author
Get-Service | Select Name,DisplayName,PathName,StartType
Get-ItemProperty 'HKLM:\Software\Microsoft\Windows\CurrentVersion\Run'
Get-CimInstance Win32_StartupCommand
```
### 账号
```powershell
Get-LocalUser; Get-LocalGroupMember Administrators
wevtutil qe Security /f:text /q:"*[System[(EventID=4720 or EventID=4732)]]" /c:20
```
### 日志
- Security：4624/4625/4648/4672/4688/4720/4732。
- System：7045 新服务、7036 服务状态。
- PowerShell 4104 脚本块、Sysmon 1/3/11/13。

## Linux
```bash
ps -eo pid,ppid,user,lstart,args --sort=lstart
ss -lntup; ss -ntp
last -a; lastb | head; who
getent passwd; getent group sudo; ls -la /root/.ssh /home/*/.ssh
crontab -l; ls -la /etc/cron.* /etc/systemd/system
find / -xdev -type f -mtime -3 -printf '%TY-%Tm-%Td %TH:%TM %p\n' 2>/dev/null | sort
```
关注：`/tmp`、`/dev/shm`、`/var/tmp` 可执行文件；`authorized_keys` 新 key；`ld.so.preload`；`/etc/ld.so.conf.d`；SUID 异常。

## 文件时间线
- 收集 mtime/ctime/atime，按时间排序，关联登录与 Web 日志。
- 注意时间戳可被篡改：与日志、文件系统 journal、备份交叉验证。
- 输出 CSV：time,host,actor,action,object,source,evidence。

## 产出
- 证据清单（路径 + SHA-256）。
- 时间线（UTC）。
- 结论分级 + 未覆盖项。
用 `blue_artifact_triage` 做文件初筛，`blue_timeline` 记录每一步。
