import OpenAI from 'openai';
import { supabase } from './supabase';

interface AnkeData {
  title: string;
  choices: string[];
  categories: string[];
  keywords: string[];
}

async function getSettings() {
  const { data, error } = await supabase
    .from('auto_creator_settings')
    .select('*');

  if (error) {
    throw new Error('設定の取得に失敗しました');
  }

  const settings: Record<string, string> = {};
  data?.forEach((item) => {
    settings[item.setting_key] = item.setting_value;
  });

  return settings;
}

export async function generateAnke(article: {
  title: string;
  content: string;
  url: string;
}): Promise<AnkeData> {
  const settings = await getSettings();

  if (!settings.openai_api_key) {
    throw new Error('OpenAI APIキーが設定されていません');
  }

  const openai = new OpenAI({
    apiKey: settings.openai_api_key,
  });

  const model = settings.openai_model || 'gpt-4o-mini';
  const titlePrompt = settings.title_prompt || '';
  const choicesPrompt = settings.choices_prompt || '';
  const maxKeywords = parseInt(settings.max_keywords || '3');
  const maxCategories = parseInt(settings.max_categories || '1');

  console.log('タイトルプロンプト長:', titlePrompt.length);
  console.log('選択肢プロンプト長:', choicesPrompt.length);

  // タイトル生成
  const titleResponse = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: titlePrompt,
      },
      {
        role: 'user',
        content: `記事タイトル: ${article.title}\n\n記事内容: ${article.content.substring(0, 1000)}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 100,
  });

  const generatedTitle = titleResponse.choices[0]?.message?.content?.trim() || article.title;

  // 選択肢生成
  const choicesResponse = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: choicesPrompt,
      },
      {
        role: 'user',
        content: `質問: ${generatedTitle}\n\n記事内容: ${article.content.substring(0, 1000)}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 200,
  });

  const choicesText = choicesResponse.choices[0]?.message?.content?.trim() || '';
  console.log('ChatGPT選択肢レスポンス:', choicesText);
  
  const choices = choicesText
    .split('\n')
    .filter((line: string) => line.trim())
    .map((line: string) => line.replace(/^[-•\d.)\s]+/, '').trim())
    .filter((choice: string) => choice.length > 0)
    .slice(0, 4);
  
  console.log('パース後の選択肢:', choices);

  // カテゴリとキーワード抽出
  const extractResponse = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `記事から適切なカテゴリ（1個のみ）とキーワード（最大${maxKeywords}個）を抽出してください。

【重要】カテゴリは以下のリストから必ず1つ選択してください（完全一致）:
- アニメ・漫画
- エンタメ
- お受験
- クレカ・電子マネー
- ゲーム
- ジャニーズ
- ファッション
- ペット
- 住まい・不動産
- 保険
- 医療費
- 婚活・結婚
- 就職・転職
- 恋愛
- 投資・貯蓄
- 整形・脱毛
- 料理・グルメ
- 旅行・ホテル
- 税金・年金
- 競馬・ギャンブル
- 美容・コスメ
- 育児
- 雑談
- ニュース・話題

【カテゴリ選択のガイドライン】
- テレビ番組、映画、音楽、芸能人の話題 → エンタメ
- 政治、経済、社会問題、事件、国際ニュース → ニュース・話題
- アニメ、漫画の作品やキャラクター → アニメ・漫画
- ゲームの話題 → ゲーム
- 受験、教育の話題 → お受験
- どのカテゴリにも当てはまらない → 雑談

キーワードは記事の重要な固有名詞や話題を抽出してください。

出力形式:
カテゴリ: [上記リストから1つ選択]
キーワード: キーワード1, キーワード2, キーワード3`,
      },
      {
        role: 'user',
        content: `記事タイトル: ${article.title}\n\n記事内容: ${article.content.substring(0, 1000)}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 150,
  });

  const extractText = extractResponse.choices[0]?.message?.content?.trim() || '';
  
  // カテゴリ抽出
  const categoryMatch = extractText.match(/カテゴリ[：:]\s*(.+)/);
  const categories = categoryMatch
    ? categoryMatch[1].split(/[,、]/).map((c) => c.trim()).filter((c) => c).slice(0, maxCategories)
    : ['その他'];

  // キーワード抽出
  const keywordMatch = extractText.match(/キーワード[：:]\s*(.+)/);
  const keywords = keywordMatch
    ? keywordMatch[1].split(/[,、]/).map((k) => k.trim()).filter((k) => k).slice(0, maxKeywords)
    : [];

  return {
    title: generatedTitle,
    choices: choices.length >= 2 ? choices : ['賛成', '反対', 'どちらでもない'],
    categories,
    keywords,
  };
}

// 体言止めのタイトルを修正する関数
function fixTaigendomeTitles(title: string): string {
  // 「〜に悩む私」→「〜に悩んでいます」
  if (/に悩む私[。．.]?$/.test(title)) {
    return title.replace(/に悩む私[。．.]?$/, 'に悩んでいます');
  }

  // 「〜を感じる私」→「〜を感じています」
  if (/を感じる私[。．.]?$/.test(title)) {
    return title.replace(/を感じる私[。．.]?$/, 'を感じています');
  }

  // 「〜する私」→「〜しています」
  if (/する私[。．.]?$/.test(title)) {
    return title.replace(/する私[。．.]?$/, 'しています');
  }

  // 「〜な私」→「〜で悩んでいます」
  if (/な私[。．.]?$/.test(title)) {
    return title.replace(/な私[。．.]?$/, 'で悩んでいます');
  }

  // 「〜の私」→「〜について相談です」
  if (/の私[。．.]?$/.test(title)) {
    return title.replace(/の私[。．.]?$/, 'について相談です');
  }

  // 「〜い私」→「〜くて悩んでいます」
  if (/([いしくる])私[。．.]?$/.test(title)) {
    return title.replace(/私[。．.]?$/, 'と感じています');
  }

  return title;
}

// Yahoo知恵袋の質問をハナシテ用の質問文に修正
export async function refineYahooQuestion(
  originalTitle: string, 
  originalContent: string,
  userAge: number | null = null,
  userMarriage: string | null = null
): Promise<{ title: string; content: string }> {
  // api_settingsテーブルからアクティブなOpenAI APIキーを取得
  const { data: apiSettings } = await supabase
    .from('api_settings')
    .select('api_key, model')
    .eq('is_active', true)
    .limit(1)
    .single();

  if (!apiSettings || !apiSettings.api_key) {
    throw new Error('OpenAI APIキーが設定されていません');
  }

  // 構造化プロンプトを生成
  const { generatePostPrompt } = await import('./postPromptHelper');
  const { prompt: structuredPrompt, persona, openingPattern, structurePattern, targetLength } = generatePostPrompt(
    originalTitle,
    originalContent,
    userAge,
    userMarriage
  );

  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🤖 AI投稿記事：構造化プロンプトシステム');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`📝 ペルソナ: ${persona.name}（${persona.ageRange}）`);
  console.log(`   文体: ${persona.tone}`);
  console.log(`   特徴: ${persona.characteristic}`);
  console.log(`📋 冒頭パターン: ${openingPattern.name}`);
  console.log(`   例: ${openingPattern.examples.join('、')}`);
  console.log(`📐 本文構造: ${structurePattern.name}`);
  console.log(`   ${structurePattern.structure}`);
  console.log(`🎯 目標文字数: ${targetLength}文字`);
  console.log(`✨ 絵文字: ${persona.emojiProbability * 100}%の確率で${persona.emojiCount[0]}-${persona.emojiCount[1]}個`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  const openai = new OpenAI({
    apiKey: apiSettings.api_key,
  });

  const model = apiSettings.model || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: structuredPrompt,
      },
    ],
    temperature: 0.8,
    max_tokens: 600,
  });

  const responseText = response.choices[0]?.message?.content?.trim() || '';
  
  console.log('========================================');
  console.log('【OpenAI APIレスポンス】');
  console.log(responseText);
  console.log('========================================');
  
  // タイトルと本文を抽出
  const titleMatch = responseText.match(/タイトル[：:]\s*(.+?)(?=\n|$)/);
  
  // 本文は「本文:」ラベルがある場合とない場合の両方に対応
  let contentMatch = responseText.match(/本文[：:]\s*([\s\S]+)/);
  
  // 「本文:」ラベルがない場合は、タイトル行の後の改行以降をすべて本文として扱う
  if (!contentMatch) {
    const afterTitle = responseText.split(/タイトル[：:].+?\n/)[1];
    if (afterTitle) {
      contentMatch = ['', afterTitle] as RegExpMatchArray;
    }
  }

  console.log('タイトルマッチ:', titleMatch ? titleMatch[1] : 'なし');
  console.log('本文マッチ:', contentMatch ? contentMatch[1].substring(0, 100) : 'なし');

  let refinedTitle = titleMatch ? titleMatch[1].trim() : originalTitle;
  let refinedContent = contentMatch ? contentMatch[1].trim() : originalContent;

  // 体言止めのタイトルを修正（「〜の私」「〜な私」などで終わる場合）
  refinedTitle = fixTaigendomeTitles(refinedTitle);

  // 改行をランダムで自然にする処理
  // 既存の改行を一旦削除し、文を区切って再構築
  refinedContent = refinedContent.replace(/\n+/g, ' '); // 既存の改行を削除
  
  // 句点（。）や感嘆符（！）、疑問符（？）で文を分割
  const sentences = refinedContent.split(/([。！？])/);
  let result = '';
  let sentenceCount = 0;
  
  for (let i = 0; i < sentences.length; i++) {
    result += sentences[i];
    
    // 句点・感嘆符・疑問符の後
    if (sentences[i].match(/[。！？]/)) {
      sentenceCount++;
      
      // ランダムに改行を入れる（1-3文ごと）
      const shouldBreak = Math.random() < 0.6; // 60%の確率で改行
      const minSentences = 1;
      const maxSentences = 3;
      const randomThreshold = Math.floor(Math.random() * (maxSentences - minSentences + 1)) + minSentences;
      
      if (sentenceCount >= randomThreshold && shouldBreak && i < sentences.length - 1) {
        result += '\n\n';
        sentenceCount = 0;
      }
    }
  }
  
  refinedContent = result.trim();

  // 男性かどうかを判定
  const isMale = await detectMaleContent(refinedTitle, refinedContent, openai, model);
  
  if (isMale) {
    throw new Error('男性のため除外されました');
  }

  return {
    title: refinedTitle,
    content: refinedContent,
  };
}

// 男性かどうかを判定
async function detectMaleContent(title: string, content: string, openai: OpenAI, model: string): Promise<boolean> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `この相談文が男性からのものか女性からのものかを判定してください。

【判定基準】
- 「男子大学生」「男です」「俺」「僕」などの男性を示す一人称や表現がある → 男性
- 「サークルの女の子」「彼女」など、異性として女性に言及している → 男性
- 「女子大生」「私」「あたし」などの女性を示す表現がある → 女性
- 「彼」「男性」など、異性として男性に言及している → 女性
- 明確な判断ができない場合は「不明」

【出力形式】
性別: 男性 または 女性 または 不明`,
      },
      {
        role: 'user',
        content: `タイトル: ${title}\n\n本文: ${content}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 50,
  });

  const result = response.choices[0]?.message?.content?.trim() || '';
  const genderMatch = result.match(/性別[：:]\s*(男性|女性|不明)/);
  const gender = genderMatch ? genderMatch[1] : '不明';

  console.log(`性別判定結果: ${gender}`);
  
  return gender === '男性';
}
