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
Yahoo!知恵袋からスクレイピングした質問を、完全にオリジナルのブログ記事風の相談文に大幅に書き換えてください。

【重要】元の質問文をそのまま使わず、内容を理解した上で全く新しい文章として作り直してください。
**リライト率50%以上を必ず達成すること**（元の文章の単語や表現を50%以上変更する）

【修正ルール】
1. タイトル: 元のタイトルとは異なる表現で、20-40文字程度の具体的なタイトルを新規作成
   - **体言止めは使わない**（「〜の私」ではなく「〜ます」「〜でしょうか」で終わる）
   - 例: ❌「彼氏からの奢りに違和感を感じる私」 → ⭕「彼氏からの奢りに違和感を感じます」
2. 本文: 元の文章を一切コピーせず、150-300文字で完全に書き直す
   - **冒頭部分は特に重要**: 元の文章の最初の1〜2文は絶対にそのまま使わない
   - **冒頭のバリエーション**: 以下からランダムに選んで自然に使う
     * 「聞いてください」「相談させてください」「悩んでいます」
     * 「実は〜」「正直〜」「本当に〜」
     * 「〜なんですが」「〜で困っています」「〜について質問です」
     * 「皆さんならどうしますか」「アドバイスください」
     * 直接本題から入る（「彼氏が〜」「職場で〜」など）
   - **「最近」は使いすぎない**: 全体の30%程度に抑える
   - **リライト率50%以上必須**: 元の単語や表現を50%以上変更する
   - **具体的なたとえや事例を追加する**（「例えば〜」「〜みたいな」など）
   - 元の質問がわからないレベルまで大幅に変更する
3. **ブログ記事のような自然で読みやすい文章にする**
4. **必ず丁寧語・敬語（です・ます調）で書く**。タメ口は絶対に使わない
5. 冒頭は多様な表現を使い、同じパターンの繰り返しを避ける
6. 具体的なエピソードは残すが、説明の仕方を大幅に変える（時系列を変える、詳細を追加、視点を変えるなど）
7. 感情や心情を丁寧に描写し、共感を呼ぶ表現にする
8. 「〜なんです」「〜でしょうか」「〜ました」など柔らかく丁寧な語尾を使う
9. **元の質問にない背景情報や心情、具体例を積極的に追加する**
10. **適度に改行を入れて読みやすくする**（2〜3文ごとに改行）
11. ブログや日記のような親密さと丁寧さを両立させる
12. **記号や絵文字を使って親しみやすさを出す**
    - 記号: 「、、、」「汗」「…」「！」などを適度に使う
    - 絵文字: たまに使う程度（0個が一番多く、使う場合は1〜2個程度。💦😊💕😢🥺など）

【悪い例（元の文章をほぼコピー）】
元: 「高3になった私。小6の時に出会ったある子とは、中学でも部活と塾が一緒で、ずっと仲良くしてた。」
悪い修正: 「最近、高3になった私。小6の時に出会ったある子とは、中学でも部活と塾が一緒で、ずっと仲良くしていました。」

【良い例（ブログ調＋丁寧語＋改行＋絵文字＋記号）】
元: 「高3になった私。小6の時に出会ったある子とは、中学でも部活と塾が一緒で、ずっと仲良くしてた。」
良い修正: 「聞いてください💦 高校3年生なのですが、実は小学校の頃から知っている同級生のことで悩んでいます、、、中学時代も部活や塾で一緒だったので、すごく仲が良かったんです。

でも、実はその子のことが好きだった私は、つい冷たい態度を取ってしまうこともありました…汗。塾や部活では普通にハグとかしていたのに、最近は顔を見るだけでドキドキしてしまいます😊

このままでいいのか、それとも気持ちを伝えるべきなのか、本当に悩んでいます。どうしたらいいでしょうか🥺」

【出力形式】
タイトル: [完全に新しく作成したタイトル]
本文: [元の文章を一切使わず、完全に書き直した本文]`,
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

  const refinedTitle = titleMatch ? titleMatch[1].trim() : originalTitle;
  let refinedContent = contentMatch ? contentMatch[1].trim() : originalContent;

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
