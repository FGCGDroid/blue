# 宝塔面板 Linux

## 能不能用

可以，但不需要把 DSH 装在宝塔面板里。

推荐结构：

```text
宝塔服务器（被防守）
  -> blue-collector 只读 tail /www/wwwlogs/*.log
  -> POST 到 DSH /blue/collect

DSH（你的电脑或另一台机器）
  -> 后台采集器
  -> 告警 / 证据
```

## 宝塔上的日志

常见位置：

```text
/www/wwwlogs/你的站点.log
/www/wwwlogs/access.log
```

在宝塔「网站 -> 设置 -> 日志」可以看到实际文件名。

## 安装 Node

宝塔软件商店安装 Node.js，或设置：

```bash
NODE_BIN=/www/server/nodejs/vXX/bin/node
```

安装脚本会自动尝试：

```text
command -v node
/www/server/nodejs/*/bin/node
```

## 安装采集器

```bash
sudo bash install-collector.sh \
  http://<DSH-IP>:<端口> \
  <token> \
  ENG-... \
  /www/wwwlogs/你的站点.log
```

检查：

```bash
systemctl status blue-collector
tail -f /opt/blue-collector/collector.log
```

## 防火墙

宝塔「安全」里只需要：

```text
服务器 -> DSH 的出站访问
SSH 22（你部署用）
```

不要把 DSH 端口裸奔公网；用反代/隧道。

## 不能做的事

```text
不要在宝塔面板里直接改 Nginx 配置来接入 DSH
不要把 DSH 的 token 写进公开的前端
不要用 1.2.3.4 这种 UI 里看不到日志的地址假装已接入
```

## 已验证范围

```text
Nginx/Apache combined 日志格式
日志轮转
--from-start
```

未在真实宝塔环境验收；需要一台宝塔测试机做最终确认。
