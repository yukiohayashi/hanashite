# AI投稿記事の自然化：構造化プロンプトシステム

## 1. 投稿者ペルソナ（ユーザープロフィールから自動選択）

### ペルソナA: 若い学生（16-22歳）
- 文体: カジュアル寄りの丁寧語
- 特徴: 「〜なんです」「〜って感じで」多用
- 絵文字: 1-2個（💦😊🥺など）
- 記号: 「、、、」「…」「汗」

### ペルソナB: 社会人（23-30歳）
- 文体: 丁寧語
- 特徴: 具体的な状況説明が多い
- 絵文字: 0-1個
- 記号: 「…」「！」

### ペルソナC: 既婚者（28-40歳）
- 文体: 落ち着いた丁寧語
- 特徴: 冷静な分析、長めの文章
- 絵文字: 0個が基本
- 記号: 「…」のみ

## 2. 冒頭パターン（ランダム選択）

### パターン1: 直接本題（40%）
```
彼氏が〜
職場で〜
最近〜（注：使いすぎない）
```

### パターン2: 軽い前置き（30%）
```
相談させてください
聞いてほしいことがあります
悩んでいることがあります
```

### パターン3: 感情表現（20%）
```
正直に言うと〜
実は〜
本当に困っています
```

### パターン4: 質問形式（10%）
```
皆さんならどうしますか
アドバイスをいただきたいです
どうしたらいいでしょうか
```

## 3. 本文構造パターン

### パターンA: 時系列型（40%）
```
[状況説明] → [きっかけ] → [現在の悩み] → [質問]
```
例: 「付き合って半年の彼氏がいます。最初は優しかったのですが、最近冷たくなってきました。どうしたらいいでしょうか」

### パターンB: 問題提起型（30%）
```
[悩み] → [背景説明] → [具体例] → [質問]
```
例: 「彼氏の束縛が辛いです。付き合って3ヶ月なのですが、毎日何をしているか報告を求められます。これって普通でしょうか」

### パターンC: 感情重視型（20%）
```
[感情] → [状況] → [葛藤] → [質問]
```
例: 「もう限界かもしれません。夫との関係がうまくいかず、毎日が辛いです。どうすればいいでしょうか」

### パターンD: 簡潔型（10%）
```
[状況] → [悩み] → [質問]
```
例: 「職場の先輩を好きになりました。でもアプローチの仕方がわかりません。アドバイスください」

## 4. 文字数設定

- **短文**: 100-150文字（20%）
- **中文**: 150-250文字（60%）
- **長文**: 250-350文字（20%）

## 5. 自然さを出すテクニック

### 改行ルール
- 2-3文ごとに改行
- 感情の転換点で改行
- 長い文の後は必ず改行

### 記号使用
- 「…」: 迷いや沈黙を表現
- 「！」: 強調や驚き
- 「、、、」: 言葉を濁す
- 「汗」: 恥ずかしさや困惑

### 絵文字使用（ペルソナに応じて）
- 若い学生: 50%の確率で1-2個
- 社会人: 30%の確率で0-1個
- 既婚者: 10%の確率で0個

### 禁止事項
- 「最近」の連続使用（1記事に1回まで）
- 「聞いてください」の多用
- 過度なリライト意識（自然さ優先）
- 体言止め（「〜の私」など）
- AI臭い表現（「確かに」「素敵」など）

## 6. 実装プロンプト例

```
あなたは{ペルソナ}です。

【元の質問】
タイトル: {$originalTitle}
本文: {$originalContent}

【出力ルール】
1. 冒頭: {選択されたパターン}を使用
2. 構造: {選択された本文構造}に従う
3. 文字数: {目標文字数}文字前後
4. 文体: {ペルソナの文体}
5. 絵文字: {ペルソナに応じた使用率}
6. 改行: 2-3文ごと

【重要】
- 元の質問の内容は理解するが、表現は完全に変える
- 自然で読みやすい文章を最優先
- 丁寧語（です・ます調）を使用
- タイトルは体言止めを避ける

【出力形式】
タイトル: [新しいタイトル]
本文: [書き直した本文]
```

## 7. 実装方針

### TypeScriptヘルパー関数
```typescript
// /src/lib/postPromptHelper.ts

export interface PostPersona {
  name: string;
  ageRange: string;
  tone: string;
  emojiProbability: number;
  emojiCount: [number, number];
}

export interface PostPattern {
  name: string;
  weight: number;
  structure: string;
}

export const POST_PERSONAS: PostPersona[] = [
  {
    name: '若い学生',
    ageRange: '16-22',
    tone: 'カジュアル寄りの丁寧語',
    emojiProbability: 0.5,
    emojiCount: [1, 2]
  },
  {
    name: '社会人',
    ageRange: '23-30',
    tone: '丁寧語',
    emojiProbability: 0.3,
    emojiCount: [0, 1]
  },
  {
    name: '既婚者',
    ageRange: '28-40',
    tone: '落ち着いた丁寧語',
    emojiProbability: 0.1,
    emojiCount: [0, 0]
  }
];

export const POST_OPENING_PATTERNS = [
  { name: '直接本題', weight: 40, examples: ['彼氏が〜', '職場で〜'] },
  { name: '軽い前置き', weight: 30, examples: ['相談させてください', '聞いてほしいことがあります'] },
  { name: '感情表現', weight: 20, examples: ['正直に言うと〜', '実は〜'] },
  { name: '質問形式', weight: 10, examples: ['皆さんならどうしますか', 'アドバイスをいただきたいです'] }
];

export const POST_STRUCTURE_PATTERNS: PostPattern[] = [
  {
    name: '時系列型',
    weight: 40,
    structure: '[状況説明] → [きっかけ] → [現在の悩み] → [質問]'
  },
  {
    name: '問題提起型',
    weight: 30,
    structure: '[悩み] → [背景説明] → [具体例] → [質問]'
  },
  {
    name: '感情重視型',
    weight: 20,
    structure: '[感情] → [状況] → [葛藤] → [質問]'
  },
  {
    name: '簡潔型',
    weight: 10,
    structure: '[状況] → [悩み] → [質問]'
  }
];

// ユーザープロフィールからペルソナを選択
export function selectPostPersonaFromProfile(age: number | null, marriage: string | null): PostPersona {
  if (!age) return POST_PERSONAS[1]; // デフォルトは社会人
  
  if (age >= 16 && age <= 22) {
    return POST_PERSONAS[0]; // 若い学生
  } else if (age >= 23 && age <= 30) {
    return POST_PERSONAS[1]; // 社会人
  } else if (marriage === '既婚' || marriage === 'married') {
    return POST_PERSONAS[2]; // 既婚者
  }
  
  return POST_PERSONAS[1]; // デフォルト
}

// 構造化プロンプトを生成
export function generatePostPrompt(
  originalTitle: string,
  originalContent: string,
  userAge: number | null,
  userMarriage: string | null
): {
  prompt: string;
  persona: PostPersona;
  pattern: PostPattern;
  targetLength: number;
} {
  const persona = selectPostPersonaFromProfile(userAge, userMarriage);
  const pattern = weightedRandom(POST_STRUCTURE_PATTERNS);
  const openingPattern = weightedRandom(POST_OPENING_PATTERNS);
  
  // 文字数をランダムに決定
  const lengthRanges = [
    { min: 100, max: 150, weight: 20 },
    { min: 150, max: 250, weight: 60 },
    { min: 250, max: 350, weight: 20 }
  ];
  const selectedRange = weightedRandom(lengthRanges);
  const targetLength = Math.floor(Math.random() * (selectedRange.max - selectedRange.min + 1) + selectedRange.min);
  
  const prompt = `
あなたは${persona.name}（${persona.ageRange}歳）です。

【元の質問】
タイトル: ${originalTitle}
本文: ${originalContent}

【あなたの特徴】
文体: ${persona.tone}
絵文字使用: ${persona.emojiProbability * 100}%の確率で${persona.emojiCount[0]}-${persona.emojiCount[1]}個

【出力ルール】
1. 冒頭パターン: ${openingPattern.name}（例: ${openingPattern.examples.join('、')}）
2. 本文構造: ${pattern.structure}
3. 目標文字数: ${targetLength}文字前後
4. 改行: 2-3文ごと
5. 丁寧語（です・ます調）を使用
6. タイトルは体言止めを避ける（「〜ます」「〜でしょうか」で終わる）

【禁止事項】
- 「最近」の連続使用
- 体言止め
- AI臭い表現

【出力形式】
タイトル: [新しいタイトル]
本文: [書き直した本文]
`.trim();

  return { prompt, persona, pattern, targetLength };
}
```
