import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  try {
    const { count, use_ai } = await request.json();

    console.log('AI user generation started:', { count, use_ai });

    const generatedUsers = [];
    const errors = [];

    for (let i = 0; i < count; i++) {
      try {
        let userData;

        if (use_ai) {
          userData = await generateProfileWithAI();
        } else {
          userData = generateProfile();
        }

        if (userData) {
          const userId = await insertUser(userData);
          if (userId) {
            generatedUsers.push(userData);
            console.log(`User ${i + 1} created successfully:`, userData.name);
          } else {
            errors.push(`User ${i + 1}: Failed to insert into database`);
            console.error(`User ${i + 1}: Failed to insert`);
          }
        } else {
          errors.push(`User ${i + 1}: Failed to generate profile`);
          console.error(`User ${i + 1}: Failed to generate profile`);
        }
      } catch (userError) {
        errors.push(`User ${i + 1}: ${userError instanceof Error ? userError.message : 'Unknown error'}`);
        console.error(`User ${i + 1} error:`, userError);
      }
    }

    console.log('AI user generation completed:', { 
      success: generatedUsers.length, 
      failed: errors.length 
    });

    if (generatedUsers.length === 0 && errors.length > 0) {
      return NextResponse.json(
        { error: `生成に失敗しました: ${errors.join(', ')}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      count: generatedUsers.length,
      users: generatedUsers,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('AI user generation error:', error);
    return NextResponse.json(
      { error: `AI会員生成に失敗しました: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}

// ランダムプロフィール生成
function generateProfile() {
  const sex = Math.random() > 0.5 ? 'male' : 'female';
  const birthYear = Math.floor(Math.random() * (2005 - 1970 + 1)) + 1970;

  const prefectures = ['東京都', '神奈川県', '大阪府', '愛知県', '福岡県', '北海道', '埼玉県', '千葉県', '兵庫県', '京都府'];
  const jobs = ['会社員', '主婦', 'フリーランス', '自営業', '公務員', '学生', 'パート', 'アルバイト', '無職', '経営者'];

  const marriageStatus = ['single', 'married', 'divorced', 'not_specified'];
  const marriage = marriageStatus[Math.floor(Math.random() * marriageStatus.length)];
  const childCount = marriage === 'married' ? Math.floor(Math.random() * 4) : 0;

  // シンプルなランダムニックネーム生成（70種類以上のプレフィックス + 4桁の数字）
  const prefixes = [
    // 英語
    'user', 'member', 'guest', 'happy', 'lucky', 'smile', 'peace', 'dream', 'star', 'moon', 'sun', 'sky',
    'love', 'hope', 'joy', 'kind', 'nice', 'cool', 'blue', 'green', 'red', 'pink',
    // 食べ物（英語）
    'apple', 'banana', 'orange', 'grape', 'melon', 'peach', 'cake', 'cookie', 'candy', 'chocolate', 'tea', 'coffee',
    'bread', 'rice', 'pizza', 'pasta', 'salad', 'soup',
    // 食べ物（日本語）
    'りんご', 'みかん', 'いちご', 'すいか', 'おにぎり', 'すし', 'らーめん', 'うどん', 'たこやき',
    'カレー', 'おでん', 'やきとり', 'てんぷら', 'そば', 'おちゃ',
    // その他（日本語）
    'ねこ', 'いぬ', 'うさぎ', 'はな', 'そら', 'うみ', 'やま', 'ほし', 'にじ',
    'さくら', 'つき', 'ゆき', 'かぜ', 'ひかり', 'みどり', 'あお', 'あか'
  ];
  
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const number = Math.floor(Math.random() * 9000) + 1000; // 1000〜9999
  const userNicename = prefix + number;

  const prefecture = prefectures[Math.floor(Math.random() * prefectures.length)];
  const job = jobs[Math.floor(Math.random() * jobs.length)];
  const age = new Date().getFullYear() - birthYear;

  const descriptions = [
    `${prefecture}在住の${age}歳、${job}です。`,
    '趣味は読書と映画鑑賞です。よろしくお願いします。',
    'アンケートで暮らしを豊かにしたいと思っています。',
    '家族と過ごす時間を大切にしています。',
    '新しいことに挑戦するのが好きです。',
  ];

  let description = descriptions[Math.floor(Math.random() * descriptions.length)];
  if (childCount > 0) {
    description += ` ${childCount}人の子供がいます。`;
  }

  return {
    name: userNicename,
    status: 6,
    user_description: description,
    birth_year: String(birthYear),
    sex,
    marriage,
    child_count: childCount,
    job,
    prefecture,
    profile_registered: true,
    email_subscription: Math.random() > 0.5,
    show_unvoted_surveys: true,
  };
}

// OpenAI APIを使用したプロフィール生成
async function generateProfileWithAI() {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    return generateProfile();
  }

  const openai = new OpenAI({ apiKey: openaiApiKey });

  const prompt = `日本人のリアルなユーザープロフィールを1人分生成してください。以下のJSON形式で出力してください：
{
  "sex": "male または female",
  "birth_year": "1970〜2005の数値",
  "prefecture": "都道府県名",
  "job": "職種",
  "marriage": "single, married, divorced, not_specified のいずれか",
  "child_count": "0〜3の数値",
  "user_description": "100文字程度の自己紹介文",
  "name": "創造的で自然なニックネーム（例：しょうちゃん、カレー大好き、きのこ派、あおぞら、yamada99など）"
}

※ リアルで自然なプロフィールを生成してください。
※ nameは必ず毎回違う創造的で親しみやすいものを考案してください。`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 1.0,
      max_tokens: 500,
    });

    const content = completion.choices[0]?.message?.content;

    if (content) {
      const jsonMatch = content.match(/\{[^}]+\}/);
      if (jsonMatch) {
        const aiData = JSON.parse(jsonMatch[0]);

        return {
          name: aiData.name,
          status: 6,
          user_description: aiData.user_description,
          birth_year: String(aiData.birth_year),
          sex: aiData.sex,
          marriage: aiData.marriage,
          child_count: parseInt(aiData.child_count),
          job: aiData.job,
          prefecture: aiData.prefecture,
          profile_registered: true,
          email_subscription: Math.random() > 0.5,
          show_unvoted_surveys: true,
        };
      }
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
  }

  return generateProfile();
}

// ユーザーをデータベースに挿入
async function insertUser(userData: any) {
  try {
    // 最新のIDを取得して自動採番
    const { data: latestUser } = await supabase
      .from('users')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    let newUserId = '1';
    if (latestUser && latestUser.id) {
      const latestId = latestUser.id;
      // 数値のIDの場合は+1、それ以外は新規採番
      const numericId = parseInt(latestId);
      if (!isNaN(numericId)) {
        newUserId = String(numericId + 1);
      } else {
        // 数値IDの最大値を取得
        const { data: maxNumericUser } = await supabase
          .from('users')
          .select('id')
          .order('id', { ascending: false })
          .limit(100);
        
        let maxId = 0;
        if (maxNumericUser) {
          for (const user of maxNumericUser) {
            const id = parseInt(user.id);
            if (!isNaN(id) && id > maxId) {
              maxId = id;
            }
          }
        }
        newUserId = String(maxId + 1);
      }
    }

    const tempEmail = `temp_${Math.floor(Math.random() * 900000) + 100000}@temp.local`;
    
    // profile_slugを生成（ニックネームをベースに）
    const baseSlug = userData.name
      .toLowerCase()
      .replace(/[^a-z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/g, '')
      .substring(0, 20);
    const randomSuffix = Math.floor(Math.random() * 10000);
    const profileSlug = `${baseSlug}${randomSuffix}`;

    const { data, error } = await supabase
      .from('users')
      .insert({
        id: newUserId,
        email: tempEmail,
        user_pass: '$2y$10$abcdefghijklmnopqrstuvwxyz',
        name: userData.name,
        status: userData.status,
        user_description: userData.user_description,
        birth_year: userData.birth_year,
        sex: userData.sex,
        marriage: userData.marriage,
        child_count: userData.child_count,
        job: userData.job,
        prefecture: userData.prefecture,
        profile_registered: userData.profile_registered ? 1 : 0,
        email_subscription: userData.email_subscription ? 1 : 0,
        show_unvoted_surveys: userData.show_unvoted_surveys ? 1 : 0,
        profile_slug: profileSlug,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Insert error:', error);
      return null;
    }

    if (data) {
      const userId = data.id;
      const correctEmail = `yhayashi+${userId}@sucmedia.co.jp`;

      await supabase
        .from('users')
        .update({ email: correctEmail })
        .eq('id', userId);

      return userId;
    }

    return null;
  } catch (error) {
    console.error('Insert user error:', error);
    return null;
  }
}
