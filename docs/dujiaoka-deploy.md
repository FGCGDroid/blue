# 用独角数卡卖卡密

自研后台已删，改用 [独角数卡](https://github.com/assimon/dujiaoka)。

## 1. 发卡系统

服务器要求：

```text
PHP 8.1 / 8.2
MySQL 5.7+ 或 8.0
nginx
composer
```

部署：

```bash
apt install -y nginx mysql-server php8.2-fpm php8.2-cli php8.2-mysql php8.2-mbstring php8.2-xml php8.2-curl php8.2-zip unzip composer
cd /var/www
git clone https://github.com/assimon/dujiaoka.git
cd dujiaoka
cp .env.example .env
composer install --no-dev
```

数据库：

```bash
mysql -uroot -p -e "CREATE DATABASE dujiaoka DEFAULT CHARSET utf8mb4;"
```

`.env` 改：

```text
APP_URL=https://你的域名
DB_HOST=127.0.0.1
DB_DATABASE=dujiaoka
DB_USERNAME=dujiaoka
DB_PASSWORD=你的密码
```

初始化：

```bash
php artisan key:generate
php artisan migrate
php artisan admin:create
```

nginx 反代到 php-fpm，域名走 HTTPS。

## 2. 生成卡密

```bash
cd remote
node license-issue.mjs issue-batch 100 365 cards.txt
```

得到 `cards.txt`，一行一张。

## 3. 导入独角数卡

```text
后台 → 商品管理 → 新增商品
  类型：卡密
  单价：你的售价
  库存：导入 cards.txt
  发货内容：直接发送卡密
```

```text
支付：支付宝当面付 / 易支付 / 微信
下单支付成功 → 自动发卡
```

## 4. 后台能看到

```text
剩余卡密数量
已售数量
交易额
订单记录
```

## 5. 客户端

```text
客户拿到卡密后，安装客户端
客户端向导输入卡密 + 服务器 IP
验签通过即可使用
```

客户端安装包用 Inno Setup 打，不再用自研的 IExpress。

## 6. 注意

```text
license-private.pem 只放在你生成卡密的机器上
卡密绑定被控服务器 IP，换 IP 用白名单
独角数卡只负责卖，不接触客户数据
```
