# 桌面安装向导

## 已构建

```text
wizard.exe            双击运行，自动打开安装页
license-public.pem    验签公钥，和 exe 放一起
```

## 客户怎么用

```text
1. 把 wizard.exe 和 license-public.pem 放同一个文件夹
2. 双击 wizard.exe
3. 浏览器打开 127.0.0.1:8123
4. 填：本机公网 IP、卡密、端口、token
5. 点保存，生成 config.json
6. 把 config.json 放到 remote/ 目录，启动 hub.mjs
```

## 重新构建

```powershell
cd desktop
node --experimental-sea-config sea-config.json
Copy-Item "C:\Program Files\nodejs\node.exe" wizard.exe -Force
npx postject wizard.exe NODE_SEA_BLOB sea-prep.blob --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2
```

## 注意

```text
exe 没有签名，Windows 可能提示未知发布者
点「更多信息 → 仍要运行」
只监听 127.0.0.1，不对外
```
