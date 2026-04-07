import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { refineYahooQuestion } from '@/lib/chatgpt';

// カテゴリキーワードマッピング
const categoryKeywords: { [key: number]: string[] } = {
  2: ['婚活', '結婚', '婚約', 'プロポーズ'],
  3: ['復縁', '元カレ', '元カノ', 'よりを戻'],
  4: ['出会い', '合コン', 'マッチング', 'アプリ'],
  5: ['夫婦', '旦那', '妻', '結婚生活'],
  6: ['浮気', '不倫', '二股', '裏切'],
  7: ['デート', 'デートスポット', 'デートプラン'],
  8: ['レス', 'セックスレス', '夜の悩み'],
  9: ['価値観', '考え方', '価値観の違い'],
  10: ['職場恋愛', '社内恋愛', '職場', '会社'],
  11: ['同棲', '一緒に住む', '同棲生活'],
  12: ['告白', 'プロポーズ', '想いを伝える'],
  13: ['離婚', '離婚したい', '離婚届', '慰謝料'],
  14: ['その他', 'その他の相談'],
  16: ['遠距離恋愛', '遠距離', '遠恋'],
  17: ['マンネリ', '倦怠期', 'マンネリ化'],
  18: ['夜のトラブル', '性の悩み', 'セックス'],
  19: ['片思い', '好きな人', '片想い', '恋してる'],
  20: ['別れ話', '失恋', '振られた', '別れたい'],
  21: ['コミュニケーション', '会話', 'コミュニケーション不足'],
};

// 記事内容からカテゴリを自動判定
function detectCategory(title: string, content: string): number {
  const text = (title + ' ' + content).toLowerCase();
  
  // 各カテゴリのキーワードマッチング数をカウント
  const scores: { [key: number]: number } = {};
  
  for (const [categoryId, keywords] of Object.entries(categoryKeywords)) {
    const id = parseInt(categoryId);
    scores[id] = 0;
    
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        scores[id]++;
      }
    }
  }
  
  // 離婚カテゴリは結婚関連キーワードがある場合のみ有効
  if (scores[13] > 0) {
    const marriageKeywords = ['夫婦', '旦那', '妻', '結婚', '既婚'];
    const hasMarriageContext = marriageKeywords.some(kw => text.includes(kw));
    if (!hasMarriageContext) {
      scores[13] = 0; // 結婚関連の文脈がない場合は離婚カテゴリを無効化
    }
  }
  
  // 最もスコアが高いカテゴリを返す
  let maxScore = 0;
  let selectedCategory = 19; // デフォルトは「片思い」
  
  for (const [categoryId, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      selectedCategory = parseInt(categoryId);
    }
  }
  
  // スコアが0の場合（キーワードマッチなし）は「片思い」を返す
  return maxScore > 0 ? selectedCategory : 19;
}

async function selectQuestioner(refinedTitle: string, refinedContent: string, categoryId: number) {
  // 常にAI会員（status=4）のみを使用（編集者status=2は除外）
  const targetStatus = 4;

  const { data: users, error } = await supabase
    .from('users')
    .select('id, name, birth_year, sex, marriage, status')
    .eq('status', targetStatus)
    .limit(100);

  console.log(`AI会員検索結果:`, { count: users?.length || 0, error });

  if (!users || users.length === 0) {
    // 指定したstatusのユーザーがいない場合、全ユーザーから検索
    console.log(`status=${targetStatus}のユーザーが見つからないため、全ユーザーから検索します`);
    const { data: allUsers } = await supabase
      .from('users')
      .select('id, name, birth_year, sex, marriage, status')
      .limit(100);
    
    console.log('全ユーザー検索結果:', { count: allUsers?.length || 0 });
    
    if (!allUsers || allUsers.length === 0) {
      throw new Error('ユーザーが見つかりません');
    }
    
    // ランダムにユーザーを選択
    const randomUser = allUsers[Math.floor(Math.random() * allUsers.length)];
    console.log(`選択されたユーザー: ${randomUser.name}, status: ${randomUser.status}`);
    return randomUser.id;
  }

  // カテゴリに応じてmarriageステータスをフィルタリング
  const marriedCategories = [5, 13]; // 夫婦、離婚
  const needMarried = marriedCategories.includes(categoryId);
  
  let targetUsers = users;
  
  if (needMarried) {
    // 既婚者のみを選択
    targetUsers = users.filter(user => {
      const isMarried = user.marriage === 'married' || user.marriage === '既婚';
      return isMarried;
    });
    console.log(`既婚者カテゴリ（ID: ${categoryId}）のため既婚者を選択: ${targetUsers.length}人`);
    
    if (targetUsers.length === 0) {
      console.log('既婚者が見つからないため、全ユーザーから選択します');
      targetUsers = users;
    }
  } else {
    // 未婚者のみを選択
    targetUsers = users.filter(user => {
      const isMarried = user.marriage === 'married' || user.marriage === '既婚';
      return !isMarried;
    });
    console.log(`未婚者カテゴリ（ID: ${categoryId}）のため未婚者を選択: ${targetUsers.length}人`);
    
    if (targetUsers.length === 0) {
      console.log('未婚者が見つからないため、全ユーザーから選択します');
      targetUsers = users;
    }
  }

  // 記事内容から年齢層を推定
  const text = (refinedTitle + ' ' + refinedContent).toLowerCase();
  let targetAgeMin = 20;
  let targetAgeMax = 40;
  
  // 高校生の相談
  if (text.includes('高校生') || text.includes('高校') || text.includes('jk') || text.includes('17歳') || text.includes('18歳')) {
    targetAgeMin = 16;
    targetAgeMax = 19;
  }
  // 大学生・若い世代の相談
  else if (text.includes('大学生') || text.includes('大学') || text.includes('学生') || text.includes('若い') || text.includes('20歳') || text.includes('21歳')) {
    targetAgeMin = 18;
    targetAgeMax = 23;
  }
  // 社会人・年上の相談
  else if (text.includes('年上') || text.includes('店員') || text.includes('社会人') || text.includes('職場')) {
    targetAgeMin = 22;
    targetAgeMax = 35;
  }
  // 30代の相談
  else if (text.includes('30代') || text.includes('アラサー') || text.includes('30歳')) {
    targetAgeMin = 28;
    targetAgeMax = 38;
  }
  // 中学生の相談
  else if (text.includes('中学生') || text.includes('中学') || text.includes('15歳') || text.includes('14歳')) {
    targetAgeMin = 13;
    targetAgeMax = 16;
  }
  
  // 年齢が適合するAI会員を優先的に選択
  const currentYear = new Date().getFullYear();
  const suitableUsers = targetUsers.filter(user => {
    const age = user.birth_year ? currentYear - user.birth_year : 25;
    return age >= targetAgeMin && age <= targetAgeMax;
  });
  
  const candidateUsers = suitableUsers.length > 0 ? suitableUsers : targetUsers;
  const randomUser = candidateUsers[Math.floor(Math.random() * candidateUsers.length)];
  
  const selectedAge = randomUser.birth_year ? currentYear - randomUser.birth_year : '不明';
  console.log(`選択されたAI会員: ${randomUser.name}, 年齢: ${selectedAge}`);
  return randomUser.id;
}

export async function POST(request: Request) {
  try {
    const { source_id } = await request.json();

    if (!source_id) {
      return NextResponse.json(
        { success: false, error: 'ソースIDが指定されていません' },
        { status: 400 }
      );
    }

    // ソースを取得
    const { data: source, error: sourceError } = await supabase
      .from('auto_consultation_sources')
      .select('*')
      .eq('id', source_id)
      .single();

    if (sourceError || !source) {
      return NextResponse.json(
        { success: false, error: 'ソースが見つかりません' },
        { status: 404 }
      );
    }

    // 既に処理済みかチェック
    if (source.is_processed) {
      return NextResponse.json(
        { success: false, error: 'このソースは既に投稿済みです' },
        { status: 400 }
      );
    }

    // 二重投稿防止: 先にis_processedをtrueに更新（楽観的ロック）
    const { data: lockResult, error: lockError } = await supabase
      .from('auto_consultation_sources')
      .update({ 
        is_processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('id', source_id)
      .eq('is_processed', false)  // まだ処理されていない場合のみ更新
      .select();

    if (lockError || !lockResult || lockResult.length === 0) {
      console.log('このソースは既に他のプロセスで処理中です:', source_id);
      return NextResponse.json(
        { success: false, error: 'このソースは既に処理中または処理済みです' },
        { status: 409 }
      );
    }

    // AIでタイトルと本文を修正
    console.log('========================================');
    console.log('【リライト前】');
    console.log('タイトル:', source.source_title);
    console.log('本文:', source.source_content || source.source_title);
    console.log('========================================');
    
    const refined = await refineYahooQuestion(
      source.source_title,
      source.source_content || source.source_title
    );
    
    console.log('========================================');
    console.log('【リライト後】');
    console.log('タイトル:', refined.title);
    console.log('本文:', refined.content);
    console.log('========================================');

    // 記事内容からカテゴリを自動判定（修正後の内容で判定）
    const detectedCategoryId = detectCategory(
      refined.title,
      refined.content
    );

    // 質問者を選択（修正後の内容とカテゴリに適合したAI会員）
    const questionerId = await selectQuestioner(refined.title, refined.content, detectedCategoryId);
    
    console.log(`カテゴリ自動判定: ${detectedCategoryId}`);

    // 締切日時を3週間後に設定
    const deadlineDate = new Date();
    deadlineDate.setDate(deadlineDate.getDate() + 21);

    // 最新のpost IDを取得
    const { data: latestPost } = await supabase
      .from('posts')
      .select('id')
      .order('id', { ascending: false })
      .limit(1)
      .single();

    const nextId = latestPost ? latestPost.id + 1 : 1;

    // 相談投稿を作成（AI修正後のタイトルと本文を使用）
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        id: nextId,
        user_id: questionerId,
        title: refined.title,
        content: refined.content,
        category_id: detectedCategoryId,
        source_url: null, // 重複エラーを避けるためnullに設定
        status: 'published',
        deadline_at: deadlineDate.toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (postError || !post) {
      console.error('投稿作成エラー:', postError);
      return NextResponse.json(
        { success: false, error: '投稿の作成に失敗しました: ' + postError?.message },
        { status: 500 }
      );
    }

    console.log('投稿作成成功:', { postId: post.id, title: post.title });

    // ソースにpost_idを保存（is_processedは既に更新済み）
    const { error: updateError } = await supabase
      .from('auto_consultation_sources')
      .update({ 
        post_id: post.id
      })
      .eq('id', source_id);

    if (updateError) {
      console.error('ソース更新エラー:', updateError);
    } else {
      console.log('ソース更新成功:', { sourceId: source_id, postId: post.id });
    }

    return NextResponse.json({
      success: true,
      postId: post.id,
      message: '投稿を作成しました',
    });

  } catch (error) {
    console.error('投稿作成エラー:', error);
    return NextResponse.json(
      { success: false, error: '投稿の作成に失敗しました' },
      { status: 500 }
    );
  }
}
