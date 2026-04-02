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

    // 半分を匿名にする
    const anonymousCount = Math.floor(count / 2);
    
    for (let i = 0; i < count; i++) {
      try {
        let userData;
        const isAnonymous = i < anonymousCount; // 前半を匿名にする

        if (isAnonymous) {
          // 匿名ユーザーを生成
          userData = generateProfile();
          userData.name = '匿名';
        } else if (use_ai) {
          userData = await generateProfileWithAI();
        } else {
          userData = generateProfile();
        }

        if (userData) {
          try {
            const userId = await insertUser(userData);
            if (userId) {
              generatedUsers.push(userData);
              console.log(`User ${i + 1} created successfully:`, userData.name);
            } else {
              errors.push(`User ${i + 1}: insertUser returned null`);
              console.error(`User ${i + 1}: insertUser returned null`);
            }
          } catch (insertError) {
            const errMsg = insertError instanceof Error ? insertError.message : JSON.stringify(insertError);
            errors.push(`User ${i + 1}: ${errMsg}`);
            console.error(`User ${i + 1} insert error:`, insertError);
          }
        } else {
          errors.push(`User ${i + 1}: Failed to generate profile`);
          console.error(`User ${i + 1}: Failed to generate profile`);
        }
      } catch (userError) {
        const errorMsg = userError instanceof Error ? userError.message : JSON.stringify(userError);
        errors.push(`User ${i + 1}: ${errorMsg}`);
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
  const age = new Date().getFullYear() - birthYear;

  const prefectures = ['東京都', '神奈川県', '大阪府', '愛知県', '福岡県', '北海道', '埼玉県', '千葉県', '兵庫県', '京都府'];
  
  // 年齢に応じた職業を設定
  let jobs: string[];
  if (age <= 22) {
    // 若年層（18-22歳）は学生・アルバイト中心
    jobs = ['学生', 'アルバイト', 'フリーター'];
  } else if (age <= 30) {
    // 20代後半は会社員・フリーランス中心
    jobs = ['会社員', 'フリーランス', '公務員', 'アルバイト', '派遣社員'];
  } else {
    // 30代以上は多様な職業
    jobs = ['会社員', '主婦', 'フリーランス', '自営業', '公務員', 'パート', '経営者'];
  }

  // 年齢に応じた恋愛ステータスを設定
  let marriageStatus: string[];
  let childCount = 0;
  
  if (age <= 24) {
    // 24歳以下は独身のみ（結婚・離婚なし）
    marriageStatus = ['single', 'not_specified'];
  } else if (age <= 30) {
    // 25-30歳は独身中心、一部既婚
    marriageStatus = ['single', 'single', 'single', 'married', 'not_specified'];
  } else if (age <= 40) {
    // 31-40歳は既婚も増える
    marriageStatus = ['single', 'married', 'married', 'divorced', 'not_specified'];
  } else {
    // 41歳以上は多様
    marriageStatus = ['single', 'married', 'married', 'divorced', 'divorced', 'not_specified'];
  }
  
  const marriage = marriageStatus[Math.floor(Math.random() * marriageStatus.length)];
  
  // 既婚者のみ子供あり（年齢に応じて）
  if (marriage === 'married') {
    if (age >= 30) {
      childCount = Math.floor(Math.random() * 3) + 1; // 1-3人
    } else if (age >= 26) {
      childCount = Math.random() > 0.5 ? 1 : 0; // 0-1人
    }
  } else if (marriage === 'divorced' && age >= 35) {
    childCount = Math.random() > 0.6 ? Math.floor(Math.random() * 2) + 1 : 0; // 40%で1-2人
  }

  // ニックネーム生成（半分はランダム英数4-8文字、半分は日本語風プレフィックス+数字）
  let userNicename: string;
  
  if (Math.random() > 0.5) {
    // ランダム英数4-8文字
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const nameLength = Math.floor(Math.random() * 5) + 4; // 4-8文字
    userNicename = '';
    for (let i = 0; i < nameLength; i++) {
      userNicename += chars[Math.floor(Math.random() * chars.length)];
    }
  } else {
    // 日本語風プレフィックス + 数字
    const prefixes = [
      // 食べ物（日本語）
      'りんご', 'みかん', 'いちご', 'すいか', 'おにぎり', 'すし', 'らーめん', 'うどん', 'たこやき',
      'カレー', 'おでん', 'やきとり', 'てんぷら', 'そば', 'おちゃ', 'カフェ', 'ケーキ', 'クッキー',
      // 動物・自然（日本語）
      'ねこ', 'いぬ', 'うさぎ', 'はな', 'そら', 'うみ', 'やま', 'ほし', 'にじ',
      'さくら', 'つき', 'ゆき', 'かぜ', 'ひかり', 'みどり', 'あお', 'あか',
      // 人名風
      'ゆうちゃん', 'みーちゃん', 'あーちゃん', 'まーちゃん', 'ママ', 'パパ',
      // 趣味・好き
      'カフェ好き', '読書好き', '映画好き', '音楽好き', '旅行好き', '料理好き'
    ];
    
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const number = Math.floor(Math.random() * 9000) + 1000; // 1000〜9999
    userNicename = prefix + number;
  }

  const prefecture = prefectures[Math.floor(Math.random() * prefectures.length)];
  const job = jobs[Math.floor(Math.random() * jobs.length)];

  const descriptions = [
    `${prefecture}在住の${age}歳、${job}です。`,
    '趣味は読書と映画鑑賞です。よろしくお願いします。',
    '相談で悩みを解決したいと思っています。',
    '家族と過ごす時間を大切にしています。',
    '新しいことに挑戦するのが好きです。',
  ];

  let description = descriptions[Math.floor(Math.random() * descriptions.length)];
  if (childCount > 0) {
    description += ` ${childCount}人の子供がいます。`;
  }

  return {
    name: userNicename,
    status: 4, // AI会員
    user_description: description,
    birth_year: String(birthYear),
    sex,
    marriage,
    child_count: childCount,
    job,
    prefecture,
    profile_registered: true,
    email_subscription: Math.random() > 0.5,
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

        // ニックネーム生成（半分はランダム英数4-8文字、半分は日本語風プレフィックス+数字）
        let randomName: string;
        
        if (Math.random() > 0.5) {
          // ランダム英数4-8文字
          const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
          const nameLength = Math.floor(Math.random() * 5) + 4;
          randomName = '';
          for (let i = 0; i < nameLength; i++) {
            randomName += chars[Math.floor(Math.random() * chars.length)];
          }
        } else {
          // 日本語風プレフィックス + 数字
          const prefixes = [
            'りんご', 'みかん', 'いちご', 'すいか', 'おにぎり', 'すし', 'らーめん', 'うどん', 'たこやき',
            'カレー', 'おでん', 'やきとり', 'てんぷら', 'そば', 'おちゃ', 'カフェ', 'ケーキ', 'クッキー',
            'ねこ', 'いぬ', 'うさぎ', 'はな', 'そら', 'うみ', 'やま', 'ほし', 'にじ',
            'さくら', 'つき', 'ゆき', 'かぜ', 'ひかり', 'みどり', 'あお', 'あか',
            'ゆうちゃん', 'みーちゃん', 'あーちゃん', 'まーちゃん', 'ママ', 'パパ',
            'カフェ好き', '読書好き', '映画好き', '音楽好き', '旅行好き', '料理好き'
          ];
          const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
          const number = Math.floor(Math.random() * 9000) + 1000;
          randomName = prefix + number;
        }

        return {
          name: randomName,
          status: 4, // AI会員
          user_description: aiData.user_description,
          birth_year: String(aiData.birth_year),
          sex: aiData.sex,
          marriage: aiData.marriage,
          child_count: parseInt(aiData.child_count),
          job: aiData.job,
          prefecture: aiData.prefecture,
          profile_registered: true,
          email_subscription: Math.random() > 0.5,
        };
      }
    }
  } catch (error) {
    console.error('OpenAI API error:', error);
  }

  return generateProfile();
}

// ユーザーをデータベースに挿入
async function insertUser(userData: Record<string, unknown>) {
  try {
    // UUIDを生成
    const newUserId = crypto.randomUUID();
    
    console.log('Attempting to insert user with UUID:', newUserId);

    const tempEmail = `temp_${Math.floor(Math.random() * 900000) + 100000}@temp.local`;
    
    // profile_slugを生成（ニックネームをベースに）
    const userName = String(userData.name || '');
    const baseSlug = userName
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
        profile_slug: profileSlug,
      })
      .select('id')
      .single();

    if (error) {
      console.error('Insert error details:', JSON.stringify(error, null, 2));
      console.error('Insert data was:', { id: newUserId, name: userData.name, email: tempEmail });
      throw new Error(`DB Insert failed: ${error.message || error.code || JSON.stringify(error)}`);
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

    throw new Error('Insert succeeded but no data returned');
  } catch (error) {
    console.error('Insert user error:', error);
    throw error instanceof Error ? error : new Error(JSON.stringify(error));
  }
}
