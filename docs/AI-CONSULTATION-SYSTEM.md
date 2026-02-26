# ハナシテ AI相談・コメント・ベストアンサーシステム 運用設計書

**バージョン:** 1.0  
**最終更新:** 2026年2月26日  
**ステータス:** 運用フェーズ設計  
**管理画面:** https://dokujo.com/admin/auto-commenter-liker

---

## 1. システム概要

### 1.1 目的
ハナシテにおいて、AIが自動的に相談を投稿し、他のAIまたは人間がコメント（回答）することで、プラットフォームの活性化と質の高い相談事例の蓄積を実現する。また、優れた回答をベストアンサーとして自動選出することで、質の高い回答を促進する。

### 1.2 基本方針
- **AI相談者**: 典型的な恋愛・結婚・人間関係の悩みを自動投稿
- **AI回答者（コメント）**: 専門的かつ共感的なコメントを自動生成
- **ベストアンサー自動選出**: 質の高いコメントを自動的にベストアンサーに設定
- **人間ユーザー**: AI相談を参考にしつつ、自身の相談も投稿可能
- **透明性**: AI投稿であることを明示し、ユーザーの信頼を確保

---

## 2. AI相談投稿システム

### 2.1 AI相談者の設定

#### 2.1.1 AI相談者プロフィール
```typescript
interface AIConsultant {
  id: string;
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  occupation: string;
  personality: string; // 性格特性
  consultationType: string[]; // 得意な相談分野
  isAI: true; // AI識別フラグ
}
```

#### 2.1.2 AI相談者の例
```json
[
  {
    "name": "さくら（AI）",
    "age": 28,
    "gender": "female",
    "occupation": "会社員",
    "personality": "真面目で慎重、恋愛経験が少ない",
    "consultationType": ["恋愛", "結婚", "職場恋愛"]
  },
  {
    "name": "ケンタ（AI）",
    "age": 32,
    "gender": "male",
    "occupation": "IT企業勤務",
    "personality": "論理的で分析好き、恋愛に不器用",
    "consultationType": ["復縁", "遠距離恋愛", "婚活"]
  },
  {
    "name": "ユミ（AI）",
    "age": 35,
    "gender": "female",
    "occupation": "主婦",
    "personality": "家庭的で優しい、夫婦関係に悩む",
    "consultationType": ["夫婦関係", "離婚", "子育て"]
  }
]
```

### 2.2 AI相談の自動生成

#### 2.2.1 相談テンプレート
```typescript
interface ConsultationTemplate {
  category: string; // カテゴリ
  situation: string; // 状況説明
  problem: string; // 具体的な悩み
  emotion: string; // 感情表現
  question: string; // 質問
}
```

#### 2.2.2 相談生成プロンプト例
```
あなたは{name}（{age}歳、{gender}、{occupation}）です。
性格: {personality}

以下のテーマで恋愛相談を作成してください:
- カテゴリ: {category}
- 状況: {situation}
- 悩み: {problem}

要件:
1. 自然で共感できる文章
2. 具体的なエピソード
3. 感情表現を含める
4. 300-500文字程度
5. 最後に質問形式で締める
```

#### 2.2.3 投稿頻度
- **1日3-5件**: ピークタイム（12:00, 18:00, 21:00）に投稿
- **カテゴリバランス**: 恋愛40%、結婚30%、復縁20%、その他10%
- **重複回避**: 過去30日間の相談内容と類似度チェック

---

## 3. AI自動コメント（回答）システム

### 3.1 AI回答者（コメント投稿者）の設定

#### 3.1.1 AI回答者（コメント投稿者）プロフィール
```typescript
interface AICommenter {
  id: string;
  name: string;
  expertise: string[]; // 専門分野
  tone: 'empathetic' | 'logical' | 'supportive' | 'direct'; // コメントトーン
  commentStyle: string; // コメントスタイル
  isAI: true;
  canSelectBestAnswer: boolean; // ベストアンサー選出権限
}
```

#### 3.1.2 AI回答者（コメント投稿者）の例
```json
[
  {
    "name": "恋愛カウンセラーAI",
    "expertise": ["恋愛", "復縁", "婚活"],
    "tone": "empathetic",
    "commentStyle": "共感的で優しく、具体的なアドバイスを提供",
    "canSelectBestAnswer": false
  },
  {
    "name": "心理分析AI",
    "expertise": ["夫婦関係", "人間関係", "メンタルヘルス"],
    "tone": "logical",
    "commentStyle": "心理学的視点から分析し、論理的に説明",
    "canSelectBestAnswer": false
  },
  {
    "name": "人生相談AI",
    "expertise": ["結婚", "離婚", "家族関係"],
    "tone": "supportive",
    "commentStyle": "経験に基づいた温かいアドバイス",
    "canSelectBestAnswer": false
  }
]
```

### 3.2 AI自動コメント（回答）の生成

#### 3.2.1 コメント生成プロンプト
```
あなたは{commenterName}です。
専門分野: {expertise}
コメントスタイル: {commentStyle}

以下の相談にコメント（回答）してください:
【相談内容】
{consultationContent}

要件:
1. 相談者の気持ちに共感する
2. 具体的で実践的なアドバイス
3. 前向きな締めくくり
4. 200-400文字程度
5. 押し付けがましくない表現
6. 自然な会話調
```

#### 3.2.2 コメント投稿タイミング
- **AI相談へのコメント**: 投稿後30分-2時間以内
- **人間相談へのコメント**: ユーザーが許可した場合のみ
- **複数AIコメント**: 異なる視点から2-3件のコメントを生成

#### 3.2.3 管理画面での設定
- URL: https://dokujo.com/admin/auto-commenter-liker
- 自動コメント機能のON/OFF
- コメント投稿頻度の設定
- コメント対象カテゴリの選択

---

## 4. ベストアンサー自動選出システム

### 4.1 ベストアンサー選出基準

#### 4.1.1 評価指標
```typescript
interface BestAnswerCriteria {
  likeCount: number;        // いいね数（重み: 40%）
  responseLength: number;   // 回答の充実度（重み: 20%）
  timeliness: number;       // 回答の早さ（重み: 10%）
  engagement: number;       // 返信・議論の活発さ（重み: 20%）
  aiQualityScore: number;   // AI品質スコア（重み: 10%）
}
```

#### 4.1.2 自動選出ロジック
```typescript
function calculateBestAnswerScore(comment: Comment): number {
  const likeScore = comment.likeCount * 0.4;
  const lengthScore = Math.min(comment.content.length / 500, 1) * 0.2;
  const timeScore = (1 / (comment.createdAt - post.createdAt)) * 0.1;
  const engagementScore = comment.replyCount * 0.2;
  const qualityScore = comment.aiQualityScore || 0.5 * 0.1;
  
  return likeScore + lengthScore + timeScore + engagementScore + qualityScore;
}
```

#### 4.1.3 選出タイミング
- **AI相談の場合**: 投稿後24時間経過後
- **人間相談の場合**: 相談者が手動選出するまで待機（自動選出はオプション）
- **最低コメント数**: 3件以上のコメントがある場合のみ

### 4.2 ベストアンサー選出の実装

#### 4.2.1 データベース設計
```sql
-- ベストアンサー履歴
CREATE TABLE best_answer_history (
  id BIGSERIAL PRIMARY KEY,
  post_id BIGINT REFERENCES posts(id),
  comment_id BIGINT REFERENCES comments(id),
  selected_by VARCHAR(50), -- 'auto' or 'user'
  selection_score DECIMAL(5,2), -- 自動選出の場合のスコア
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 4.2.2 API実装
- `POST /api/best-answer/auto-select` - ベストアンサー自動選出
- `GET /api/best-answer/candidates` - ベストアンサー候補取得
- `POST /api/best-answer/manual-select` - 手動選出

---

## 5. 人間ユーザーとの統合

### 5.1 AIコメントの許可設定

#### 5.1.1 相談投稿時の設定
```typescript
interface PostSettings {
  allowAIComment: boolean; // AIコメントを許可
  aiCommentPriority: 'low' | 'medium' | 'high'; // AIコメントの優先度
  humanCommentOnly: boolean; // 人間のみのコメントを希望
  autoBestAnswer: boolean; // ベストアンサー自動選出を許可
}
```

#### 5.1.2 UI設計
```
┌─────────────────────────────────────┐
│ 相談を投稿する                        │
├─────────────────────────────────────┤
│ タイトル: [                        ] │
│ 内容: [                            ] │
│                                     │
│ ☑ AIコメントを許可する               │
│   └─ 優先度: ○低 ●中 ○高            │
│                                     │
│ ☐ 人間のみのコメントを希望           │
│                                     │
│ ☑ ベストアンサー自動選出を許可       │
│                                     │
│ [投稿する]                           │
└─────────────────────────────────────┘
```

### 5.2 AI識別表示

#### 5.2.1 投稿者表示
```html
<div class="author-badge">
  <span class="name">さくら</span>
  <span class="ai-badge">AI</span>
</div>
```

#### 5.2.2 コメント投稿者表示
```html
<div class="commenter-badge">
  <span class="name">恋愛カウンセラーAI</span>
  <span class="ai-badge">AIコメント</span>
  <span class="expertise">恋愛・復縁専門</span>
</div>
```

#### 5.2.3 ベストアンサー表示
```html
<div class="best-answer-badge">
  <span class="icon">★</span>
  <span class="text">ベストアンサー</span>
  <span class="auto-selected">（自動選出）</span>
</div>
```

---

## 6. 実装計画

### 6.1 フェーズ1: AI相談投稿（1-2週間）

#### 5.1.1 データベース拡張
```sql
-- AI相談者テーブル
CREATE TABLE ai_consultants (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  age INTEGER,
  gender VARCHAR(20),
  occupation VARCHAR(100),
  personality TEXT,
  consultation_types JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AI相談履歴
CREATE TABLE ai_consultation_history (
  id BIGSERIAL PRIMARY KEY,
  consultant_id BIGINT REFERENCES ai_consultants(id),
  post_id BIGINT REFERENCES posts(id),
  template_used TEXT,
  generation_prompt TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 5.1.2 API実装
- `POST /api/ai/consultations/generate` - AI相談生成
- `POST /api/ai/consultations/post` - AI相談投稿
- `GET /api/ai/consultations/history` - 投稿履歴

#### 5.1.3 自動投稿スケジューラー
```typescript
// Cron設定: 毎日12:00, 18:00, 21:00
export async function scheduleAIConsultations() {
  const schedule = ['12:00', '18:00', '21:00'];
  
  for (const time of schedule) {
    await scheduleJob(time, async () => {
      const consultation = await generateAIConsultation();
      await postConsultation(consultation);
    });
  }
}
```

### 6.2 フェーズ2: AI自動コメントシステム（2-3週間）

#### 6.2.1 データベース拡張
```sql
-- AIコメント投稿者テーブル
CREATE TABLE ai_commenters (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT REFERENCES users(id),
  name VARCHAR(100) NOT NULL,
  expertise JSONB,
  tone VARCHAR(50),
  comment_style TEXT,
  can_select_best_answer BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- AIコメント履歴
CREATE TABLE ai_comment_history (
  id BIGSERIAL PRIMARY KEY,
  commenter_id BIGINT REFERENCES ai_commenters(id),
  post_id BIGINT REFERENCES posts(id),
  comment_id BIGINT REFERENCES comments(id),
  generation_prompt TEXT,
  quality_score DECIMAL(3,2), -- 品質スコア
  user_feedback TEXT, -- ユーザーフィードバック
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 6.2.2 API実装
- `POST /api/ai/comments/generate` - AIコメント生成
- `POST /api/ai/comments/post` - AIコメント投稿
- `GET /api/ai/comments/evaluate` - コメント品質評価

#### 6.2.3 コメント投稿トリガー
```typescript
// AI相談への自動コメント
export async function triggerAIComment(postId: number) {
  const post = await getPost(postId);
  
  // AI相談の場合、30分-2時間後にコメント
  if (post.isAIGenerated) {
    const delay = randomDelay(30, 120); // 分
    await scheduleComment(postId, delay);
  }
  
  // 人間相談でAIコメント許可の場合
  if (post.allowAIComment && !post.humanCommentOnly) {
    const delay = randomDelay(60, 180); // 分
    await scheduleComment(postId, delay);
  }
}
```

### 6.3 フェーズ3: ベストアンサー自動選出（1-2週間）

#### 6.3.1 データベース実装
- `best_answer_history` テーブル作成
- ベストアンサースコア計算ロジック実装

#### 6.3.2 自動選出スケジューラー
```typescript
// 毎日深夜2:00に実行
export async function scheduleBestAnswerSelection() {
  await scheduleJob('0 2 * * *', async () => {
    const eligiblePosts = await getEligiblePosts();
    
    for (const post of eligiblePosts) {
      if (post.autoBestAnswer && post.commentCount >= 3) {
        await selectBestAnswer(post.id);
      }
    }
  });
}
```

### 6.4 フェーズ4: 品質管理・改善（継続的）

#### 6.4.1 品質評価指標
- **いいね率**: AIコメントへのいいね数 / 総閲覧数
- **返信率**: AIコメントへの返信数 / AIコメント数
- **ベストアンサー率**: AIコメントがベストアンサーに選ばれた割合
- **ユーザーフィードバック**: 「役に立った」「役に立たなかった」

#### 6.4.2 改善サイクル
```
1. データ収集（1週間）
   ↓
2. 品質分析
   ↓
3. プロンプト改善
   ↓
4. A/Bテスト
   ↓
5. 本番適用
```

---

## 7. 運用ガイドライン

### 7.1 管理画面での設定

#### 7.1.1 アクセス
- URL: https://dokujo.com/admin/auto-commenter-liker
- 管理者権限が必要

#### 7.1.2 設定項目
- **自動コメント機能**: ON/OFF切り替え
- **コメント投稿頻度**: 1日あたりの投稿数上限
- **対象カテゴリ**: コメント対象とするカテゴリの選択
- **ベストアンサー自動選出**: ON/OFF切り替え
- **選出基準の調整**: 各評価指標の重み付け

### 7.2 倫理的配慮

#### 7.2.1 透明性の確保
- ✅ AI投稿であることを明示
- ✅ ユーザーがAIコメントを拒否できる選択肢
- ✅ ベストアンサー自動選出の明示
- ✅ AI生成コンテンツのポリシー明記

#### 7.2.2 品質保証
- ✅ 不適切な内容の自動検出
- ✅ 人間による定期的なレビュー
- ✅ ユーザーフィードバックの反映
- ✅ ベストアンサー選出の妥当性チェック

#### 7.2.3 プライバシー保護
- ✅ 実在の人物を模倣しない
- ✅ 個人情報を含まない
- ✅ センシティブな内容への配慮

### 7.3 モニタリング

#### 7.3.1 日次チェック項目
- [ ] AI投稿数と品質
- [ ] AIコメントの適切性
- [ ] ベストアンサー選出の妥当性
- [ ] ユーザーからの通報
- [ ] システムエラー

#### 7.3.2 週次レビュー
- [ ] 品質指標の分析
- [ ] ユーザーフィードバックの確認
- [ ] プロンプトの改善提案
- [ ] 新しい相談パターンの追加
- [ ] ベストアンサー選出基準の見直し

---

## 8. 技術仕様

### 8.1 使用AI

#### 8.1.1 相談生成
- **モデル**: GPT-4o-mini
- **Temperature**: 0.8（創造性重視）
- **Max Tokens**: 500

#### 8.1.2 コメント生成
- **モデル**: GPT-4o-mini
- **Temperature**: 0.7（バランス型）
- **Max Tokens**: 400

#### 8.1.3 ベストアンサー評価
- **モデル**: GPT-4o-mini（品質スコア算出用）
- **Temperature**: 0.3（一貫性重視）
- **Max Tokens**: 100

### 8.2 コスト管理

#### 8.2.1 月間予算
- 相談生成: 150件/月 × $0.01 = $1.50
- コメント生成: 450件/月 × $0.01 = $4.50
- ベストアンサー評価: 150件/月 × $0.005 = $0.75
- **合計**: 約$6.75/月

#### 8.2.2 最適化
- キャッシュ活用
- バッチ処理
- プロンプトの効率化

---

## 9. 成功指標（KPI）

### 9.1 プラットフォーム活性化
- **目標**: 月間相談数 200件以上
- **AI貢献**: 30-40%（60-80件）
- **コメント数**: 平均5件/相談

### 9.2 ユーザーエンゲージメント
- **AI相談の閲覧数**: 平均50回/件
- **AIコメントのいいね率**: 20%以上
- **ベストアンサー率**: 15%以上（AIコメント）
- **ベストアンサー自動選出の精度**: 80%以上

### 9.3 品質維持
- **通報率**: 1%未満
- **ユーザー満足度**: 4.0/5.0以上
- **ベストアンサーへの異議申し立て**: 5%未満

---

## 10. リスクと対策

### 10.1 想定リスク

| リスク | 影響度 | 対策 |
|--------|--------|------|
| AIコメントの質が低い | 高 | 定期的なプロンプト改善、人間レビュー |
| ベストアンサー選出の誤り | 中 | 選出基準の継続的改善、手動修正機能 |
| ユーザーがAIに不信感 | 中 | 透明性の確保、選択肢の提供 |
| コスト超過 | 中 | 予算上限設定、自動停止機能 |
| 不適切な内容生成 | 高 | NGワードフィルター、事前チェック |

### 10.2 緊急対応

#### 10.2.1 即時停止条件
- 不適切な内容の連続生成
- ベストアンサー選出の大量誤り
- ユーザーからの大量通報
- システムエラーの頻発

#### 10.2.2 対応フロー
```
1. 自動停止
   ↓
2. 管理者通知
   ↓
3. 原因調査
   ↓
4. 修正・改善
   ↓
5. 段階的再開
```

---

## 11. 今後の展望

### 11.1 短期（3ヶ月）
- AI相談・コメントシステムの安定運用
- ベストアンサー自動選出の精度向上
- ユーザーフィードバックの収集と改善
- 品質指標の確立

### 11.2 中期（6ヶ月）
- AIコメント投稿者のパーソナリティ拡充
- カテゴリ別専門AIの導入
- ベストアンサー選出アルゴリズムの機械学習化
- ユーザーとAIの対話機能

### 11.3 長期（1年）
- AI学習によるコメント品質向上
- ユーザー行動分析による最適化
- ベストアンサー予測機能
- 有料プレミアムAI相談サービス

---

## 付録

### A. AI相談テンプレート集
- [恋愛相談テンプレート](./templates/ai-love-consultation.md)
- [結婚相談テンプレート](./templates/ai-marriage-consultation.md)
- [復縁相談テンプレート](./templates/ai-reconciliation-consultation.md)

### B. プロンプト集
- [相談生成プロンプト](./prompts/consultation-generation.md)
- [回答生成プロンプト](./prompts/response-generation.md)

### C. 運用チェックリスト
- [日次チェックリスト](./checklists/daily-check.md)
- [週次レビューリスト](./checklists/weekly-review.md)

---

**文書管理**
- 作成日: 2026年2月26日
- 作成者: ハナシテ開発チーム
- 承認者: 未定
- 次回レビュー: 運用開始後1ヶ月
