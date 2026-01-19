import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { userId } = await request.json();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // 全ての通知タイプを取得
    const notificationTypes = ['admin_post', 'worker_post', 'post_comment', 'reply'];
    
    // 各タイプの通知IDを取得して既読にする
    for (const type of notificationTypes) {
      let notificationIds: string[] = [];

      if (type === 'admin_post') {
        // 管理者投稿（user_id: 33）
        const { data: posts } = await supabaseAdmin
          .from('posts')
          .select('id')
          .eq('user_id', 33)
          .in('status', ['publish', 'published']);
        
        notificationIds = posts?.map(p => `/posts/${p.id}`) || [];
      } else if (type === 'worker_post') {
        // 運営者投稿（users.status: 3）
        const { data: posts } = await supabaseAdmin
          .from('posts')
          .select('id, users!inner(status)')
          .eq('users.status', 3)
          .in('status', ['publish', 'published']);
        
        notificationIds = posts?.map(p => `/posts/${p.id}`) || [];
      } else if (type === 'post_comment') {
        // 自分の投稿へのコメント
        const { data: comments } = await supabaseAdmin
          .from('comments')
          .select('id, post_id, posts!inner(user_id)')
          .eq('posts.user_id', userId)
          .eq('status', 'approved');
        
        notificationIds = comments?.map(c => `/posts/${c.post_id}#comment-${c.id}`) || [];
      } else if (type === 'reply') {
        // 自分のコメントへの返信
        const { data: replies } = await supabaseAdmin
          .from('comments')
          .select('id, post_id, parent_id')
          .not('parent_id', 'is', null)
          .neq('parent_id', 0)
          .eq('status', 'approved');
        
        if (replies) {
          // 自分のコメントIDを取得
          const { data: myComments } = await supabaseAdmin
            .from('comments')
            .select('id')
            .eq('user_id', userId);
          
          const myCommentIds = myComments?.map(c => c.id) || [];
          
          // 自分のコメントへの返信のみをフィルタ
          notificationIds = replies
            .filter(r => myCommentIds.includes(r.parent_id))
            .map(r => `/posts/${r.post_id}#comment-${r.id}`);
        }
      }

      // 既読レコードを一括挿入
      if (notificationIds.length > 0) {
        const records = notificationIds.map(id => ({
          user_id: parseInt(userId),
          notification_type: type,
          notification_id: id,
          read_at: new Date().toISOString()
        }));

        console.log(`${type}: ${records.length}件の通知を既読にします`);

        const { error } = await supabaseAdmin
          .from('notification_reads')
          .upsert(records, { 
            onConflict: 'user_id,notification_type,notification_id',
            ignoreDuplicates: false 
          });

        if (error) {
          console.error(`${type}の既読処理エラー:`, error);
        }
      }
    }

    console.log('全ての通知を既読にしました');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Mark all read error:', error);
    return NextResponse.json(
      { success: false, error: '一括既読マークに失敗しました' },
      { status: 500 }
    );
  }
}
