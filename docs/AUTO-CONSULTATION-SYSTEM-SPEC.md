# ハナシテ 自動相談投稿システム 仕様書

**Version**: 1.0  
**Last Updated**: 2026-03-18  
**Base System**: Anke v1.0 RSS自動投稿システムを流用  
**Technology Stack**: Next.js 16 + TypeScript + Supabase + OpenAI API + Cheerio (スクレイピング) + pytrends (Googleトレンド)

---

## 📋 目次

1. [システム概要](#1-システム概要)
2. [ハイブリッド構成](#2-ハイブリッド構成)
3. [データベース設計](#3-データベース設計)
4. [API仕様](#4-api仕様)
5. [カテゴリウェイトキュー](#5-カテゴリウェイトキュー)
6. [Yahoo!知恵袋スクレイピング](#6-yahoo知恵袋スクレイピング)
7. [Googleトレンド連携](#7-googleトレンド連携)
8. [GPT自動生成](#8-gpt自動生成)
9. [実装フロー](#9-実装フロー)
10. [設定項目](#10-設定項目)

---

## 1. システム概要

### 1.1 目的

ハナシテの投稿数を増やし、サイトの活性化を図るため、以下の3つのソースを組み合わせた自動相談投稿システムを構築します。

1. **Yahoo!知恵袋スクレイピング**: 日本人のリアルな恋愛相談をテーマとして取得
2. **Googleトレンド**: 急上昇中の恋愛関連キーワードを取得
3. **GPT-4完全自動生成**: 外部ソースが取得できない場合のフォールバック

### 1.2 基本方針

- **既存システムの流用**: Ankeの`auto-creator`システム（RSS自動投稿）をベースに、スクレイピング部分のみを差し替え
- **カテゴリの均等配分**: 全20カテゴリを満遍なく投稿しつつ、人気カテゴリに偏重を持たせる
- **投稿頻度**: 60分ごとに1件投稿（±15分のゆらぎ）
- **実行しない時間帯**: 0時〜6時は投稿を停止

### 1.3 処理フロー概要

```
① カテゴリキューから次のカテゴリを取得
        ↓
② Yahoo!知恵袋から該当カテゴリの質問タイトルを取得
        ↓ 取得失敗 or 重複の場合
③ Googleトレンドから恋愛系急上昇ワードを取得
        ↓ それも失敗した場合
④ GPT-4でカテゴリに合った相談文を完全自動生成
        ↓
⑤ GPT-4で相談タイトル・本文を生成
        ↓
⑥ postsテーブルに投稿
        ↓
⑦ キーワード自動付与（既存の仕組みを流用）
```

---

## 2. ハイブリッド構成

### 2.1 優先順位

| 優先度 | ソース | 取得方法 | 特徴 |
|---|---|---|---|
| **1** | Yahoo!知恵袋 | Cheerioでスクレイピング | 日本人のリアルな悩み・日本語そのまま使える |
| **2** | Googleトレンド | pytrends（非公式ライブラリ） | 「彼氏 浮気」など今話題の恋愛ワードを取得 |
| **3** | GPT完全自動生成 | OpenAI API | カテゴリキューから相談文を自動生成 |

### 2.2 フォールバック戦略

- Yahoo!知恵袋のスクレイピングが失敗した場合（Bot対策、ネットワークエラーなど）は、Googleトレンドにフォールバック
- Googleトレンドも失敗した場合は、GPT-4単独で相談文を生成
- 取得したタイトルをそのまま使わず、必ずGPT-4でリライトすることで著作権・利用規約のリスクを回避

---

## 3. データベース設計

### 3.1 既存テーブルの拡張

#### 3.1.1 `auto_creator_settings` テーブル

既存の設定テーブルに以下のカラムを追加します。

```sql
-- カテゴリウェイトキュー（JSONB型）
ALTER TABLE auto_creator_settings
ADD COLUMN IF NOT EXISTS category_queue JSONB DEFAULT '[]';

-- 現在のキューインデックス（INTEGER型）
ALTER TABLE auto_creator_settings
ADD COLUMN IF NOT EXISTS queue_index INTEGER DEFAULT 0;
```

**category_queue の構造例:**

```json
[
  {"category_id": 1, "category_name": "片思い"},
  {"category_id": 2, "category_name": "浮気"},
  {"category_id": 1, "category_name": "片思い"},
  {"category_id": 3, "category_name": "別れ話・失恋"},
  {"category_id": 2, "category_name": "浮気"},
  ...
]
```

#### 3.1.2 `auto_creator_settings` 設定キー一覧

| setting_key | setting_value | 説明 |
|---|---|---|
| `execution_interval` | `60` | 実行間隔（分） |
| `execution_variance` | `15` | 実行ゆらぎ（分） |
| `no_run_start` | `00:00` | 実行しない時間帯（開始） |
| `no_run_end` | `06:00` | 実行しない時間帯（終了） |
| `ai_member_probability` | `50` | AI会員使用確率（%） |
| `max_topics_per_run` | `1` | 実行ごとの最大トピック数 |
| `max_categories` | `1` | 最大カテゴリ数 |
| `max_keywords` | `3` | 最大キーワード数 |
| `scraping_wait_time` | `0` | スクレイピング待機時間（秒） |
| `yahoo_chiebukuro_url` | `https://chiebukuro.yahoo.co.jp/category/2078297875/question/list` | Yahoo!知恵袋恋愛カテゴリURL |
| `openai_api_key` | `sk-...` | OpenAI APIキー |
| `title_prompt` | `{テンプレート}` | タイトル生成プロンプト |
| `content_prompt` | `{テンプレート}` | 本文生成プロンプト |
| `category_weights` | `{JSON}` | カテゴリウェイト設定 |

### 3.2 新規テーブル

#### 3.2.1 `auto_consultation_sources` テーブル

スクレイピングで取得したソースを一時保存するテーブル。

```sql
CREATE TABLE auto_consultation_sources (
  id SERIAL PRIMARY KEY,
  source_type VARCHAR(50) NOT NULL, -- 'yahoo_chiebukuro', 'google_trends', 'gpt_generated'
  source_url TEXT, -- Yahoo!知恵袋のURL（該当する場合）
  source_title TEXT NOT NULL, -- 取得したタイトルまたはキーワード
  source_content TEXT, -- 取得した本文（該当する場合）
  category_id INTEGER, -- 対応するカテゴリID
  is_processed BOOLEAN DEFAULT FALSE, -- 投稿済みかどうか
  created_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  UNIQUE(source_url) -- 重複防止
);

CREATE INDEX idx_auto_consultation_sources_processed ON auto_consultation_sources(is_processed);
CREATE INDEX idx_auto_consultation_sources_category ON auto_consultation_sources(category_id);
```

#### 3.2.2 `auto_consultation_logs` テーブル

自動投稿の実行ログを記録するテーブル。

```sql
CREATE TABLE auto_consultation_logs (
  id SERIAL PRIMARY KEY,
  execution_time TIMESTAMP DEFAULT NOW(),
  source_type VARCHAR(50), -- 'yahoo_chiebukuro', 'google_trends', 'gpt_generated'
  category_id INTEGER,
  category_name VARCHAR(100),
  post_id INTEGER, -- 生成された投稿ID
  source_id INTEGER, -- auto_consultation_sourcesのID
  title TEXT,
  status VARCHAR(50), -- 'success', 'failed'
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_auto_consultation_logs_execution_time ON auto_consultation_logs(execution_time);
CREATE INDEX idx_auto_consultation_logs_status ON auto_consultation_logs(status);
```

#### 3.2.3 `google_trends_cache` テーブル

Googleトレンドのキーワードをキャッシュするテーブル（API制限対策）。

```sql
CREATE TABLE google_trends_cache (
  id SERIAL PRIMARY KEY,
  keyword VARCHAR(255) NOT NULL,
  trend_score INTEGER, -- トレンドスコア（0-100）
  category VARCHAR(100), -- 恋愛関連カテゴリ
  fetched_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP, -- キャッシュ有効期限（24時間）
  UNIQUE(keyword)
);

CREATE INDEX idx_google_trends_cache_expires ON google_trends_cache(expires_at);
```

---

## 4. API仕様

### 4.1 既存APIの拡張

#### 4.1.1 `POST /api/auto-creator/execute-auto`

既存の自動実行APIを拡張し、カテゴリキューとハイブリッドソース取得に対応します。

**処理フロー:**

1. `auto_creator_settings`から設定を取得
2. 実行しない時間帯のチェック
3. `category_queue`と`queue_index`から次のカテゴリを取得
4. Yahoo!知恵袋スクレイピング → Googleトレンド → GPT生成の順で試行
5. GPT-4でタイトル・本文を生成
6. `posts`テーブルに投稿
7. `queue_index`をインクリメント（50件で0にリセット）
8. `auto_consultation_logs`にログを記録

**レスポンス例:**

```json
{
  "success": true,
  "message": "1件の相談を投稿しました",
  "details": {
    "post_id": 12345,
    "category_id": 1,
    "category_name": "片思い",
    "source_type": "yahoo_chiebukuro",
    "title": "好きな人に告白するタイミングがわかりません",
    "queue_index": 1
  }
}
```

### 4.2 新規API

#### 4.2.1 `GET /api/auto-creator/fetch-yahoo-chiebukuro`

Yahoo!知恵袋の恋愛カテゴリから質問タイトルを取得します。

**パラメータ:**

- `category_name` (string): カテゴリ名（例: "片思い"）

**処理フロー:**

1. Yahoo!知恵袋の恋愛カテゴリページをCheerioでスクレイピング
2. 質問タイトルを抽出（最新10件）
3. `auto_consultation_sources`に保存（重複チェック）
4. カテゴリに関連するタイトルをフィルタリング

**レスポンス例:**

```json
{
  "success": true,
  "sources": [
    {
      "id": 1,
      "source_type": "yahoo_chiebukuro",
      "source_url": "https://detail.chiebukuro.yahoo.co.jp/qa/question_detail/q12345678",
      "source_title": "好きな人に告白するタイミングがわかりません",
      "category_id": 1,
      "is_processed": false
    }
  ],
  "total": 1
}
```

#### 4.2.2 `GET /api/auto-creator/fetch-google-trends`

Googleトレンドから恋愛関連の急上昇ワードを取得します。

**パラメータ:**

- `category_name` (string): カテゴリ名（例: "浮気"）

**処理フロー:**

1. `google_trends_cache`からキャッシュをチェック（24時間以内）
2. キャッシュがない場合、pytrendsで急上昇ワードを取得
3. 恋愛関連キーワードをフィルタリング（「彼氏」「彼女」「恋愛」「浮気」など）
4. `google_trends_cache`に保存
5. カテゴリに関連するキーワードを返す

**レスポンス例:**

```json
{
  "success": true,
  "keywords": [
    {
      "keyword": "彼氏 浮気 兆候",
      "trend_score": 85,
      "category": "浮気"
    },
    {
      "keyword": "浮気 許す",
      "trend_score": 72,
      "category": "浮気"
    }
  ],
  "total": 2,
  "cached": false
}
```

#### 4.2.3 `POST /api/auto-creator/generate-consultation`

GPT-4でカテゴリに合った相談文を生成します。

**リクエストボディ:**

```json
{
  "category_id": 1,
  "category_name": "片思い",
  "source_type": "yahoo_chiebukuro",
  "source_title": "好きな人に告白するタイミングがわかりません"
}
```

**処理フロー:**

1. `auto_creator_settings`からプロンプトテンプレートを取得
2. `source_title`をプロンプトに埋め込む
3. GPT-4でタイトル・本文を生成
4. 生成結果を返す

**レスポンス例:**

```json
{
  "success": true,
  "title": "片思いの相手に告白するベストなタイミングは？",
  "content": "26歳の会社員です。同じ職場の男性に半年前から片思いをしています。最近、彼と二人で話す機会が増えてきて、脈ありかもしれないと感じています。でも、告白するタイミングがわからず、悩んでいます。早すぎると引かれそうだし、遅すぎると他の人に取られそうで...。みなさんは告白するタイミングをどう判断しましたか？",
  "category_id": 1,
  "source_type": "yahoo_chiebukuro"
}
```

---

## 5. カテゴリウェイトキュー

### 5.1 カテゴリ一覧とウェイト

全20カテゴリを以下のウェイトで配分します。

| カテゴリID | カテゴリ名 | ウェイト | 理由 |
|---|---|---|---|
| 1 | 片思い | 5 | 最も普遍的・検索ボリューム大 |
| 2 | 浮気 | 5 | センセーショナルで拡散しやすい |
| 3 | 別れ話・失恋 | 4 | 感情移入しやすく共感コメントが集まる |
| 4 | コミュニケーション | 4 | 日常的な悩みで幅広い層に刺さる |
| 5 | 復縁 | 4 | 検索需要が高い定番テーマ |
| 6 | 職場恋愛 | 3 | 社会人ユーザーに刺さる |
| 7 | 告白・プロポーズ | 3 | 季節イベントと連動しやすい |
| 8 | マンネリ・倦怠期 | 3 | カップル・既婚者にリーチ |
| 9 | 同棲 | 3 | 生活感があり具体的な悩みが多い |
| 10 | 婚活 | 2 | 30代以上のユーザー獲得に有効 |
| 11 | デート | 2 | 軽めの悩みで投稿しやすい |
| 12 | 出会い | 2 | 入口となるカテゴリ |
| 13 | 価値観 | 2 | 深い議論が生まれやすい |
| 14 | 遠距離恋愛 | 2 | ニッチだが熱量が高い |
| 15 | 離婚 | 2 | 重めだが検索需要あり |
| 16 | 夫婦 | 1 | 既婚者向け・やや限定的 |
| 17 | レス | 1 | センシティブだが需要あり |
| 18 | 夜の悩み | 1 | センシティブ枠 |
| 19 | その他 | 1 | バッファ枠 |
| 20 | 不倫 | 1 | センシティブだが検索需要あり |

**合計ウェイト: 50** → 50投稿で1サイクル完結

### 5.2 キュー生成ロジック

```typescript
function generateCategoryQueue(weights: Record<string, number>) {
  const queue: Array<{ category_id: number; category_name: string }> = [];
  
  for (const [categoryName, weight] of Object.entries(weights)) {
    const categoryId = getCategoryIdByName(categoryName);
    for (let i = 0; i < weight; i++) {
      queue.push({ category_id: categoryId, category_name: categoryName });
    }
  }
  
  // シャッフルして偏りを分散
  return shuffleArray(queue);
}
```

### 5.3 キューの更新

- 初回実行時に`category_queue`を生成
- `queue_index`が49に達したら0にリセット
- 管理画面から手動でキューを再生成可能

---

## 6. Yahoo!知恵袋スクレイピング

### 6.1 対象URL

```
https://chiebukuro.yahoo.co.jp/category/2078297875/question/list
```

恋愛カテゴリの質問一覧ページ。

### 6.2 スクレイピング仕様

**使用ライブラリ:** Cheerio（サーバーサイドでHTMLをパース）

**取得項目:**

- 質問タイトル
- 質問URL
- 投稿日時

**実装例:**

```typescript
import * as cheerio from 'cheerio';

async function scrapeYahooChiebukuro(categoryName: string) {
  const url = 'https://chiebukuro.yahoo.co.jp/category/2078297875/question/list';
  
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  
  const html = await response.text();
  const $ = cheerio.load(html);
  
  const questions: Array<{
    title: string;
    url: string;
    pubDate: string;
  }> = [];
  
  $('.ClapLv4List_Item').each((i, elem) => {
    const title = $(elem).find('.ClapLv4List_QuestionTitle').text().trim();
    const relativeUrl = $(elem).find('.ClapLv4List_QuestionTitle a').attr('href');
    const url = relativeUrl ? `https://chiebukuro.yahoo.co.jp${relativeUrl}` : '';
    const pubDate = $(elem).find('.ClapLv4List_QuestionDate').text().trim();
    
    if (title && url) {
      questions.push({ title, url, pubDate });
    }
  });
  
  return questions.slice(0, 10); // 最新10件
}
```

### 6.3 カテゴリフィルタリング

取得したタイトルをカテゴリに関連するキーワードでフィルタリングします。

**カテゴリキーワードマッピング:**

```typescript
const categoryKeywords: Record<string, string[]> = {
  '片思い': ['片思い', '好きな人', '告白', '脈あり', '脈なし'],
  '浮気': ['浮気', '不倫', '二股', '裏切り'],
  '別れ話・失恋': ['別れ', '失恋', '振られた', '復縁'],
  'コミュニケーション': ['会話', 'LINE', 'メール', '連絡'],
  // ...
};

function filterByCategory(questions: any[], categoryName: string) {
  const keywords = categoryKeywords[categoryName] || [];
  return questions.filter(q => 
    keywords.some(keyword => q.title.includes(keyword))
  );
}
```

### 6.4 Bot対策

Yahoo!知恵袋はBot対策が厳しいため、以下の対策を実施します。

1. **User-Agent偽装**: ブラウザのUser-Agentを設定
2. **リクエスト間隔**: 最低30秒の待機時間
3. **キャッシュ活用**: 取得したデータを`auto_consultation_sources`に保存し、24時間キャッシュ
4. **エラーハンドリング**: スクレイピング失敗時は即座にGoogleトレンドにフォールバック

---

## 7. Googleトレンド連携

### 7.1 使用ライブラリ

**pytrends**（非公式Pythonライブラリ）をNext.js APIから呼び出します。

### 7.2 実装方法

#### 7.2.1 Pythonスクリプト（`scripts/fetch_google_trends.py`）

```python
from pytrends.request import TrendReq
import json
import sys

def fetch_trends(category_name):
    pytrends = TrendReq(hl='ja-JP', tz=540)
    
    # 恋愛関連キーワードのベースリスト
    base_keywords = {
        '片思い': ['片思い', '好きな人', '告白'],
        '浮気': ['浮気', '不倫', '二股'],
        '別れ話・失恋': ['別れ', '失恋', '復縁'],
        # ...
    }
    
    keywords = base_keywords.get(category_name, ['恋愛'])
    
    # 急上昇ワードを取得
    pytrends.build_payload(keywords, timeframe='now 7-d', geo='JP')
    trending = pytrends.trending_searches(pn='japan')
    
    # 恋愛関連ワードをフィルタリング
    love_keywords = ['彼氏', '彼女', '恋愛', '浮気', '告白', '別れ', '復縁']
    filtered = trending[trending[0].str.contains('|'.join(love_keywords), case=False)]
    
    results = []
    for keyword in filtered[0].head(5):
        results.append({
            'keyword': keyword,
            'trend_score': 100,  # スコアは簡易的に100固定
            'category': category_name
        })
    
    print(json.dumps(results, ensure_ascii=False))

if __name__ == '__main__':
    category_name = sys.argv[1] if len(sys.argv) > 1 else '恋愛'
    fetch_trends(category_name)
```

#### 7.2.2 Next.js APIから呼び出し

```typescript
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function fetchGoogleTrends(categoryName: string) {
  try {
    const { stdout } = await execAsync(
      `python3 scripts/fetch_google_trends.py "${categoryName}"`
    );
    return JSON.parse(stdout);
  } catch (error) {
    console.error('Googleトレンド取得エラー:', error);
    return [];
  }
}
```

### 7.3 キャッシュ戦略

- `google_trends_cache`テーブルに24時間キャッシュ
- キャッシュがある場合はPythonスクリプトを実行せず、DBから取得
- キャッシュ有効期限切れの場合のみ再取得

---

## 8. GPT自動生成

### 8.1 プロンプトテンプレート

#### 8.1.1 タイトル生成プロンプト

```
カテゴリ: {{category_name}}
テーマ: {{source_title}}

上記のテーマをもとに、26歳の一人暮らし女性が実際に抱えそうな恋愛の悩みを、
相談掲示板への投稿タイトルとして自然な日本語で生成してください。

要件:
- 30文字以内
- 疑問形または悩み形式
- 具体的で共感しやすい内容
- 「〜について」「〜はどうすればいい？」などの形式

出力形式: タイトルのみを1行で出力
```

#### 8.1.2 本文生成プロンプト

```
カテゴリ: {{category_name}}
タイトル: {{generated_title}}
テーマ: {{source_title}}

上記のタイトルに合った相談本文を生成してください。

要件:
- 200〜400文字
- 26歳の一人暮らし女性の視点
- 具体的なエピソードを含める
- 自然な日本語の口語体
- 最後に「みなさんはどう思いますか？」などの問いかけで締める

出力形式: 本文のみを出力
```

### 8.2 GPT-4設定

```typescript
const response = await fetch('https://api.openai.com/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${openaiApiKey}`,
  },
  body: JSON.stringify({
    model: 'gpt-4o-mini',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.9, // 多様性を高める
    max_tokens: 500,
  }),
});
```

---

## 9. 実装フロー

### 9.1 全体フロー

```
① Cron（60分ごと±15分）が /api/auto-creator/execute-auto を実行
        ↓
② 実行しない時間帯（0時〜6時）のチェック
        ↓
③ category_queue[queue_index] から次のカテゴリを取得
        ↓
④ Yahoo!知恵袋スクレイピング
   - /api/auto-creator/fetch-yahoo-chiebukuro を呼び出し
   - カテゴリに関連する質問タイトルを取得
   - auto_consultation_sources に保存
        ↓ 取得失敗 or 重複の場合
⑤ Googleトレンド取得
   - /api/auto-creator/fetch-google-trends を呼び出し
   - カテゴリに関連する急上昇ワードを取得
   - google_trends_cache に保存
        ↓ それも失敗した場合
⑥ GPT完全自動生成
   - カテゴリ名のみを使ってGPT-4で相談文を生成
        ↓
⑦ GPT-4でタイトル・本文を生成
   - /api/auto-creator/generate-consultation を呼び出し
   - source_title をプロンプトに埋め込む
        ↓
⑧ posts テーブルに投稿
   - user_id: AI会員（status=6）からランダム選択
   - category_id: キューから取得したカテゴリID
   - source_url: Yahoo!知恵袋のURL（該当する場合）
        ↓
⑨ キーワード自動付与（既存の仕組み）
   - タイトル・本文からキーワードを抽出
   - post_keywords に保存
        ↓
⑩ queue_index をインクリメント
   - queue_index が 49 の場合は 0 にリセット
        ↓
⑪ auto_consultation_logs にログを記録
```

### 9.2 エラーハンドリング

- Yahoo!知恵袋スクレイピング失敗 → Googleトレンドにフォールバック
- Googleトレンド取得失敗 → GPT完全自動生成にフォールバック
- GPT生成失敗 → エラーログを記録し、次回実行時に再試行
- 投稿失敗 → エラーログを記録し、queue_indexはインクリメントしない

---

## 10. 設定項目

### 10.1 管理画面での設定

`/admin/auto-creator/settings` で以下の設定を管理します。

| 設定項目 | デフォルト値 | 説明 |
|---|---|---|
| 実行間隔 | 60分 | Cronの実行間隔 |
| 実行ゆらぎ | ±15分 | 実行時刻のランダムゆらぎ |
| 実行しない時間帯 | 0時〜6時 | 投稿を停止する時間帯 |
| AI会員使用確率 | 50% | AI会員を使う確率 |
| 実行ごとの最大トピック数 | 1 | 1回の実行で投稿する件数 |
| 最大カテゴリ数 | 1 | 1回の実行で使うカテゴリ数 |
| 最大キーワード数 | 3 | 自動付与するキーワード数 |
| Yahoo!知恵袋URL | https://chiebukuro.yahoo.co.jp/category/2078297875/question/list | スクレイピング対象URL |
| OpenAI APIキー | sk-... | GPT-4のAPIキー |
| タイトル生成プロンプト | {テンプレート} | タイトル生成用プロンプト |
| 本文生成プロンプト | {テンプレート} | 本文生成用プロンプト |
| カテゴリウェイト | {JSON} | カテゴリごとのウェイト設定 |

### 10.2 カテゴリウェイト設定

管理画面でJSONを編集可能にします。

```json
{
  "片思い": 5,
  "浮気": 5,
  "別れ話・失恋": 4,
  "コミュニケーション": 4,
  "復縁": 4,
  "職場恋愛": 3,
  "告白・プロポーズ": 3,
  "マンネリ・倦怠期": 3,
  "同棲": 3,
  "婚活": 2,
  "デート": 2,
  "出会い": 2,
  "価値観": 2,
  "遠距離恋愛": 2,
  "離婚": 2,
  "夫婦": 1,
  "レス": 1,
  "夜の悩み": 1,
  "その他": 1,
  "不倫": 1
}
```

---

## 11. 実装スケジュール

### フェーズ1: 基盤構築（1週間）

- [ ] データベーステーブル作成（`auto_consultation_sources`, `auto_consultation_logs`, `google_trends_cache`）
- [ ] `auto_creator_settings`テーブルにカラム追加（`category_queue`, `queue_index`）
- [ ] カテゴリキュー生成ロジックの実装
- [ ] 管理画面でカテゴリウェイト設定UIを追加

### フェーズ2: スクレイピング実装（1週間）

- [ ] Yahoo!知恵袋スクレイピングAPI（`/api/auto-creator/fetch-yahoo-chiebukuro`）
- [ ] Cheerioでのスクレイピング実装
- [ ] カテゴリフィルタリングロジック
- [ ] `auto_consultation_sources`への保存

### フェーズ3: Googleトレンド実装（1週間）

- [ ] Pythonスクリプト（`scripts/fetch_google_trends.py`）
- [ ] Next.js APIからPythonスクリプトを呼び出し（`/api/auto-creator/fetch-google-trends`）
- [ ] `google_trends_cache`へのキャッシュ保存

### フェーズ4: GPT生成実装（1週間）

- [ ] GPT-4相談文生成API（`/api/auto-creator/generate-consultation`）
- [ ] プロンプトテンプレートの作成
- [ ] タイトル・本文生成ロジック

### フェーズ5: 統合・テスト（1週間）

- [ ] `/api/auto-creator/execute-auto`の拡張
- [ ] ハイブリッドフォールバックロジックの実装
- [ ] `auto_consultation_logs`へのログ記録
- [ ] Cron設定（60分ごと±15分）
- [ ] エラーハンドリングの実装
- [ ] 本番環境でのテスト実行

---

## 12. 注意事項

### 12.1 著作権・利用規約

- Yahoo!知恵袋の質問タイトルをそのまま使わず、必ずGPT-4でリライトする
- スクレイピングは利用規約上グレーゾーンのため、取得頻度を抑える（1日1回程度）
- Googleトレンドは非公式APIのため、API制限に注意

### 12.2 Bot対策

- Yahoo!知恵袋はBot対策が厳しいため、User-Agent偽装とリクエスト間隔の調整が必須
- スクレイピング失敗時は即座にフォールバックし、エラーログを記録

### 12.3 コスト

- OpenAI API（GPT-4o-mini）: 1件あたり約0.5円
- 1日24件投稿（60分ごと）: 約12円/日 = 約360円/月

---

## 13. まとめ

Yahoo!知恵袋とGoogleトレンドを活用したハイブリッド型自動相談投稿システムにより、以下のメリットが得られます。

1. **リアルな悩みの収集**: Yahoo!知恵袋から日本人のリアルな恋愛相談をテーマとして取得
2. **トレンドの反映**: Googleトレンドから急上昇中の恋愛キーワードを取得
3. **安定した投稿**: 外部ソースが取得できない場合もGPT-4で完全自動生成
4. **カテゴリの均等配分**: 全20カテゴリを満遍なく投稿しつつ、人気カテゴリに偏重
5. **既存システムの流用**: Ankeの`auto-creator`システムをベースに、最小限の変更で実装可能

この仕様書に基づいて実装を進めることで、ハナシテの投稿数を安定的に増やし、サイトの活性化を図ることができます。
