# X (Twitter) OAuth 2.0 設定ガイド

## 1. X Developer Portalにアクセス

https://developer.twitter.com/en/portal/dashboard

## 2. プロジェクトとアプリの作成

### 2-1. 新規プロジェクト作成
1. 「+ Create Project」をクリック
2. プロジェクト名: `Anke` （任意）
3. Use case: `Making a bot` または `Exploring the API`
4. Project description: アンケートサイトの説明を入力

### 2-2. アプリ作成
1. App name: `Anke Development` （開発用）
2. 「Create」をクリック

## 3. OAuth 2.0 設定

### 3-1. App Settings
1. 作成したアプリの「Settings」タブをクリック
2. 「User authentication settings」セクションで「Set up」をクリック

### 3-2. App permissions
- **Read and write** を選択（ユーザー情報の読み取りと投稿）
- または **Read** のみ（ログインのみの場合）

### 3-3. Type of App
- **Web App, Automated App or Bot** を選択

### 3-4. App info
**Callback URI / Redirect URL**:
```
http://localhost:3000/api/auth/callback/twitter
```

**Website URL**:
```
http://localhost:3000
```

**Organization name**: `Anke`
**Organization website**: `http://localhost:3000`
**Terms of service**: （任意）
**Privacy policy**: （任意）

### 3-5. 保存
「Save」をクリック

## 4. Client ID と Client Secret の取得

### 4-1. OAuth 2.0 Client ID
設定完了後、以下が表示されます：
- **OAuth 2.0 Client ID**: `xxxxxxxxxxxxxxxxxxxxxxxxxx`
- **Client Secret**: `yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy`

⚠️ **重要**: Client Secretは一度しか表示されないので、必ずコピーして保存してください。

### 4-2. .env.local に追加

```bash
TWITTER_CLIENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxx
TWITTER_CLIENT_SECRET=yyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyyy
TWITTER_REDIRECT_URI=http://localhost:3000/api/auth/callback/twitter
```

## 5. 本番環境用の設定

本番デプロイ時は、別のアプリを作成して以下のURLを設定：

**Callback URI**:
```
https://your-domain.com/api/auth/callback/twitter
```

**Website URL**:
```
https://your-domain.com
```

## トラブルシューティング

### エラー: "Callback URL not approved"
- Callback URIが正確に設定されているか確認
- `http://localhost:3000/api/auth/callback/twitter` を完全一致で設定

### エラー: "Invalid client credentials"
- Client IDとClient Secretが正しいか確認
- 環境変数が正しく読み込まれているか確認

## 参考リンク

- [X API Documentation](https://developer.twitter.com/en/docs/authentication/oauth-2-0)
- [Better Auth Twitter Provider](https://www.better-auth.com/docs/authentication/social)
