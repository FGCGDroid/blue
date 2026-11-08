---
name: webshell-hunt
description: 【狩猎】WebShell 排查：PHP/JSP/ASPX 特征、上传目录、内存马、冰蝎/哥斯拉流量与处置
whenToUse: 怀疑站点被上传 WebShell、发现异常文件/连接、或需要主动排查时
role: hunt
category: 狩猎
tags: [webshell, php, jsp, memory-shell]
enabled: true
---

# WebShell 排查

## 1. 先定位入口
- 上传接口、编辑器、文件包含、反序列化、后台弱口令。
- 看 access.log 中 POST 上传路径与随后访问的新文件。
- 对比 Web 根目录文件 mtime：与攻击时间窗重合的新文件优先。

## 2. 文件特征
PHP：
- `eval($_POST[...])`、`assert($_REQUEST[...])`、`system($_GET[...])`
- `base64_decode`、`gzinflate`、`str_rot13`、`preg_replace(.../e)`
- 超短混淆、变量函数 `$a($b)`、`$_POST['x']` 拼接
JSP：
- `Runtime.getRuntime().exec`、`ProcessBuilder`、`defineClass`
- 自定义 ClassLoader、`javax.script`
ASPX：
- `Request.Form[...]`、`Request.QueryString[...]`、`Assembly.Load`
- `eval(Request[...])`

命令：
```bash
find /var/www -type f -mtime -2 -printf '%TY-%Tm-%Td %TH:%TM %s %p\n' | sort
find /var/www -type f \( -name '*.php' -o -name '*.jsp' -o -name '*.aspx' \) -newermt '2026-01-01'
grep -RInE "eval\s*\(\s*\\\$_(POST|GET|REQUEST)|base64_decode|gzinflate|Runtime\.getRuntime\(\)\.exec" /var/www
```

## 3. 图片马 / 双扩展名 / .htaccess
- `image.jpg.php`、`shell.php.jpg`、`.phtml`、`.phar`。
- 检查 `.htaccess`/`web.config` 是否被改（AddType、handler）。
- 文件头是图片但尾部含 PHP 代码：`binwalk`、`foremost`、`tail -c`。

## 4. 内存马
- Java：`/actuator`、`jsp` 已删但 URL 仍可执行；查 `java.lang.instrument`、可疑 Filter/Servlet、`ProcessBuilder` 调用。
- PHP-FPM：查 `php-fpm` 进程加载的可疑扩展、`auto_prepend_file`。
- .NET：查 `HttpModule`、`App_Code`、`bin` 下异常 DLL。
内存马清除通常需要重启进程/中间件，先确认业务窗口。

## 5. 冰蝎/哥斯拉/蚁剑流量
- 冰蝎：固定 AES 密钥协商、`Content-Type: application/x-www-form-urlencoded` 但 body 为密文、UA 异常。
- 哥斯拉：`pass=`、Base64 + 异或、`Accept: text/html` 但响应二进制。
- 蚁剑：`@ini_set("display_errors","0")`、`base64` 参数。
用 pcap/IDS 规则匹配，不要只靠文件。

## 6. 处置
1. 保全：文件、哈希、访问日志、进程内存、网络连接。
2. 临时下线目录执行权限，封攻击源；不要只改文件名。
3. 删除 WebShell 并排查同目录/同时间窗其它文件。
4. 修入口，轮换数据库/API 凭据。
5. 用原请求复测，确认不再落地；补 YARA/日志告警。
