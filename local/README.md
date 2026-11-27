# 单机一键防护

装在一台服务器上，给现有站点加诱饵、假后台、fail2ban、nft 封禁表。不需要中心，不改业务代码。

## 用法

```bash
bash install.sh /etc/nginx/sites-available/你的站点.conf
```

不知道路径：

```bash
nginx -T | grep -B2 server_name
```

## 装了什么

```text
nginx
  /.env、/.git/、*.sql、*.bak、*.zip → 404
  /wp-login.php、/xmlrpc.php → 404
  /adminlog、/adminlog/login → 假登录页
  /adminlog/login 限速 10 次/分钟

fail2ban
  sshd       3 次/小时封 24 小时
  nginx-login 5 次/10 分钟封 1 小时
  scanner-ua  3 次/5 分钟封 24 小时

nft
  表 blue_local，集合 blocked
  入站命中直接 drop
```

## 回滚

```bash
cp /etc/nginx/sites-available/站点.conf.bak.<时间> /etc/nginx/sites-available/站点.conf
systemctl reload nginx
```

## 卸载

```bash
bash uninstall.sh /etc/nginx/sites-available/站点.conf
```

## 注意

```text
会改你的 nginx 站点配置，装之前自动备份
nginx -t 失败会回滚
如果站点本来就有 /adminlog，会被覆盖
fail2ban / nft 没有就跳过对应部分
```
