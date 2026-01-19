# SSH接続設定ガイド

カゴヤVPSへのSSH接続設定方法

---

## 📋 接続情報

### VPS情報
- **IPアドレス**: `133.18.122.123`
- **ユーザー名**: `ubuntu`
- **SSH鍵**: `~/.ssh/anke-nextjs.key`
- **SSH鍵（PuTTY形式）**: `~/.ssh/anke-nextjs.ppk`

---

## 🔑 SSH鍵の管理

### SSH鍵の保存場所
```
~/.ssh/anke-nextjs.key     # macOS/Linux用（OpenSSH形式）
~/.ssh/anke-nextjs.ppk     # Windows用（PuTTY形式）
```

### SSH鍵の権限設定（重要）
```bash
# macOS/Linuxの場合
chmod 600 ~/.ssh/anke-nextjs.key

# 確認
ls -la ~/.ssh/anke-nextjs.key
# 出力例: -rw------- 1 yukki staff 1683 Jan  9 14:21 anke-nextjs.key
```

**注意**: SSH鍵の権限が正しくないと接続できません。必ず`600`（所有者のみ読み書き可能）に設定してください。

---

## 💻 ターミナルでの接続方法

### 基本的な接続コマンド
```bash
ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123
```

### ~/.ssh/configを使った接続（推奨）

#### 1. SSH設定ファイルを編集
```bash
nano ~/.ssh/config
```

#### 2. 以下の設定を追加
```
Host anke-vps
    HostName 133.18.122.123
    User ubuntu
    IdentityFile ~/.ssh/anke-nextjs.key
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

#### 3. 設定ファイルの権限を設定
```bash
chmod 600 ~/.ssh/config
```

#### 4. 簡単に接続
```bash
ssh anke-vps
```

---

## 🖥 FileZilla（SFTP）での接続方法

### 接続設定
1. **プロトコル**: SFTP - SSH File Transfer Protocol
2. **ホスト**: `133.18.122.123`
3. **ポート**: （空欄またはデフォルト）
4. **ログオンタイプ**: 鍵ファイル
5. **ユーザー**: `ubuntu`
6. **鍵ファイル**: `/Users/yukki/.ssh/anke-nextjs.ppk`

### 注意事項
- FileZillaはPuTTY形式（`.ppk`）の鍵ファイルを使用します
- OpenSSH形式（`.key`）からPuTTY形式（`.ppk`）への変換が必要な場合は、PuTTYgenを使用してください

---

## 🔒 セキュリティのベストプラクティス

### SSH鍵の管理
1. **SSH鍵を共有しない**
   - SSH鍵は個人の認証情報です
   - チーム内でも直接共有しないでください

2. **SSH鍵をGitにコミットしない**
   - `.gitignore`に`*.key`と`*.ppk`が含まれていることを確認
   - 誤ってコミットした場合は、すぐに鍵を再生成してください

3. **SSH鍵のバックアップ**
   - SSH鍵を安全な場所にバックアップしてください
   - パスワードマネージャーや暗号化されたストレージを使用

4. **パスフレーズの設定（推奨）**
   - SSH鍵にパスフレーズを設定すると、さらにセキュリティが向上します
   ```bash
   ssh-keygen -p -f ~/.ssh/anke-nextjs.key
   ```

---

## 🛠 トラブルシューティング

### 接続できない場合

#### 1. SSH鍵の権限を確認
```bash
ls -la ~/.ssh/anke-nextjs.key
# 権限が -rw------- (600) であることを確認

# 権限が違う場合は修正
chmod 600 ~/.ssh/anke-nextjs.key
```

#### 2. SSH鍵のパスを確認
```bash
# SSH鍵が存在するか確認
ls -la ~/.ssh/anke-nextjs.key

# 存在しない場合は、正しい場所にコピー
```

#### 3. 詳細なログを確認
```bash
ssh -vvv -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123
```

#### 4. パスワード認証を試す（最終手段）
```bash
ssh ubuntu@133.18.122.123
# パスワードを入力
```

### よくあるエラー

#### "Permission denied (publickey,password)"
- SSH鍵の権限が正しくない → `chmod 600 ~/.ssh/anke-nextjs.key`
- SSH鍵のパスが間違っている → パスを確認
- ユーザー名が間違っている → `ubuntu`を使用

#### "Bad permissions"
- SSH鍵の権限が緩すぎる → `chmod 600 ~/.ssh/anke-nextjs.key`
- ~/.ssh/configの権限が緩すぎる → `chmod 600 ~/.ssh/config`

---

## 📝 環境変数への追加は不要

SSH鍵は環境変数に追加する必要はありません。以下の理由から、ファイルシステムに保存して使用します：

1. **セキュリティ**: 環境変数は他のプロセスから読み取られる可能性があります
2. **標準的な方法**: SSH鍵は`~/.ssh/`ディレクトリに保存するのが標準です
3. **SSHクライアントの仕様**: SSHクライアントはファイルパスを指定して鍵を読み込みます

### SSH鍵の保存場所（推奨）
```
~/.ssh/
├── anke-nextjs.key      # VPS接続用の秘密鍵
├── anke-nextjs.ppk      # FileZilla用（PuTTY形式）
├── config               # SSH設定ファイル
└── known_hosts          # 接続済みホストの情報
```

---

## 🚀 クイックリファレンス

### よく使うコマンド

```bash
# SSH接続
ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123

# または（~/.ssh/config設定後）
ssh anke-vps

# ファイルをVPSにコピー
scp -i ~/.ssh/anke-nextjs.key file.txt ubuntu@133.18.122.123:/var/www/anke-nextjs/

# ファイルをVPSからダウンロード
scp -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123:/var/www/anke-nextjs/file.txt ./

# ディレクトリを再帰的にコピー
scp -r -i ~/.ssh/anke-nextjs.key directory/ ubuntu@133.18.122.123:/var/www/anke-nextjs/
```
