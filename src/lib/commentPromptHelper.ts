// AI生成感を減らす構造化プロンプトヘルパー

export interface Persona {
  name: string;
  weight: number;
  age: string;
  tone: string;
  characteristic: string;
}

export interface CommentPattern {
  name: string;
  weight: number;
  minLength: number;
  maxLength: number;
  structure: string;
}

// ペルソナ定義
export const PERSONAS: Persona[] = [
  {
    name: '現実派既婚者',
    weight: 30,
    age: '32-38歳',
    tone: '丁寧語ベース（〜ですね、〜ますよ）、時々カジュアル（〜だよね）',
    characteristic: '経験から語る、理想論は言わない'
  },
  {
    name: '恋愛経験豊富な独身',
    weight: 40,
    age: '28-35歳',
    tone: '丁寧語メイン（〜です、〜ます）、親しみやすい表現',
    characteristic: '共感力高い、でも現実的'
  },
  {
    name: '辛口アドバイザー',
    weight: 20,
    age: '35-42歳',
    tone: '丁寧語で本音を言う（〜だと思いますよ、〜ですね）',
    characteristic: '綺麗事言わない、ズバッと言う'
  },
  {
    name: '若手共感型',
    weight: 10,
    age: '24-28歳',
    tone: '丁寧語ベース（〜です、〜ます）、絵文字で柔らかく',
    characteristic: '感情的、でも優しい'
  }
];

// コメントパターン定義
export const COMMENT_PATTERNS: CommentPattern[] = [
  {
    name: '超短文',
    weight: 25,
    minLength: 10,
    maxLength: 30,
    structure: '[一言] それ〜 / え〜 / うーん〜'
  },
  {
    name: '体験談ベース',
    weight: 20,
    minLength: 80,
    maxLength: 120,
    structure: '[導入] 私も/友達が/昔 → [体験] 〜だったんだけど → [結論] 結局〜だった → [アドバイス] だから〜した方がいいかも'
  },
  {
    name: '質問返し',
    weight: 20,
    minLength: 20,
    maxLength: 40,
    structure: '[疑問] それって〜ってこと？ → [確認] 相手は何て言ってるの？'
  },
  {
    name: '直球アドバイス',
    weight: 20,
    minLength: 40,
    maxLength: 80,
    structure: '[前置き] 正直/個人的には → [本音] 〜だと思う → [理由] だって〜じゃん'
  },
  {
    name: '共感+現実',
    weight: 15,
    minLength: 50,
    maxLength: 90,
    structure: '[共感] わかる/気持ちはわかるけど → [転換] でも/ただ → [現実] 〜だよね'
  }
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

// ペルソナをランダム選択
export function selectPersona(): Persona {
  return weightedRandom(PERSONAS);
}

// ユーザープロフィールからペルソナを決定
export function selectPersonaFromProfile(
  gender: string | null,
  age: number | null,
  marriage: string | null
): Persona {
  // 性別が女性以外の場合はランダム
  if (!gender || gender !== '女性') {
    return selectPersona();
  }

  // 年齢ベースでペルソナを選択
  if (age) {
    // 24-28歳: 若手共感型
    if (age >= 24 && age <= 28) {
      return PERSONAS[3]; // 若手共感型
    }
    
    // 28-35歳: 恋愛経験豊富な独身
    if (age >= 28 && age <= 35) {
      // 既婚の場合は現実派既婚者
      if (marriage === '既婚') {
        return PERSONAS[0]; // 現実派既婚者
      }
      return PERSONAS[1]; // 恋愛経験豊富な独身
    }
    
    // 32-38歳: 現実派既婚者 or 恋愛経験豊富な独身
    if (age >= 32 && age <= 38) {
      if (marriage === '既婚') {
        return PERSONAS[0]; // 現実派既婚者
      }
      return PERSONAS[1]; // 恋愛経験豊富な独身
    }
    
    // 35-42歳: 辛口アドバイザー
    if (age >= 35 && age <= 42) {
      // 離婚経験ありまたは長期独身
      if (marriage === '離婚' || marriage === '独身') {
        return PERSONAS[2]; // 辛口アドバイザー
      }
      return PERSONAS[0]; // 現実派既婚者
    }
    
    // 42歳以上: 辛口アドバイザー
    if (age > 42) {
      return PERSONAS[2]; // 辛口アドバイザー
    }
  }

  // デフォルトはランダム
  return selectPersona();
}

// コメントパターンをランダム選択
export function selectCommentPattern(): CommentPattern {
  return weightedRandom(COMMENT_PATTERNS);
}

// 深刻度判定
export function analyzeSeverity(title: string, content: string): '軽' | '中' | '重' {
  const text = (title + content).toLowerCase();
  
  // 重度のキーワード
  if (/浮気|不倫|dv|暴力|別れたい|離婚|モラハラ|束縛/.test(text)) {
    return '重';
  }
  
  // 中度のキーワード
  if (/連絡|喧嘩|マンネリ|冷たい|会えない|忙しい|不安|心配/.test(text)) {
    return '中';
  }
  
  // 軽度（デフォルト）
  return '軽';
}

// 感情判定
export function analyzeEmotion(title: string, content: string): '不安' | '怒り' | '迷い' | '喜び' {
  const text = (title + content).toLowerCase();
  
  if (/嬉しい|幸せ|楽しい|ドキドキ/.test(text)) {
    return '喜び';
  }
  
  if (/ひどい|許せない|腹立つ|ムカつく/.test(text)) {
    return '怒り';
  }
  
  if (/どうしたら|わからない|悩|迷/.test(text)) {
    return '迷い';
  }
  
  // デフォルトは不安
  return '不安';
}

// 絵文字を追加するか判定（20%の確率 = 5回に1回）
export function shouldAddEmoji(): boolean {
  return Math.random() < 0.20;
}

// 自然な誤字・ら抜き・い抜き言葉を適用（15%の確率）
export function applyNaturalErrors(text: string): string {
  // 15%の確率で適用
  if (Math.random() > 0.15) {
    return text;
  }

  const errorPatterns = [
    // ら抜き言葉（可能の「られる」→「れる」）
    { pattern: /見られる/g, replacement: '見れる' },
    { pattern: /食べられる/g, replacement: '食べれる' },
    { pattern: /考えられる/g, replacement: '考えれる' },
    { pattern: /来られる/g, replacement: '来れる' },
    { pattern: /やめられる/g, replacement: 'やめれる' },
    { pattern: /信じられる/g, replacement: '信じれる' },
    
    // い抜き言葉（「〜ている」→「〜てる」）
    { pattern: /している/g, replacement: 'してる' },
    { pattern: /言っている/g, replacement: '言ってる' },
    { pattern: /思っている/g, replacement: '思ってる' },
    { pattern: /知っている/g, replacement: '知ってる' },
    { pattern: /わかっている/g, replacement: 'わかってる' },
    
    // よくある誤変換・打ち間違い
    { pattern: /そういう/g, replacement: 'そうゆう' },
    { pattern: /ていう/g, replacement: 'てゆう' },
    { pattern: /全然/g, replacement: 'ぜんぜん' }, // ひらがな化
    { pattern: /結局/g, replacement: 'けっきょく' }, // ひらがな化
  ];

  // ランダムに1つだけ適用
  const randomPattern = errorPatterns[Math.floor(Math.random() * errorPatterns.length)];
  
  // パターンがマッチする場合のみ適用
  if (randomPattern.pattern.test(text)) {
    console.log(`🔤 自然な誤り適用: ${randomPattern.pattern} → ${randomPattern.replacement}`);
    return text.replace(randomPattern.pattern, randomPattern.replacement);
  }
  
  return text;
}

// ランダムな絵文字を選択
export function selectEmoji(emotion: string): string {
  const emojiMap: Record<string, string[]> = {
    '不安': ['💦', '😢', '🥺'],
    '怒り': ['😤', '💢'],
    '迷い': ['🤔', '😅'],
    '喜び': ['😊', '💕', '✨']
  };
  
  const emojis = emojiMap[emotion] || ['😊'];
  return emojis[Math.floor(Math.random() * emojis.length)];
}

// 構造化プロンプトを生成
export function generateStructuredPrompt(
  title: string,
  content: string,
  userProfile?: {
    gender: string | null;
    age: number | null;
    marriage: string | null;
  }
): {
  prompt: string;
  persona: Persona;
  pattern: CommentPattern;
  targetLength: number;
} {
  // ユーザープロフィールがある場合はそれに基づいてペルソナを選択
  const persona = userProfile 
    ? selectPersonaFromProfile(userProfile.gender, userProfile.age, userProfile.marriage)
    : selectPersona();
  
  const pattern = selectCommentPattern();
  const severity = analyzeSeverity(title, content);
  const emotion = analyzeEmotion(title, content);
  
  // 目標文字数（パターンの範囲内でランダム）
  const targetLength = Math.floor(
    Math.random() * (pattern.maxLength - pattern.minLength + 1) + pattern.minLength
  );
  
  const structuredPrompt = `
# あなたのペルソナ
${persona.name}（${persona.age}）
口調: ${persona.tone}
特徴: ${persona.characteristic}

# 投稿分析
深刻度: ${severity}
感情: ${emotion}

# コメントパターン
「${pattern.name}」形式で書いてください
構造: ${pattern.structure}

# 目標文字数
${targetLength}文字前後

---

# 恋愛ブログコメント生成ルール

あなたは恋愛ブログのコメント投稿者です。共感を大切にしながらも、建前より本音、綺麗事より現実を語ります。

【投稿情報】
タイトル: ${title}
本文: ${content}

【基本ルール】
- 敬語・丁寧語: 基本は「〜です」「〜ます」「〜ですね」を使う
- タメ口の混在: 「〜だよね」「〜じゃん」「〜かも」などを適度に混ぜて親しみやすく
- バランス: 敬語7割、タメ口3割くらいの割合で自然に混ぜる
- 絵文字: 5回に1回程度の頻度で、使用する場合は文末に1個のみ（💦😊💕😢🥺など）
- 記号: 「…」「！」「笑」「汗」などを適度に使う
- 口調: ${persona.tone}

【禁止事項】
- 複数のコメントを並べる
- 「どう思う？」「どうかな？」などの文末質問
- 「ドキドキ」「ワクワク」などの擬音語
- 「確かに」「おっしゃる」「素敵」などのAI臭い表現
- 「それは辛いですね」「わかります」「そうですよね」を冒頭に使う
- 投稿タイトルをそのまま冒頭に含める
- コメントを鉤括弧（「」）で囲む
- 「〜してみてはいかがでしょうか」などの堅い表現
- 定型的な励まし文句

【重要】
- ${pattern.name}のパターンに従って書いてください
- ${targetLength}文字前後で生成してください
- ${persona.tone}の口調を使ってください
- コメント本文のみを出力（説明不要）
`.trim();

  return {
    prompt: structuredPrompt,
    persona,
    pattern,
    targetLength
  };
}
