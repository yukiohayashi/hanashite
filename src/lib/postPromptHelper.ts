// AI投稿記事の自然化：構造化プロンプトヘルパー

export interface PostPersona {
  name: string;
  ageRange: string;
  tone: string;
  emojiProbability: number;
  emojiCount: [number, number];
  characteristic: string;
}

export interface PostPattern {
  name: string;
  weight: number;
  structure: string;
}

export interface OpeningPattern {
  name: string;
  weight: number;
  examples: string[];
}

// 投稿者ペルソナ定義
export const POST_PERSONAS: PostPersona[] = [
  {
    name: '若い学生',
    ageRange: '16-22歳',
    tone: 'カジュアル寄りの丁寧語',
    emojiProbability: 0.5,
    emojiCount: [1, 2],
    characteristic: '「〜なんです」「〜って感じで」多用、記号「、、、」「…」「汗」'
  },
  {
    name: '社会人',
    ageRange: '23-30歳',
    tone: '丁寧語',
    emojiProbability: 0.3,
    emojiCount: [0, 1],
    characteristic: '具体的な状況説明が多い、記号「…」「！」'
  },
  {
    name: '既婚者',
    ageRange: '28-40歳',
    tone: '落ち着いた丁寧語',
    emojiProbability: 0.1,
    emojiCount: [0, 0],
    characteristic: '冷静な分析、長めの文章、記号「…」のみ'
  }
];

// 冒頭パターン定義
export const POST_OPENING_PATTERNS: OpeningPattern[] = [
  { 
    name: '直接本題', 
    weight: 40, 
    examples: ['彼氏が〜', '職場で〜', '夫が〜'] 
  },
  { 
    name: '軽い前置き', 
    weight: 30, 
    examples: ['相談させてください', '聞いてほしいことがあります', '悩んでいることがあります'] 
  },
  { 
    name: '感情表現', 
    weight: 20, 
    examples: ['正直に言うと〜', '実は〜', '本当に困っています'] 
  },
  { 
    name: '質問形式', 
    weight: 10, 
    examples: ['皆さんならどうしますか', 'アドバイスをいただきたいです', 'どうしたらいいでしょうか'] 
  }
];

// 本文構造パターン定義
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

// 文字数範囲定義
interface LengthRange {
  min: number;
  max: number;
  weight: number;
}

const LENGTH_RANGES: LengthRange[] = [
  { min: 100, max: 150, weight: 20 },
  { min: 150, max: 250, weight: 60 },
  { min: 250, max: 350, weight: 20 }
];

// 重み付きランダム選択
function weightedRandom<T extends { weight: number }>(items: T[]): T {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;
  
  for (const item of items) {
    random -= item.weight;
    if (random <= 0) {
      return item;
    }
  }
  
  return items[items.length - 1];
}

// ユーザープロフィールからペルソナを選択
export function selectPostPersonaFromProfile(
  age: number | null, 
  marriage: string | null
): PostPersona {
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
  openingPattern: OpeningPattern;
  structurePattern: PostPattern;
  targetLength: number;
} {
  const persona = selectPostPersonaFromProfile(userAge, userMarriage);
  const structurePattern = weightedRandom(POST_STRUCTURE_PATTERNS);
  const openingPattern = weightedRandom(POST_OPENING_PATTERNS);
  
  // 文字数をランダムに決定
  const selectedRange = weightedRandom(LENGTH_RANGES);
  const targetLength = Math.floor(
    Math.random() * (selectedRange.max - selectedRange.min + 1) + selectedRange.min
  );
  
  const prompt = `
# あなたのペルソナ
${persona.name}（${persona.ageRange}）
文体: ${persona.tone}
特徴: ${persona.characteristic}

# 元の質問
タイトル: ${originalTitle}
本文: ${originalContent}

# 出力ルール

## 冒頭パターン
「${openingPattern.name}」を使用
例: ${openingPattern.examples.join('、')}

## 本文構造
${structurePattern.name}: ${structurePattern.structure}

## 目標文字数
${targetLength}文字前後

## 文体・表現
- ${persona.tone}を使用
- 丁寧語（です・ます調）必須
- **改行ルール（重要）**:
  * 規則的な改行は避ける（2文ごと、3文ごとなど機械的なパターンは禁止）
  * 話題が変わるタイミングで改行
  * 感情の転換点で改行
  * 長い文の後は改行を入れる
  * 短い文が続く場合は改行せずに続ける
  * 全体で2-4回程度の改行（150-300文字の場合）
- 絵文字: ${persona.emojiProbability * 100}%の確率で最大${persona.emojiCount[1]}個まで（💦😊💕😢🥺など）
  ※絵文字を使う場合でも控えめに。同じ絵文字の重複使用禁止
- 記号: ${persona.characteristic.includes('記号') ? persona.characteristic.split('記号')[1] : '「…」「！」を適度に使用'}
  ※「汗」などの文字記号は使わない（絵文字💦で代用）

## タイトル作成
- 20-40文字程度
- 体言止めは使わない（「〜の私」ではなく「〜ます」「〜でしょうか」「〜ませんか」で終わる）
- 元のタイトルとは異なる表現で作成
- **自然で親しみやすい表現を使う**
  ○ 良い例: 「結婚相談所で出会った彼、恋愛感情が湧かないけど大丈夫でしょうか」
  ○ 良い例: 「条件重視で選んだ相手、恋愛感情って後から芽生えますか？」
  × 悪い例: 「結婚相談所での成婚後、恋愛感情は必要なの？」（硬すぎる）
  × 悪い例: 「結婚相談所における恋愛感情の必要性について」（論文調）

## 本文作成の重要ポイント
1. **元の質問文をそのまま使わず、内容を理解した上で全く新しい文章として作り直す**
2. **リライト率50%以上必須**: 元の単語や表現を50%以上変更する
3. **元の文章の冒頭1-2文は絶対にそのまま使わない**
4. **感情的でくだけた表現を積極的に使う**:
   ○ 「よく〜って言いますが」「〜だよね」などの口語
   ○ 「ちょっと」「なんか」「やっぱり」などのくだけた言葉
   ○ 「〜じゃん」「〜かな」などのカジュアルな語尾（丁寧語と混ぜて使う）
   ○ 感情を表す言葉：「モヤモヤ」「ドキドキ」「イライラ」など
5. **口語的で自然な表現を優先**:
   ○ 「普通」「ふつう」（× 「一般的」「通常」）
   ○ 「〜の方」「〜な方」（× 「〜の人」「異性」）
   ○ 「握手を求められ」（× 「握手の手を出され」）
   ○ 「〜くらいの」（× 「〜の」）
   ○ 「受付のアルバイト中」など具体的な状況を追加
6. **理路整然とした説明を避ける**:
   ○ 文章の流れを自然に、思いついた順に書く
   ○ 「まず」「次に」「そして」などの論理的な接続詞を避ける
   ○ 話が少し脱線したり、戻ったりする自然な流れを作る
   ○ 人間らしさを出すため、軽微な誤字脱字（例：「思う」→「思お」など）があっても構わない
7. 自然で読みやすい文章を最優先
8. 「最近」は1記事に1回まで（全体の30%程度に抑える）
9. 具体的なエピソードは残すが、説明の仕方を大幅に変える（時系列を変える、詳細を追加、視点を変える）
10. 感情や心情を丁寧に描写し、共感を呼ぶ表現にする
11. **元の質問にない背景情報や心情、具体例を積極的に追加する**（「受付のアルバイト中」「70歳くらいの」など）
12. 「〜なんです」「〜でしょうか」「〜ました」など柔らかく丁寧な語尾を使う
13. ブログや日記のような親密さと丁寧さを両立させる
14. 元の質問がわからないレベルまで大幅に変更する
15. **質問は具体的で実用的に**（「上に報告すべきでしょうか」など行動を問う形式）

## 禁止事項
- 元の文章をそのままコピー（特に冒頭1-2文）
- 「最近」の連続使用
- 「聞いてください」の多用
- 体言止め（「〜の私」など）
- **AI臭い表現**（「確かに」「素敵」「〜について」「〜に関して」「理解できます」など）
- **論理的すぎる文章構成**（「まず」「次に」「そして」「最後に」などの接続詞の多用）
- **説明的すぎる表現**（「〜ということです」「〜と考えられます」など）
- 絵文字の過剰使用（3個以上は絶対禁止）
- 同じ絵文字の重複使用
- 「汗」「笑」などの文字記号（絵文字で代用すること）
- **規則的な改行**（2文ごと、3文ごとなど機械的なパターン）
- **硬い表現**（「一般的」「通常」「異性」「〜における」「〜に際して」など）
- **不自然な言い回し**（「握手の手を出され」「背景をお話しします」など）
- **曖昧な質問**（「何かを感じることはあるのでしょうか」など抽象的すぎる質問）

# 出力形式
タイトル: [新しいタイトル]
本文: [書き直した本文]
`.trim();

  return { 
    prompt, 
    persona, 
    openingPattern, 
    structurePattern, 
    targetLength 
  };
}
