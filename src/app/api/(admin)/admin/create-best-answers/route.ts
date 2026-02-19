import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// ベストアンサーを作成するAPI（開発用）
export async function POST() {
  try {
    // 投稿2-7の情報を取得
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select('id, title, content')
      .in('id', [2, 3, 4, 5, 6, 7])
      .order('id', { ascending: true });

    if (postsError || !posts) {
      return NextResponse.json({ error: 'Failed to fetch posts', details: postsError }, { status: 500 });
    }

    const results = [];

    for (const post of posts) {
      // 投稿内容に基づいた丁寧な回答を生成
      const answerContent = generateBestAnswer(post.title, post.content);

      // コメントを作成
      const { data: comment, error: commentError } = await supabase
        .from('comments')
        .insert({
          post_id: post.id,
          user_id: 1, // システムユーザーまたは管理者
          content: answerContent,
          status: 'approved',
          parent_id: 0
        })
        .select('id')
        .single();

      if (commentError) {
        results.push({ post_id: post.id, error: commentError.message });
        continue;
      }

      // postsテーブルのbest_answer_idを更新
      const { error: updateError } = await supabase
        .from('posts')
        .update({ best_answer_id: comment.id })
        .eq('id', post.id);

      if (updateError) {
        results.push({ post_id: post.id, comment_id: comment.id, error: updateError.message });
      } else {
        results.push({ post_id: post.id, comment_id: comment.id, success: true });
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Error creating best answers:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function generateBestAnswer(title: string, content: string): string {
  // タイトルや内容に基づいて適切な回答を生成
  const titleLower = (title || '').toLowerCase();
  
  if (titleLower.includes('恋愛') || titleLower.includes('彼氏') || titleLower.includes('彼女') || titleLower.includes('好き')) {
    return `ご相談ありがとうございます。恋愛のお悩みは本当に辛いですよね。

まず、あなたの気持ちを大切にしてください。恋愛において最も重要なのは、自分自身を理解し、相手を尊重することです。

具体的なアドバイスとしては：
1. 焦らずに、まずは自分の気持ちを整理してみましょう
2. 相手とのコミュニケーションを大切にしてください
3. 一人で抱え込まず、信頼できる人に相談することも大切です

あなたの幸せを心から応援しています。何かあればまたご相談ください。`;
  }
  
  if (titleLower.includes('結婚') || titleLower.includes('婚活') || titleLower.includes('プロポーズ')) {
    return `ご相談いただきありがとうございます。結婚に関するお悩みですね。

結婚は人生の大きな決断ですので、慎重に考えることは当然のことです。

私からのアドバイスです：
1. お互いの価値観や将来のビジョンについて、しっかり話し合いましょう
2. 経済面や生活スタイルについても、オープンに話し合うことが大切です
3. 焦らず、お互いが納得できるタイミングを見つけてください

素敵な未来が訪れることを願っています。`;
  }
  
  if (titleLower.includes('人間関係') || titleLower.includes('友達') || titleLower.includes('職場')) {
    return `ご相談ありがとうございます。人間関係のお悩みは、多くの方が経験されることです。

まず、あなたが悩んでいること自体、相手のことを大切に思っている証拠です。

アドバイスとして：
1. 相手の立場に立って考えてみましょう
2. 直接話し合う機会を作ることも一つの方法です
3. 無理に関係を続ける必要はありません。自分を大切にしてください

あなたにとって良い方向に進むことを願っています。`;
  }
  
  // デフォルトの回答
  return `ご相談いただきありがとうございます。

あなたのお悩み、しっかり受け止めました。一人で抱え込まずに相談してくださったこと、とても勇気のある行動だと思います。

私からのアドバイスです：
1. まずは深呼吸して、自分の気持ちを落ち着かせましょう
2. 問題を整理して、一つずつ解決策を考えてみてください
3. 信頼できる人に相談することも大切です

あなたの幸せを心から応援しています。また何かあればいつでもご相談ください。`;
}
