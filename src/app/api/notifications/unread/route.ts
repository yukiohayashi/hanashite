import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    // 全通知を取得
    const notifications: any[] = [];

    // 1. 運営スタッフからのお知らせ（全件取得）
    const { data: adminPosts } = await supabase
      .from('posts')
      .select('id, created_at')
      .eq('user_id', 33)
      .in('status', ['publish', 'published'])
      .order('created_at', { ascending: false });

    if (adminPosts) {
      adminPosts.forEach(post => {
        notifications.push({
          type: 'admin_post',
          link: `/posts/${post.id}`
        });
      });
    }

    // 2. 自分のコメントへの返信
    const { data: userComments } = await supabase
      .from('comments')
      .select('id')
      .eq('user_id', userId)
      .eq('status', 'approved');

    if (userComments && userComments.length > 0) {
      const commentIds = userComments.map(c => c.id);
      
      const { data: replies } = await supabase
        .from('comments')
        .select('id, post_id')
        .in('parent_id', commentIds)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (replies) {
        replies.forEach(reply => {
          notifications.push({
            type: 'reply',
            link: `/posts/${reply.post_id}#anke-comment-${reply.id}`
          });
        });
      }
    }

    // 3. 自分の投稿へのコメント
    const { data: userPosts } = await supabase
      .from('posts')
      .select('id')
      .eq('user_id', userId)
      .in('status', ['publish', 'published']);

    if (userPosts && userPosts.length > 0) {
      const postIds = userPosts.map(p => p.id);
      
      const { data: postComments } = await supabase
        .from('comments')
        .select('id, post_id')
        .in('post_id', postIds)
        .eq('status', 'approved')
        .eq('parent_id', 0)
        .neq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postComments) {
        postComments.forEach(comment => {
          notifications.push({
            type: 'post_comment',
            link: `/posts/${comment.post_id}#anke-comment-${comment.id}`
          });
        });
      }
    }

    // 既読状態を取得
    const { data: readNotifications } = await supabase
      .from('notification_reads')
      .select('notification_type, notification_id')
      .eq('user_id', userId);

    const readSet = new Set(
      (readNotifications || []).map(r => `${r.notification_type}-${r.notification_id}`)
    );

    // 未読通知数をカウント
    const unreadCount = notifications.filter(n => {
      const notificationKey = `${n.type}-${n.link}`;
      return !readSet.has(notificationKey);
    }).length;

    return NextResponse.json({
      count: unreadCount,
    });
  } catch (error) {
    console.error('未読通知API エラー:', error);
    return NextResponse.json(
      { error: '未読通知数の取得中にエラーが発生しました' },
      { status: 500 }
    );
  }
}
