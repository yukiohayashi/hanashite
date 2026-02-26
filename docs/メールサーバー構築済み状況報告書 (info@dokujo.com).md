# メールサーバー構築済み状況報告書 (info@dokujo.com)

**作成日:** 2026年2月26日  
**対象サーバー:** 133.18.125.19 (mail.dokujo.com)  
**対象メールアドレス:** info@dokujo.com

---

## 1. サーバー基本情報

### サーバー環境
- **ホスト名:** v133-18-125-19-vir
- **OS:** Ubuntu 24.04 LTS (Linux 6.8.0-101-generic)
- **IPアドレス:** 133.18.125.19
- **ホスティング:** カゴヤVPS

### 稼働中のメールサービス
| サービス | 状態 | 役割 |
|---------|------|------|
| Postfix | Active (running) | MTA (メール転送エージェント) |
| Dovecot | Active (running) | MDA (メール配送エージェント) - IMAP/POP3 |
| OpenDKIM | Active (running) | DKIM署名 |

---

## 2. Postfix (SMTP) 設定状況

### 主要設定
```ini
myhostname = mail.dokujo.com
mydomain = dokujo.com
myorigin = $mydomain
inet_interfaces = all
mydestination = $myhostname, localhost.$mydomain, localhost, dokujo.com

# SASL認証 (Dovecot連携)
smtpd_sasl_type = dovecot
smtpd_sasl_path = private/auth
smtpd_sasl_auth_enable = yes
smtpd_sasl_security_options = noanonymous
smtpd_sasl_local_domain = $myhostname

# TLS/SSL設定
smtpd_tls_security_level = may
smtpd_tls_cert_file = /etc/letsencrypt/live/dokujo.com-0001/fullchain.pem
smtpd_tls_key_file = /etc/letsencrypt/live/dokujo.com-0001/privkey.pem

# DKIM連携
smtpd_milters = inet:localhost:8891
non_smtpd_milters = $smtpd_milters
milter_default_action = accept
```

### 待ち受けポート
| ポート | プロトコル | 用途 |
|--------|-----------|------|
| 25 | SMTP | メール受信 (非暗号化) |
| 587 | SMTP (STARTTLS) | メール送信 (暗号化推奨) |
| 465 | SMTPS | メール送信 (SSL/TLS) |

---

## 3. Dovecot (IMAP/POP3) 設定状況

### 主要設定
```ini
# メールボックス形式
mail_location = maildir:~/Maildir
mail_privileged_group = mail

# プロトコル
protocols = imap pop3

# 認証
auth_mechanisms = plain login
disable_plaintext_auth = no

# SSL/TLS証明書
ssl_cert = </etc/letsencrypt/live/dokujo.com-0001/fullchain.pem
ssl_key = </etc/letsencrypt/live/dokujo.com-0001/privkey.pem

# Postfix SASL認証連携
service auth {
  unix_listener /var/spool/postfix/private/auth {
    mode = 0660
    user = postfix
    group = postfix
  }
}
```

### 待ち受けポート
| ポート | プロトコル | 用途 |
|--------|-----------|------|
| 110 | POP3 | メール受信 (非暗号化) |
| 995 | POP3S | メール受信 (SSL/TLS) |
| 143 | IMAP | メール受信 (非暗号化) |
| 993 | IMAPS | メール受信 (SSL/TLS) |

### メールボックス形式
- **形式:** Maildir
- **保存先:** `/home/{ユーザー名}/Maildir/`
- **構造:**
  - `new/` - 未読メール
  - `cur/` - 既読メール
  - `tmp/` - 一時ファイル

---

## 4. OpenDKIM 設定状況

### 主要設定
```ini
Mode = sv
Socket = inet:8891@localhost
KeyTable = /etc/opendkim/KeyTable
SigningTable = refile:/etc/opendkim/SigningTable
ExternalIgnoreList = refile:/etc/opendkim/TrustedHosts
InternalHosts = refile:/etc/opendkim/TrustedHosts
```

### DKIM鍵情報
- **KeyTable:** `default._domainkey.dokujo.com dokujo.com:default:/etc/opendkim/keys/dokujo.com/default.private`
- **セレクタ:** default
- **鍵タイプ:** RSA 2048bit

---

## 5. DNS レコード設定状況

### MXレコード
```
dokujo.com.  IN  MX  10 mail.dokujo.com.
```

### SPFレコード
```
dokujo.com.  IN  TXT  "v=spf1 +mx +ip4:210.172.133.160/27 +ip4:125.6.129.53 ~all"
```

### DKIMレコード
```
default._domainkey.dokujo.com.  IN  TXT  "v=DKIM1; h=sha256; k=rsa; p=MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtdoRz+OLf21YoeCU/z6CCU8i0qvpLxR33wNSIbwCRmfmJPV7f9okIYnQZUZcEwAAPR+SBQpSc+giYBN0i/Zq4h6DsbCR8sqZQVtYqWjDRdurIs4GGBin0f9fh8O78svfWSUiIAFi2XH8o3CHocJRPuFzgHYADDRsNE1oDFJS9ruUYGNeterYbG0V87IW40yGFfsxAB9kTQXo1k3YLONeJfKNj7Rz1VkyaaOfDjqg+ciCNpgPWpWHQ84O3Kq8KGtEpibikrqetRGt2GOu3BF2yu7UUn/9Xl45dNMli9L3Na7S7PAn+zuOBoDw1JyRm/lZFTJZy02df9QPBaP6Jw/O8QIDAQAB"
```

### DMARCレコード
**⚠️ 未設定** - 推奨設定:
```
_dmarc.dokujo.com.  IN  TXT  "v=DMARC1; p=none; rua=mailto:info@dokujo.com"
```

---

## 6. SSL/TLS証明書

### Let's Encrypt証明書情報
```
Certificate Name: dokujo.com-0001
Domains: dokujo.com, mail.dokujo.com
Expiry Date: 2026-05-22 (有効期限: 84日)
Certificate Path: /etc/letsencrypt/live/dokujo.com-0001/fullchain.pem
Private Key Path: /etc/letsencrypt/live/dokujo.com-0001/privkey.pem
Key Type: ECDSA
```

### 自動更新
- **Certbot:** インストール済み
- **自動更新:** systemd timer で自動更新設定済み

---

## 7. メールアカウント情報

### 現在のメールアカウント
| ユーザー名 | メールアドレス | ホームディレクトリ | Maildir |
|-----------|---------------|------------------|---------|
| info | info@dokujo.com | /home/info | /home/info/Maildir |

### メールアカウント管理
- **認証方式:** システムユーザー認証 (PAM)
- **パスワード管理:** Linux システムユーザーのパスワード

---

## 8. メールクライアント設定情報

### SMTP送信設定 (送信サーバー)
| 項目 | 設定値 |
|------|--------|
| サーバー | mail.dokujo.com または dokujo.com |
| ポート | 587 (STARTTLS推奨) または 465 (SSL/TLS) |
| 暗号化 | STARTTLS または SSL/TLS |
| 認証 | 必要 |
| ユーザー名 | info@dokujo.com |
| パスワード | (システムユーザーのパスワード) |

### POP3受信設定 (受信サーバー)
| 項目 | 設定値 |
|------|--------|
| サーバー | mail.dokujo.com または dokujo.com |
| ポート | 995 (SSL/TLS推奨) または 110 (非暗号化) |
| 暗号化 | SSL/TLS |
| 認証 | 必要 |
| ユーザー名 | info または info@dokujo.com |
| パスワード | (システムユーザーのパスワード) |

### IMAP受信設定 (受信サーバー)
| 項目 | 設定値 |
|------|--------|
| サーバー | mail.dokujo.com または dokujo.com |
| ポート | 993 (SSL/TLS推奨) または 143 (非暗号化) |
| 暗号化 | SSL/TLS |
| 認証 | 必要 |
| ユーザー名 | info または info@dokujo.com |
| パスワード | (システムユーザーのパスワード) |

---

## 9. Gmail POP3設定 (実績あり)

Gmailで `info@dokujo.com` のメールを受信する場合:

1. Gmail設定 → アカウントとインポート → 他のアカウントのメールを確認
2. POP3設定:
   - **メールアドレス:** info@dokujo.com
   - **ユーザー名:** info
   - **パスワード:** (システムユーザーのパスワード)
   - **POPサーバー:** dokujo.com
   - **ポート:** 995
   - **SSL:** チェック必須

**✅ 動作確認済み** (2026年2月25日)

---

## 10. トラブルシューティング履歴

### 問題: POP3でメールが受信できない (2026年2月25日)
**症状:**
- Gmailで `info@dokujo.com` のPOP3受信ができない
- サーバーログでは認証成功、`retr=0/0` (取得メール数0)

**原因:**
- Dovecotの `mail_location` 設定が誤っていた
- 設定: `mbox:~/mail:INBOX=/var/mail/%u` (mbox形式)
- 実際: `/home/info/Maildir/` (Maildir形式)

**解決策:**
```bash
# /etc/dovecot/conf.d/10-mail.conf を修正
mail_location = maildir:~/Maildir

# Dovecot再起動
sudo systemctl restart dovecot
```

**結果:** ✅ 解決 - Gmail POP3受信が正常動作

---

## 11. メンテナンス情報

### ログファイル
| ログ | パス |
|------|------|
| Postfix | `/var/log/mail.log` |
| Dovecot | `/var/log/mail.log` |
| OpenDKIM | `/var/log/mail.log` |

### 定期メンテナンス
- **SSL証明書更新:** 自動 (Let's Encrypt)
- **ログローテーション:** logrotate で自動設定済み

### サーバー接続
```bash
ssh -i ~/.ssh/hanashite.key ubuntu@133.18.125.19
```

---

## 12. 今後の推奨事項

### セキュリティ強化
1. **DMARCレコード追加**
   ```
   _dmarc.dokujo.com.  IN  TXT  "v=DMARC1; p=quarantine; rua=mailto:info@dokujo.com"
   ```

2. **平文認証の無効化**
   - `/etc/dovecot/conf.d/10-auth.conf` で `disable_plaintext_auth = yes` に変更
   - 暗号化接続のみ許可

3. **Fail2ban導入**
   - ブルートフォース攻撃対策

### 監視
1. **メール配送監視**
   - Postfix queue監視
   - 配送遅延アラート

2. **ディスク容量監視**
   - Maildirのディスク使用量監視

---

## 13. 関連リンク

- **Webサイト:** https://dokujo.com
- **管理画面:** https://dokujo.com/admin
- **Supabase:** https://supabase.com/dashboard/project/fdbkbbuvrihxbqfwgdkg

---

**最終更新日:** 2026年2月26日  
**確認者:** システム管理者
