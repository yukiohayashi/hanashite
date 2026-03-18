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

// Yahoo知恵袋の質問をハナシテ用の質問文に修正
export async function refineYahooQuestion(originalTitle: string, originalContent: string): Promise<{ title: string; content: string }> {
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

  const openai = new OpenAI({
    apiKey: apiSettings.api_key,
  });

  const model = apiSettings.model || 'gpt-4o-mini';

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: 'system',
        content: `あなたは恋愛相談サイト「ハナシテ」の質問文を作成するアシスタントです。
Yahoo!知恵袋からスクレイピングした質問を、ブログ記事のような自然で読みやすい相談文に修正してください。

【修正ルール】
1. タイトル: 20-40文字程度の簡潔で具体的なタイトルにする
2. 本文: 150-300文字程度で、ブログ記事のような自然な文章にする
3. 一人称視点で、日記や体験談のような親しみやすい口調で書く
4. 「最近〜」「実は〜」などの自然な書き出しを使う
5. 感情や心情を丁寧に描写する
6. 「〜なんです」「〜でしょうか」など柔らかい語尾を使う
7. 具体的なエピソードを残しつつ、読みやすく整理する
8. 堅苦しい表現は避け、SNSやブログで使うような自然な言葉遣いにする

【良い例】
「最近、年上の店員さんに恋をしてしまいました。彼は私の好意に気づいているようですが、恋愛感情ではなく推しのファンだと思っているようです。私は上京することになり、その人にはあと数回しか会えません。上京前に彼に気持ちを伝えるべきか悩んでいます。どうすればいいでしょうか？」

【出力形式】
タイトル: [修正後のタイトル]
本文: [修正後の本文]`,
      },
      {
        role: 'user',
        content: `元のタイトル: ${originalTitle}\n\n元の本文: ${originalContent}`,
      },
    ],
    temperature: 0.7,
    max_tokens: 500,
  });

  const responseText = response.choices[0]?.message?.content?.trim() || '';
  
  // タイトルと本文を抽出
  const titleMatch = responseText.match(/タイトル[：:]\s*(.+?)(?=\n|$)/);
  const contentMatch = responseText.match(/本文[：:]\s*([\s\S]+)/);

  const refinedTitle = titleMatch ? titleMatch[1].trim() : originalTitle;
  const refinedContent = contentMatch ? contentMatch[1].trim() : originalContent;

  return {
    title: refinedTitle,
    content: refinedContent,
  };
}
