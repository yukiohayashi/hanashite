# CRONTAB 仕様書

## 概要

VPS（133.18.125.19）で実行されるCRONジョブの仕様と実行ルールをまとめたドキュメント。

---

## CRONTAB設定

```cron
# ハナシテ AI自動投稿システム

# Yahoo知恵袋から質問を取得（毎日 9:00, 15:00, 21:00 JST）
0 9,15,21 * * * curl -X POST https://dokujo.com/api/auto-creator/fetch-yahoo-chiebukuro >> /home/ubuntu/hanashite/logs/fetch-yahoo.log 2>&1

# AI自動投稿を実行（1分ごと、内部で実行間隔チェック）
* * * * * curl -X POST https://dokujo.com/api/auto-creator/execute-auto 2>&1 | logger -t auto-creator

# AI自動コメント・いいね（5分ごと、内部で実行間隔チェック）
*/5 * * * * curl -X POST https://dokujo.com/api/auto-voter/execute-auto 2>&1 | logger -t auto-commenter-liker

# ログファイルのローテーション（毎週日曜日 0:00）
0 0 * * 0 find /home/ubuntu/hanashite/logs -name "*.log" -mtime +30 -delete
```

---

## 1. AI自動投稿（auto-creator）

### エンドポイント
- **取得**: `POST /api/auto-creator/fetch-yahoo-chiebukuro`
- **実行**: `POST /api/auto-creator/execute-auto`

### CRON実行タイミング
| ジョブ | スケジュール | 説明 |
|--------|-------------|------|
| 質問取得 | `0 9,15,21 * * *` | 毎日9時、15時、21時（JST） |
| 投稿実行 | `* * * * *` | 毎分（内部で間隔制御） |

### 実行ルール

#### 実行間隔
- **基本間隔**: 60分（DB設定: `interval`）
- **ゆらぎ**: ±30分（DB設定: `interval_variance`）
- **実際の間隔**: 30〜90分のランダム

#### 実行しない時間帯
- **開始時刻**: 22時（DB設定: `no_create_start_hour`）
- **終了時刻**: 10時（DB設定: `no_create_end_hour`）
- **スキップ時間**: 22:00〜10:00（JST）

#### 1回あたりの処理件数
- **最大投稿数**: 1件（DB設定: `max_posts_per_execution`）

### 処理フロー
```
1. CRONが毎分APIを呼び出し
2. next_execution_timeをチェック
   - 未到達 → スキップ（待機中）
   - 到達 → 次回実行時刻を設定（重複防止）
3. 実行しない時間帯チェック（22:00〜10:00）
   - 該当 → スキップ
4. 未処理のYahoo!知恵袋記事を1件取得
5. 投稿を作成
6. 次回実行時刻を計算（30〜90分後）
```

### DB設定テーブル
テーブル: `auto_creator_settings`

| setting_key | デフォルト値 | 説明 |
|-------------|-------------|------|
| enabled | true | 有効/無効 |
| interval | 60 | 実行間隔（分） |
| interval_variance | 30 | 間隔のゆらぎ（分） |
| no_create_start_hour | 22 | 実行しない開始時刻 |
| no_create_end_hour | 10 | 実行しない終了時刻 |
| max_posts_per_execution | 1 | 1回あたりの最大投稿数 |
| next_execution_time | - | 次回実行予定時刻（自動更新） |

---

## 2. AI自動コメント・いいね（auto-voter）

### エンドポイント
- **実行**: `POST /api/auto-voter/execute-auto`

### CRON実行タイミング
| ジョブ | スケジュール | 説明 |
|--------|-------------|------|
| コメント・いいね | `*/5 * * * *` | 5分ごと（内部で間隔制御） |

### 実行ルール

#### 実行間隔
- **基本間隔**: 12分（DB設定: `interval`）
- **ゆらぎ**: ±5分（DB設定: `interval_variance`）
- **実際の間隔**: 7〜17分のランダム

#### 実行しない時間帯
- **開始時刻**: 00:00（DB設定: `no_run_start`）
- **終了時刻**: 06:00（DB設定: `no_run_end`）
- **スキップ時間**: 00:00〜06:00（JST）

#### 1回あたりの処理件数
- **処理記事数**: 1件（DB設定: `posts_per_run`）
- **コメント数**: 1件（DB設定: `comments_per_run`）

#### 記事ごとの最大コメント合計数（定数管理）
- **最大コメント数**: 50件（コード定数: `MAX_COMMENTS_PER_POST`）
- **ゆらぎ**: ±20件（コード定数: `MAX_COMMENTS_VARIANCE`）
- **実際の上限**: 30〜70件のランダム

#### コメント文字数（定数管理）
- **70%の確率**: 10〜40文字（短文）
- **30%の確率**: 40〜250文字（長文）

### 処理フロー
```
1. CRONが5分ごとにAPIを呼び出し
2. next_execution_timeをチェック
   - 未到達 → スキップ（待機中）
   - 到達 → 次回実行時刻を設定（重複防止）
3. 実行しない時間帯チェック（00:00〜06:00）
   - 該当 → スキップ
4. 優先度の高い記事を1件選択
5. コメント生成（GPT-4o-mini使用）
   - ランダムな目標文字数を生成
   - プロンプトに文字数指定を追加
6. コメントをDBに挿入
7. 次回実行時刻を計算（7〜17分後）
```

### DB設定テーブル
テーブル: `auto_commenter_liker_settings`

| setting_key | デフォルト値 | 説明 |
|-------------|-------------|------|
| interval | 12 | 実行間隔（分） |
| interval_variance | 5 | 間隔のゆらぎ（分） |
| no_run_start | 00:00 | 実行しない開始時刻 |
| no_run_end | 06:00 | 実行しない終了時刻 |
| posts_per_run | 1 | 1回あたりの処理記事数 |
| comments_per_run | 1 | 1回あたりのコメント数 |
| ai_member_probability | 70 | AIユーザー使用確率（%） |
| post_like_probability | 50 | 投稿いいね確率（%） |
| like_probability | 40 | コメントいいね確率（%） |
| comment_prompt | - | コメント生成プロンプト |
| reply_prompt | - | 返信生成プロンプト |
| next_execution_time | - | 次回実行予定時刻（自動更新） |

---

## 3. ログ管理

### ログ出力先
| ジョブ | 出力先 |
|--------|--------|
| Yahoo取得 | `/home/ubuntu/hanashite/logs/fetch-yahoo.log` |
| AI自動投稿 | syslog（`logger -t auto-creator`） |
| AI自動コメント | syslog（`logger -t auto-commenter-liker`） |

### ログ確認コマンド
```bash
# syslogでCRONレスポンスを確認
tail -f /var/log/syslog | grep -E 'auto-commenter-liker|auto-creator'

# PM2ログでアプリ内ログを確認（リアルタイム）
pm2 logs hanashite --lines 0

# PM2ログで過去ログを確認
pm2 logs hanashite --lines 500 --nostream
```

### ログローテーション
- **スケジュール**: 毎週日曜日 0:00
- **削除対象**: 30日以上経過した`.log`ファイル

---

## 4. 重複実行防止メカニズム

### 仕組み
1. CRONは短い間隔で定期的にAPIを呼び出す
2. API内部で`next_execution_time`をチェック
3. 実行時に**先に**次回実行時刻を設定（楽観的ロック）
4. これにより、同時に複数のリクエストが来ても1回のみ実行

### 実行時刻の計算
```typescript
// 次回実行時刻 = 現在時刻 + (基本間隔 ± ゆらぎ)
const minInterval = interval - intervalVariance;
const maxInterval = interval + intervalVariance;
const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);
const nextExecutionTime = new Date(now.getTime() + randomInterval * 60 * 1000);
```

---

## 5. 管理画面

### 設定ページ
- **AI自動投稿**: `/admin/auto-creator/settings`
- **AI自動コメント**: `/admin/auto-commenter-liker/settings`

### 手動実行
- **AI自動投稿**: `/admin/auto-creator` → 「手動実行」ボタン
- **AI自動コメント**: `/admin/auto-commenter-liker` → 「手動実行」ボタン

---

## 更新履歴

| 日付 | 内容 |
|------|------|
| 2026-03-27 | 初版作成 |
