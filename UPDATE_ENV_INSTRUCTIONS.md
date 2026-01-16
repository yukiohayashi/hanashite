# 環境変数更新手順

新しいSupabaseプロジェクト（東京リージョン）に切り替えるための環境変数更新手順

---

## 📊 新しいプロジェクト情報

### **プロジェクト詳細**
- **Project Reference ID**: `btjwtqkwigunbmklsgpj`
- **リージョン**: 東京（ap-northeast-1）
- **Project URL**: `https://btjwtqkwigunbmklsgpj.supabase.co`

### **API Keys**
- **Publishable Key**: `sb_publishable_0nT0Dx3CW2yrjwatqhr-9g_rfSL7pUU`
- **Secret Key**: `sb_secret_ryPCDMeATXBj-vt7FJdT7g_zA9J0TwD`
- **Database Password**: `mfT9BeG0MfC1dW3f`

---

## 🔄 ステップ1: ローカルの.env.localを更新

### **手順**

1. **ファイルを開く**
   ```bash
   open -a "TextEdit" .env.local
   ```

2. **以下の行を探して更新**

   **変更前（ローカルDockerSupabase）:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
   ```

   **変更後（新しい東京プロジェクト）:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://btjwtqkwigunbmklsgpj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0nT0Dx3CW2yrjwatqhr-9g_rfSL7pUU
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_ryPCDMeATXBj-vt7FJdT7g_zA9J0TwD
   ```

3. **保存**

---

## 🔄 ステップ2: VPSの.env.localを更新

### **手順**

1. **VPSにSSH接続**
   ```bash
   ssh -i ~/.ssh/anke-nextjs.key ubuntu@133.18.122.123
   ```

2. **作業ディレクトリに移動**
   ```bash
   cd /var/www/anke-nextjs
   ```

3. **.env.localを編集**
   ```bash
   nano .env.local
   ```

4. **以下の行を更新**

   **変更前（シンガポールプロジェクト）:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://pazyejhciyfoklrhpfvt.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=（古いキー）
   SUPABASE_SERVICE_ROLE_KEY=（古いキー）
   ```

   **変更後（新しい東京プロジェクト）:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://btjwtqkwigunbmklsgpj.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0nT0Dx3CW2yrjwatqhr-9g_rfSL7pUU
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_ryPCDMeATXBj-vt7FJdT7g_zA9J0TwD
   ```

5. **保存して終了**
   - `Ctrl + O` → Enter（保存）
   - `Ctrl + X`（終了）

---

## 🔄 ステップ3: VPSでアプリケーションを再起動

```bash
# ビルドキャッシュをクリア
rm -rf .next

# 本番ビルド
npm run build

# PM2で再起動
pm2 restart anke-nextjs

# ログを確認
pm2 logs anke-nextjs --lines 50
```

---

## 🔄 ステップ4: 動作確認

### **ローカル**
```bash
# ローカルのDockerSupabaseを停止（新しいリモートSupabaseを使用するため）
npx supabase stop

# 開発サーバーを起動
npm run dev
```

ブラウザで http://localhost:3000 にアクセスして確認

### **VPS**
ブラウザで http://133.18.122.123/ にアクセスして確認

---

## ✅ 確認事項

- [ ] ローカルの.env.localを更新
- [ ] VPSの.env.localを更新
- [ ] VPSでビルド＆再起動
- [ ] ローカルで動作確認
- [ ] VPSで動作確認
- [ ] 古いプロジェクト（シンガポール）を削除

---

## 🗑️ 最後のステップ: 古いプロジェクトを削除

全ての動作確認が完了したら、古いシンガポールプロジェクトを削除できます：

1. https://supabase.com/dashboard/projects にアクセス
2. **anke** (`pazyejhciyfoklrhpfvt`) プロジェクトをクリック
3. Settings > General > Danger Zone
4. **Delete project** をクリック

---

## 📝 コピー＆ペースト用

### **ローカル .env.local**
```env
NEXT_PUBLIC_SUPABASE_URL=https://btjwtqkwigunbmklsgpj.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_0nT0Dx3CW2yrjwatqhr-9g_rfSL7pUU
SUPABASE_SERVICE_ROLE_KEY=sb_secret_ryPCDMeATXBj-vt7FJdT7g_zA9J0TwD
```

### **VPS更新コマンド（SSH接続後）**
```bash
cd /var/www/anke-nextjs
nano .env.local
# 上記の3行を更新
rm -rf .next
npm run build
pm2 restart anke-nextjs
pm2 logs anke-nextjs --lines 50
```
