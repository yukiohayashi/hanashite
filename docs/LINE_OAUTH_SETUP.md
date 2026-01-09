# LINE Login OAuth 設定ガイド

## 1. LINE Developers Consoleにアクセス

https://developers.line.biz/console/

## 2. プロバイダーの作成

### 2-1. 新規プロバイダー作成
1. 「作成」ボタンをクリック
2. プロバイダー名: `Anke` （任意）
3. 「作成」をクリック

## 3. チャネルの作成

### 3-1. LINEログインチャネル作成
1. 作成したプロバイダーを選択
2. 「新規チャネル作成」をクリック
3. チャネルの種類: **LINEログイン** を選択

### 3-2. チャネル基本設定
**チャネル名**: `Anke Development` （開発用）

**チャネル説明**: アンケートサイトのログイン機能

**アプリタイプ**: **ウェブアプリ** を選択

**メールアドレス**: 管理者のメールアドレス

**プライバシーポリシーURL**: `http://localhost:3000/privacy` （任意）

**サービス利用規約URL**: `http://localhost:3000/terms` （任意）

### 3-3. 同意事項
- LINE公式アカウント利用規約に同意
- LINE公式アカウントAPI利用規約に同意

「作成」をクリック

## 4. チャネル設定

### 4-1. チャネル基本設定タブ
作成したチャネルの「チャネル基本設定」タブで以下を確認：

**Channel ID**: `1234567890`
**Channel Secret**: `xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`

⚠️ **重要**: これらの値をコピーして保存してください。

### 4-2. LINE Login設定タブ
「LINE Login」タブをクリック

**Callback URL**:
```
http://localhost:3000/api/auth/callback/line
```

「追加」をクリック

### 4-3. スコープ設定
以下のスコープを有効化：
- ✅ `profile` - プロフィール情報（必須）
- ✅ `openid` - OpenID Connect（必須）
- ✅ `email` - メールアドレス（推奨）

「更新」をクリック

## 5. .env.local に追加

```bash
LINE_CHANNEL_ID=1234567890
LINE_CHANNEL_SECRET=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
LINE_REDIRECT_URI=http://localhost:3000/api/auth/callback/line
```

## 6. 本番環境用の設定

本番デプロイ時は、別のチャネルを作成して以下のURLを設定：

**Callback URL**:
```
https://your-domain.com/api/auth/callback/line
```

**プライバシーポリシーURL**:
```
https://your-domain.com/privacy
```

**サービス利用規約URL**:
```
https://your-domain.com/terms
```

## 7. Better Auth.js設定の更新

`lib/better-auth.ts` にLINEプロバイダーを追加：

```typescript
socialProviders: {
  twitter: {
    clientId: process.env.TWITTER_CLIENT_ID || "",
    clientSecret: process.env.TWITTER_CLIENT_SECRET || "",
    redirectURI: process.env.TWITTER_REDIRECT_URI || "",
  },
  line: {
    clientId: process.env.LINE_CHANNEL_ID || "",
    clientSecret: process.env.LINE_CHANNEL_SECRET || "",
    redirectURI: process.env.LINE_REDIRECT_URI || "",
  },
},
```

## トラブルシューティング

### エラー: "Callback URL not registered"
- Callback URLが正確に設定されているか確認
- `http://localhost:3000/api/auth/callback/line` を完全一致で設定

### エラー: "Invalid channel credentials"
- Channel IDとChannel Secretが正しいか確認
- 環境変数が正しく読み込まれているか確認

### ユーザー情報が取得できない
- スコープ設定で `profile` と `openid` が有効化されているか確認
- メールアドレスが必要な場合は `email` スコープも有効化

## 参考リンク

- [LINE Login Documentation](https://developers.line.biz/ja/docs/line-login/)
- [LINE Login API Reference](https://developers.line.biz/ja/reference/line-login/)
- [Better Auth LINE Provider](https://www.better-auth.com/docs/authentication/social)
