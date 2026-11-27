# 青岚社区同款防护配置（模板）

按顺序套到自己的站点：

## 1. 限速 zone

把 `zones.conf` 放进 `/etc/nginx/conf.d/`：

```bash
cp zones.conf /etc/nginx/conf.d/blue-zones.conf
```

## 2. 诱饵与假后台

`locations.conf` 放到 `/etc/nginx/blue-remote/`，在站点 `server {}` 里加：

```nginx
include /etc/nginx/blue-remote/locations.conf;
```

内容：

```text
/.env                          404
/.git/                         404
*.sql *.bak *.zip *.old *.swp  404
/wp-login.php /xmlrpc.php      404
/adminlog                      假登录页，单独记日志
/adminlog/login                同上，10 次/分钟限速
```

假登录页 `honeypot.html` 用 webdefend.mjs 自动生成，也可以自己改。

## 3. fail2ban

`fail2ban-blue.local` 放 `/etc/fail2ban/jail.d/`：

```ini
[sshd]
maxretry = 3
findtime = 3600
bantime = 86400

[nginx-login]
enabled = true
filter = nginx-login
logpath = /var/log/nginx/access.log
maxretry = 5
findtime = 600
bantime = 3600

[nginx-scanner-ua]
enabled = true
filter = nginx-scanner-ua
logpath = /var/log/nginx/access.log
maxretry = 3
findtime = 300
bantime = 86400
```

filter 文件：

```bash
/etc/fail2ban/filter.d/nginx-login.conf
  failregex = ^<HOST> .* "POST /(login|admin|adminlog/login).*" (401|403) 
/etc/fail2ban/filter.d/nginx-scanner-ua.conf
  failregex = ^<HOST> .* "(sqlmap|nikto|nmap|masscan|dirbuster|gobuster|wfuzz)
```

## 4. nft 封禁表

`nft.conf` 由 `defend.mjs` 自动创建，手工版：

```bash
nft add table inet blue_remote
nft add set inet blue_remote blocked '{ type ipv4_addr; flags timeout; }'
nft add chain inet blue_remote input '{ type filter hook input priority -10; policy accept; }'
nft add rule inet blue_remote input ip saddr @blocked drop
nft add element inet blue_remote blocked { 1.2.3.4 timeout 24h }
```

## 5. 中心接进来

`config.qinglan.example.json` 是青岚这台机器的实际参数，改 IP 和路径即可复用：

```json
{
  "hosts": [{
    "name": "qinglan",
    "host": "59.110.104.110",
    "port": 22,
    "user": "root",
    "siteUrl": "https://59-110-104-110.sslip.io/",
    "hostHeader": "59-110-104-110.sslip.io",
    "nginxConf": "/etc/nginx/sites-available/blue-lab"
  }],
  "defense": { "enabled": true, "autoBan": true, "web": { "enabled": true } }
}
```

## 注意

```text
locations.conf 里的 /adminlog 是静态假页
如果站点本来就有 /adminlog，会覆盖，先确认
nginxConf 路径每台机器不同，填之前先 nginx -T 确认
改完先 nginx -t，失败会回滚
```
