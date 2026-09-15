# 公開手順

このサーバー（グローバルIP あり・Google Chrome 導入済み）で本番稼働させる手順です。

## なぜこのサーバーで動かすのか

Vercel などのサーバーレスではなく、通常のサーバーで動かすことを勧めます。
このアプリには、サーバーレスでは動かない処理があるためです。

| 機能 | 必要なもの | サーバーレスでの状況 |
| --- | --- | --- |
| PDF 台帳の出力 | Chromium の実行 | 追加の専用パッケージが必要。関数サイズの上限に当たりやすい |
| 手書き看板の読み取り | 16MB の言語データ + WASM | 起動のたびに読み込みが必要で、実行時間の上限に当たりやすい |
| 写真の保存 | 消えないディスク | 保存できないため S3 等が必須 |

このサーバーには Chrome が入っており、ディスクもあるので、
そのまま動かすのが一番手数が少なく済みます。

---

## 1. PostgreSQL を入れる（要 sudo）

開発用の PGlite は同時接続が1本までのため、本番では使えません。

```bash
sudo apt update
sudo apt install -y postgresql
sudo -u postgres psql -c "CREATE USER rakuraku WITH PASSWORD 'ここに強いパスワード';"
sudo -u postgres psql -c "CREATE DATABASE rakuraku OWNER rakuraku;"
```

> **ポート番号を確認してください。**
> 導入時に 5432 番が開発用の PGlite に使われていると、PostgreSQL は
> 自動的に 5433 番に割り当てられます。確認方法:
>
> ```bash
> grep "^port" /etc/postgresql/*/main/postgresql.conf
> ```
>
> このサーバーでは **5433 番**になっています。`DATABASE_URL` のポートを
> 合わせてください。

## 2. 環境変数を用意する

```bash
cd /home/admin/Documents/Project/Wordpress-app
cp .env.production.example .env.production
openssl rand -base64 32        # AUTH_SECRET に使う値
nano .env.production           # DATABASE_URL / AUTH_SECRET / AUTH_URL を埋める
```

写真の保存先を作ります。

```bash
mkdir -p /home/admin/rakuraku-storage
```

> **`AUTH_URL` は利用者が実際に開くURLと必ず一致させてください。**
> ログインのCookieはホスト名に紐づきます。`AUTH_URL` が
> `http://5.9.67.157:3000` なのに `http://localhost:3000` で開くと、
> ログインは通るのにCookieが渡らず、ログイン画面に戻され続けます。

## 3. 起動する

```bash
export PATH="$HOME/.local/node/bin:$PATH"
npm ci
npm run setup:ocr                    # 看板の読み取りを使う場合のみ（16MB）
set -a && . ./.env.production && set +a
npm run db:migrate
npm run db:seed                      # 初回のみ。管理者アカウントが作られます
npm run build
```

常駐させます。

```bash
sudo cp deploy/rakuraku.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now rakuraku
sudo systemctl status rakuraku
```

## 4. 外から見えるようにする

### 手早く確認したいだけの場合

3000番を開けます。

```bash
sudo ufw allow 3000/tcp    # ufw を使っている場合
```

クラウド側にもファイアウォールがあることが多いので、
管理画面（Hetzner Cloud Firewall など）でも 3000番を開けてください。

これで `http://5.9.67.157:3000` で見られます。

> **この形は確認用に留めてください。**
> HTTPS ではないため、ログイン時のパスワードがそのまま流れます。
> 実際に使う場合は次の手順で TLS を付けてください。

### きちんと公開する場合（独自ドメイン + HTTPS）

ドメインの A レコードを `5.9.67.157` に向けてから、

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
```

`/etc/nginx/sites-available/rakuraku` を作成します。

```nginx
server {
    listen 80;
    server_name example.com;

    # 写真のアップロードで既定の1MBに当たるため広げる
    client_max_body_size 32M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        # PDF と電子納品の出力は時間がかかる
        proxy_read_timeout 300s;
    }
}
```

有効にして証明書を取ります。

```bash
sudo ln -s /etc/nginx/sites-available/rakuraku /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d example.com
```

`.env.production` の `AUTH_URL` を `https://example.com` に直し、再起動します。

```bash
sudo systemctl restart rakuraku
```

3000番は直接開けず、nginx 経由だけにしてください。

---

## 自動の探索について

インターネットに開いたポートには、公開から数時間で自動の探索が来ます。
このサーバーにも実際に来ており、アクセスログで確認できます。

| 名乗り | 正体 |
| --- | --- |
| `internet-measurement.com` | 調査ボット |
| `Palo Alto Networks Cortex Xpanse` | 攻撃面の調査 |
| `infrawat.ch` | 調査ボット |
| Chrome を名乗るが送信元が VPS | 素性を隠した探索 |

トップページを1〜2回見るだけのものがほとんどで、**見つかったという以上の
意味はありません**。ただし、放置してよいということではありません。

対策として次を入れてあります。

- **ログイン試行の回数制限**（10分で8回を超えると15分待たせる）。
  メールアドレスと接続元の両方で数えます。
- **安全側のヘッダー**（他サイトへの埋め込み禁止、形式の推測禁止など）
- **robots.txt**（検索結果に出さない。行儀の良いクローラーにのみ有効）

**これらは通信の暗号化の代わりにはなりません。** HTTP のままでは
ログイン時のパスワードが経路上で読めます。次の「公開前に必ず行うこと」を
必ず済ませてください。

## 公開前に必ず行うこと

- [ ] **運営管理者のパスワードを変更する**
      （初期値 `admin@rakuraku-daicho.jp` / `admin1234` のままにしない）
- [ ] **シードの利用者アカウントを削除する**
      （`taro.yamada@example.com` など。運営管理のユーザー画面から停止できます）
- [ ] `AUTH_SECRET` を生成した値にする（使い回さない）
- [ ] HTTPS にする（パスワードが平文で流れるため）
- [ ] データベースのバックアップを設定する（`pg_dump` を cron 等で）
- [ ] `/home/admin/rakuraku-storage` もバックアップ対象に含める（写真の実体）

---

## 更新のしかた

```bash
cd /home/admin/Documents/Project/Wordpress-app
git pull
export PATH="$HOME/.local/node/bin:$PATH"
npm ci
set -a && . ./.env.production && set +a
npm run db:migrate
npm run build
sudo systemctl restart rakuraku
```

> **ビルドしたら必ず再起動してください。**
> 稼働中のまま `npm run build` すると、実行中のプロセスが持っている
> チャンクの一覧と `.next` の中身がずれ、画面が
> `HTTP 500 /_next/static/chunks/...` で壊れます。
> 再起動するまで直りません。

## 困ったとき

```bash
sudo journalctl -u rakuraku -f      # アプリのログ
sudo systemctl status rakuraku      # 起動しているか
```

| 症状 | 原因として多いもの |
| --- | --- |
| ログイン後に元の画面へ戻らない | `AUTH_URL` が実際のURLと違う |
| 写真のアップロードが 413 で失敗 | nginx の `client_max_body_size` |
| PDF 出力が失敗する | `CHROME_PATH` が違う、または Chrome 未導入 |
| 看板の読み取りで項目が空になる | `npm run setup:ocr` を実行していない |
| 起動直後に落ちる | `DATABASE_URL` が PGlite のままになっている |
| `/_next/static/chunks/...` が 500 になる | ビルド後に再起動していない |
