# カゴヤVPS メールサーバー構築ガイド (info@dokujo.com)

## 1. はじめに

このドキュメントは、カゴヤVPS (IP: `133.18.125.19`) 上に、`dokujo.com` ドメインのメールサーバーを構築し、`info@dokujo.com` というメールアドレスで送受信を可能にするための手順書です。

メールサーバーには **Postfix** (MTA: メールの送信・転送)、**Dovecot** (MDA: メールの受信・配送)、そして送信ドメイン認証技術である **SPF**, **DKIM**, **DMARC** を導入し、セキュリティと信頼性の高い環境を目指します。

## 2. お名前ドットコムでのDNS設定

### 2.1. お名前ドットコム Naviにログイン

1. [お名前.com Navi](https://www.onamae.com/navi/login/) にアクセス
2. お名前ID（会員ID）とパスワードでログイン
3. 上部メニューから「ネームサーバーの設定」→「ドメインのDNS設定」を選択
4. `dokujo.com` を選択して「次へ」をクリック

### 2.2. 追加するDNSレコード

「DNSレコード設定を利用する」を選択し、以下のレコードを追加します。

#### Aレコード（メールサーバーのIPアドレス）

| 項目 | 入力値 |
|------|--------|
| **ホスト名** | `mail` |
| **TYPE** | `A` |
| **TTL** | `300` (デフォルトのまま) |
| **VALUE** | `133.18.125.19` |

#### MXレコード（メール配送先）

| 項目 | 入力値 |
|------|--------|
| **ホスト名** | (空欄または`@`) |
| **TYPE** | `MX` |
| **TTL** | `300` (デフォルトのまま) |
| **VALUE** | `10 mail.dokujo.com` |
| **優先度** | `10` |

> **注意**: 
> - MXレコードのVALUEには優先度とホスト名を含めます（例: `10 mail.dokujo.com`）
> - ホスト名の最後にドット（`.`）は不要です（お名前ドットコムが自動で付与）
> - 設定後、「追加」ボタンをクリックして確定してください

> **解説:**
> - **Aレコード**: `mail.dokujo.com` というホスト名（メールサーバー名）が、どのIPアドレスに対応するかを定義します。
> - **MXレコード**: `dokujo.com` 宛のメールを、どのメールサーバー（この場合は `mail.dokujo.com`）に配送するかを指定します。優先度は `10` が一般的です。

### 2.3. DMARCレコードを追加

DMARCレコードは、メール送信ドメイン認証の結果をレポートするために必要です。

#### DMARCレコード（送信ドメイン認証レポート）

| 項目 | 入力値 |
|------|--------|
| **ホスト名** | `_dmarc` |
| **TYPE** | `TXT` |
| **TTL** | `300` (デフォルトのまま) |
| **VALUE** | `v=DMARC1; p=none; rua=mailto:info@dokujo.com` |

> **解説**:
> - `v=DMARC1`: DMARCバージョン1を使用
> - `p=none`: 監視モード（メール配送には影響しない）
> - `rua=mailto:info@dokujo.com`: DMARCレポートを `info@dokujo.com` に送信

### 2.4. DNS設定の確定

すべてのレコードを追加・確認したら、画面下部の「確認画面へ進む」→「設定する」をクリックして設定を確定します。

> **重要**: DNS設定の反映には最大24時間かかる場合がありますが、通常は数分～数時間で反映されます。

### 2.5. DKIMレコード (後で設定)

DKIM（送信ドメイン認証）のためのTXTレコードは、後の手順でサーバー上で公開鍵を生成した後に設定します。現時点では作業は不要です。

### 2.6. 逆引きDNS (PTRレコード) の設定

IPアドレスからホスト名を解決できるようにするため、カゴヤVPSのコントロールパネルで逆引きDNSを設定してください。これにより、送信メールの信頼性が向上します。

- **IPアドレス**: `133.18.125.19`
- **ホスト名**: `mail.dokujo.com`

## 3. サーバー環境の構築

ここからは、VPSにSSHで接続して作業を行います。OSはUbuntuを想定していますが、CentOSなど他のディストリビューションでも適宜コマンドを読み替えることで対応可能です。

### 3.1. 必要なソフトウェアのインストール

以下のコマンドで、Postfix, Dovecot, OpenDKIMをインストールします。

```bash
sudo apt-get update
sudo apt-get install -y postfix dovecot-core dovecot-imapd dovecot-pop3d opendkim opendkim-tools
```

インストール中にPostfixの設定画面が表示された場合は、「インターネットサイト」を選択し、メール名に `dokujo.com` を指定してください。

### 3.2. ファイアウォールの設定

メールの送受信に必要なポートを開放します。`ufw` を使用している場合の例です。

```bash
sudo ufw allow 25/tcp   # SMTP
sudo ufw allow 110/tcp  # POP3
sudo ufw allow 143/tcp  # IMAP
sudo ufw allow 587/tcp  # Submission (SMTP認証)
sudo ufw allow 993/tcp  # IMAPS (IMAP over SSL)
sudo ufw allow 995/tcp  # POP3S (POP3 over SSL)
sudo ufw reload
```

## 4. Postfix (メール送信サーバー) の設定

### 4.1. main.cf の設定

Postfixのメイン設定ファイル `/etc/postfix/main.cf` を編集します。既存の設定を修正または追記してください。

```bash
sudo vi /etc/postfix/main.cf
```

```ini
# ドメインとホスト名の設定
myhostname = mail.dokujo.com
mydomain = dokujo.com
myorigin = $mydomain

# 待ち受けるインターフェース
inet_interfaces = all
inet_protocols = ipv4

# 配送先ドメイン
mydestination = $myhostname, localhost.$mydomain, localhost, $mydomain

# メールボックスの形式
home_mailbox = Maildir/

# SMTP認証 (SASL) の設定
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = $myhostname
smtpd_recipient_restrictions = permit_mynetworks, permit_sasl_authenticated, reject_unauth_destination

# OpenDKIMとの連携
milter_protocol = 2
milter_default_action = accept
smtpd_milters = inet:localhost:8891
non_smtpd_milters = $smtpd_milters
```

### 4.2. master.cf の設定

Submissionポート (587) とSMTPS (465) を有効にします。`/etc/postfix/master.cf` を開き、以下の行のコメントアウトを解除・追記します。

```bash
sudo vi /etc/postfix/master.cf
```

```
# submissionポート (587) の有効化
submission inet n       -       n       -       -       smtpd
  -o syslog_name=postfix/submission
  -o smtpd_tls_security_level=encrypt
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject

# SMTPSポート (465) の有効化
smtps     inet  n       -       n       -       -       smtpd
  -o syslog_name=postfix/smtps
  -o smtpd_tls_wrappermode=yes
  -o smtpd_sasl_auth_enable=yes
  -o smtpd_recipient_restrictions=permit_sasl_authenticated,reject
```

## 5. Dovecot (メール受信サーバー) の設定

### 5.1. 10-mail.conf

メールボックスの場所を指定します。

```bash
sudo vi /etc/dovecot/conf.d/10-mail.conf
```

```ini
mail_location = maildir:~/Maildir
```

### 5.2. 10-auth.conf

認証方式を設定します。

```bash
sudo vi /etc/dovecot/conf.d/10-auth.conf
```

```ini
disable_plaintext_auth = no
auth_mechanisms = plain login
```

### 5.3. 10-master.conf

Postfixとの認証連携を設定します。

```bash
sudo vi /etc/dovecot/conf.d/10-master.conf
```

```ini
service auth {
  # Postfix smtp-auth
  unix_listener /var/spool/postfix/private/auth {
    mode = 0666
    user = postfix
    group = postfix
  }
}
```

### 5.4. 10-ssl.conf

SSL/TLSを有効にします。証明書は後ほどLet's Encryptなどで取得することを強く推奨しますが、まずは自己署名証明書で動作させます。

```bash
sudo vi /etc/dovecot/conf.d/10-ssl.conf
```

```ini
ssl = required
ssl_cert = </etc/ssl/certs/ssl-cert-snakeoil.pem
ssl_key = </etc/ssl/private/ssl-cert-snakeoil.key
```

## 6. OpenDKIM (送信ドメイン認証) の設定

### 6.1. opendkim.conf の設定

`/etc/opendkim.conf` を編集します。

```bash
sudo vi /etc/opendkim.conf
```

```ini
# 基本設定
Syslog                  yes
UMask                   002
Mode                    sv

# 連携設定
Socket                  inet:8891@localhost

# 鍵と署名の設定
KeyTable                /etc/opendkim/KeyTable
SigningTable            refile:/etc/opendkim/SigningTable
ExternalIgnoreList      refile:/etc/opendkim/TrustedHosts
InternalHosts           refile:/etc/opendkim/TrustedHosts

# ドメイン設定
Domain                  dokujo.com
Selector                default
```

### 6.2. 鍵と署名テーブルの設定

```bash
# TrustedHosts
sudo bash -c 'echo "127.0.0.1" > /etc/opendkim/TrustedHosts'
sudo bash -c 'echo "localhost" >> /etc/opendkim/TrustedHosts'
sudo bash -c 'echo "*.dokujo.com" >> /etc/opendkim/TrustedHosts'

# SigningTable
sudo bash -c 'echo "*@dokujo.com default._domainkey.dokujo.com" > /etc/opendkim/SigningTable'

# KeyTable
sudo bash -c 'echo "default._domainkey.dokujo.com dokujo.com:default:/etc/opendkim/keys/dokujo.com/default.private" > /etc/opendkim/KeyTable'
```

### 6.3. DKIM鍵の生成

```bash
sudo mkdir -p /etc/opendkim/keys/dokujo.com
sudo opendkim-genkey -s default -d dokujo.com -D /etc/opendkim/keys/dokujo.com/
sudo chown -R opendkim:opendkim /etc/opendkim/keys/
sudo chmod 640 /etc/opendkim/keys/dokujo.com/default.private
```

### 6.4. 公開鍵の確認とDNSへの登録

以下のコマンドで表示される公開鍵を、DNSにTXTレコードとして登録します。

```bash
sudo cat /etc/opendkim/keys/dokujo.com/default.txt
```

表示例:
`default._domainkey IN TXT ( "v=DKIM1; k=rsa; " "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..." )`

- **タイプ**: `TXT`
- **名称**: `default._domainkey`
- **値**: `v=DKIM1; k=rsa; p=...` (括弧と引用符を除いた部分)

## 7. メールアカウントの作成

`info` という名前のLinuxユーザーを作成し、これをメールアカウントとして使用します。

```bash
sudo useradd -m -s /sbin/nologin info
sudo passwd info  # パスワードを設定
```

## 8. サービスの再起動と確認

すべての設定を反映させるため、各サービスを再起動します。

```bash
sudo systemctl restart postfix
sudo systemctl restart dovecot
sudo systemctl restart opendkim
```

ThunderbirdやOutlookなどのメールクライアントに、以下の情報を設定して送受信テストを行ってください。

- **メールアドレス**: `info@dokujo.com`
- **ユーザー名**: `info`
- **パスワード**: 上記で設定したパスワード
- **受信サーバー (IMAP)**: `mail.dokujo.com`, ポート `993`, SSL/TLS
- **送信サーバー (SMTP)**: `mail.dokujo.com`, ポート `587`, STARTTLS

## 9. Let's Encrypt SSL証明書の設定

自己署名証明書ではなく、Let's Encryptの正式な証明書を使用することを強く推奨します。

### 9.1. Certbotのインストール

```bash
sudo apt-get install -y certbot
```

### 9.2. 証明書の取得

```bash
sudo certbot certonly --standalone -d dokujo.com -d mail.dokujo.com
```

> **注意**: 証明書取得時はポート80が空いている必要があります。Nginxが動作している場合は一時停止してください。

### 9.3. Postfixへの証明書設定

`/etc/postfix/main.cf` に以下を追加：

```ini
# TLS設定
smtpd_tls_cert_file = /etc/letsencrypt/live/dokujo.com/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/dokujo.com/privkey.pem
smtpd_use_tls = yes
smtpd_tls_security_level = may
smtp_tls_security_level = may
```

### 9.4. Dovecotへの証明書設定

`/etc/dovecot/conf.d/10-ssl.conf` を編集：

```ini
ssl = required
ssl_cert = </etc/letsencrypt/live/dokujo.com/fullchain.pem
ssl_key = </etc/letsencrypt/live/dokujo.com/privkey.pem
```

### 9.5. 証明書の自動更新

```bash
sudo crontab -e
```

以下を追加：

```
0 3 * * * certbot renew --quiet && systemctl reload postfix dovecot
```

## 10. Nginxでのアバター配信設定（オプション）

アプリケーションでアバター画像を使用する場合、Nginxで直接配信するよう設定します。

`/etc/nginx/sites-available/your-app` に追加：

```nginx
location /avatars {
    alias /var/www/your-app/public/avatars;
    expires 30d;
    add_header Cache-Control "public, immutable";
    access_log off;
}
```

## 11. アプリケーションのSMTP設定

### 11.1. 管理画面でのSMTP設定

アプリケーションの管理画面で以下のように設定します：

| 項目 | 値 |
|------|-----|
| **SMTPホスト** | `dokujo.com` または `localhost`（同一サーバーの場合） |
| **SMTPポート** | `587`（STARTTLS）または `465`（SSL） |
| **SMTPユーザー名** | `info` |
| **SMTPパスワード** | 設定したパスワード |
| **送信元メールアドレス** | `info@dokujo.com` |
| **送信元名** | 任意（例: ハナシテ運営事務局） |
| **SSL/TLSを使用する** | ポート587: **オフ**、ポート465: **オン** |

> **重要**: ポート587はSTARTTLSを使用するため、SSL/TLSチェックは**オフ**にしてください。オンにするとSSLエラーが発生します。

### 11.2. 環境変数の設定

アプリケーションの `.env.local` または `.env.production` に以下を追加：

```bash
# SMTP設定（コード内で使用する場合）
SMTP_HOST=dokujo.com
SMTP_PORT=587
SMTP_USER=info
SMTP_PASSWORD=設定したパスワード
SMTP_FROM=info@dokujo.com

# 管理者メールアドレス（問い合わせ通知先）
ADMIN_EMAIL=info@dokujo.com
```

### 11.3. VPSへの環境変数追加

```bash
# SSHでVPSに接続して追加
echo "ADMIN_EMAIL=info@dokujo.com" | sudo tee -a /var/www/hanashite/.env.local

# PM2を再起動して反映
pm2 restart hanashite
```

> **重要**: `ADMIN_EMAIL` を設定しないと、問い合わせメールが古いアドレス（デフォルト値）に送信される可能性があります。

## 12. Gmail POP3設定（メール受信用）

Gmailで `info@dokujo.com` のメールを受信できるように設定します。

### 12.1. Gmailでの設定手順

1. Gmailを開く → 設定（歯車アイコン）→ 「すべての設定を表示」
2. 「アカウントとインポート」タブ
3. 「他のアカウントのメールを確認」→「メールアカウントを追加する」

### 12.2. POP3設定値

| 項目 | 値 |
|------|-----|
| **メールアドレス** | `info@dokujo.com` |
| **ユーザー名** | `info` |
| **パスワード** | 設定したパスワード |
| **POPサーバー** | `dokujo.com` |
| **ポート** | `995` |
| **SSL** | ✅ チェック |

### 12.3. SMTP設定値（Gmailから送信する場合）

| 項目 | 値 |
|------|-----|
| **名前** | 任意（例: ハナシテ運営事務局） |
| **SMTPサーバー** | `dokujo.com` |
| **ポート** | `465` |
| **ユーザー名** | `info` |
| **パスワード** | 設定したパスワード |
| **SSL** | ✅ SSLを使用したセキュリティで保護された接続 |

## 13. テストコマンド

### 13.1. コマンドラインからのテストメール送信

```bash
# mailutilsのインストール
sudo apt-get install -y mailutils

# テストメール送信
echo "Test email body" | mail -s "Test Subject" your-email@example.com
```

### 13.2. メールログの確認

```bash
# リアルタイムでログを監視
sudo tail -f /var/log/mail.log

# 最新のログを確認
sudo tail -50 /var/log/mail.log

# エラーのみ抽出
sudo grep -E "(error|reject|failed)" /var/log/mail.log
```

### 13.3. メールキューの確認

```bash
# キューに溜まっているメールを確認
mailq

# キューをフラッシュ（再送信を試行）
sudo postfix flush

# 特定のメールを削除
sudo postsuper -d QUEUE_ID
```

### 13.4. DNS設定の確認

```bash
# MXレコードの確認
dig MX dokujo.com

# SPFレコードの確認
dig TXT dokujo.com

# DKIMレコードの確認
dig TXT default._domainkey.dokujo.com

# DMARCレコードの確認
dig TXT _dmarc.dokujo.com
```

### 13.5. SMTP接続テスト

```bash
# ポート587（STARTTLS）のテスト
openssl s_client -starttls smtp -connect dokujo.com:587

# ポート465（SSL）のテスト
openssl s_client -connect dokujo.com:465

# ポート995（POP3S）のテスト
openssl s_client -connect dokujo.com:995
```

## 14. トラブルシューティング

### 14.1. SSLエラー: wrong version number

**症状**: `ssl3_get_record:wrong version number` エラー

**原因**: ポート587でSSL/TLSオプションをオンにしている

**解決策**: 
- ポート587を使用する場合は、SSL/TLSチェックを**オフ**にする
- または、ポート465に変更してSSL/TLSチェックを**オン**にする

### 14.2. メールが届かない（宛先が古いアドレス）

**症状**: 問い合わせメールが `info@anke.jp` など古いアドレスに送信される

**原因**: `ADMIN_EMAIL` 環境変数が設定されていない

**解決策**:
```bash
echo "ADMIN_EMAIL=info@dokujo.com" | sudo tee -a /var/www/hanashite/.env.local
pm2 restart hanashite
```

### 14.3. SASL認証エラー

**症状**: `SASL LOGIN authentication failed`

**原因**: パスワードが間違っている、またはDovecotの認証設定が不正

**解決策**:
1. パスワードを再設定: `sudo passwd info`
2. Dovecotの設定を確認: `/etc/dovecot/conf.d/10-auth.conf`
3. サービスを再起動: `sudo systemctl restart dovecot postfix`

### 14.4. OpenDKIM鍵ファイルのパーミッションエラー

**症状**: OpenDKIMがエラーで起動しない

**原因**: 鍵ファイルのパーミッションが不正

**解決策**:
```bash
sudo chown -R opendkim:opendkim /etc/opendkim/keys/
sudo chmod 600 /etc/opendkim/keys/dokujo.com/default.private
sudo systemctl restart opendkim
```

### 14.5. メールがGmailに届かない

**症状**: サーバーからは送信成功だが、Gmailで受信できない

**確認事項**:
1. Gmailの迷惑メールフォルダを確認
2. Gmailの「メールを今すぐ確認する」をクリック
3. サーバーのメールボックスを確認:
   ```bash
   sudo ls -la /home/info/Maildir/new/
   ```

### 14.6. 接続拒否エラー

**症状**: `Connection refused`

**原因**: ファイアウォールでポートがブロックされている

**解決策**:
```bash
sudo ufw allow 25/tcp
sudo ufw allow 587/tcp
sudo ufw allow 465/tcp
sudo ufw allow 993/tcp
sudo ufw allow 995/tcp
sudo ufw reload
```

## 15. サービス管理コマンド

```bash
# ステータス確認
sudo systemctl status postfix
sudo systemctl status dovecot
sudo systemctl status opendkim

# 再起動
sudo systemctl restart postfix
sudo systemctl restart dovecot
sudo systemctl restart opendkim

# 設定リロード（再起動なし）
sudo systemctl reload postfix
sudo systemctl reload dovecot

# 自動起動の有効化
sudo systemctl enable postfix
sudo systemctl enable dovecot
sudo systemctl enable opendkim
```

## 16. 設定ファイル一覧

| ファイル | 説明 |
|---------|------|
| `/etc/postfix/main.cf` | Postfixメイン設定 |
| `/etc/postfix/master.cf` | Postfixサービス設定 |
| `/etc/dovecot/conf.d/10-mail.conf` | Dovecotメールボックス設定 |
| `/etc/dovecot/conf.d/10-auth.conf` | Dovecot認証設定 |
| `/etc/dovecot/conf.d/10-master.conf` | Dovecotソケット設定 |
| `/etc/dovecot/conf.d/10-ssl.conf` | Dovecot SSL設定 |
| `/etc/opendkim.conf` | OpenDKIMメイン設定 |
| `/etc/opendkim/KeyTable` | DKIM鍵テーブル |
| `/etc/opendkim/SigningTable` | DKIM署名テーブル |
| `/etc/opendkim/TrustedHosts` | 信頼ホスト一覧 |
| `/etc/opendkim/keys/DOMAIN/default.private` | DKIM秘密鍵 |
| `/etc/letsencrypt/live/DOMAIN/fullchain.pem` | SSL証明書 |
| `/etc/letsencrypt/live/DOMAIN/privkey.pem` | SSL秘密鍵 |

## 17. 参考資料

- [セキュアなメールサーバーを構築して送受信できるようになるまで（前編） - Qiita](https://qiita.com/SI-K_Maeda/items/f814add3208cc5327373)
- [How to Configure DKIM (OpenDKIM) with Postfix - EasyDMARC](https://easydmarc.com/blog/how-to-configure-dkim-opendkim-with-postfix/)
- [VPSで独自ドメインを使用したメールサーバ構築 - webmemo.tokyo](https://webmemo.tokyo/articles/make-mailserver-on-vps/)
