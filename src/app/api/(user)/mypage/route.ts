import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const offset = parseInt(searchParams.get('offset') || '0');
    const limit = parseInt(searchParams.get('limit') || '15');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'ユーザーIDが必要です' },
        { status: 400 }
      );
    }

    const notifications: any[] = [];

    // 1. 運営スタッフからのお知らせ（user_id=33の投稿）全件取得
    const { data: adminPosts } = await supabase
      .from('posts')
      .select('id, title, created_at')
      .eq('user_id', 33)
      .in('status', ['publish', 'published'])
      .order('created_at', { ascending: false });

    // 運営スタッフのアバター画像を取得
    const { data: adminUser } = await supabase
      .from('users')
      .select('user_img_url')
      .eq('id', 33)
      .single();

    if (adminPosts) {
      adminPosts.forEach(post => {
        notifications.push({
          type: 'admin_post',
          date: post.created_at,
          content: post.title.length > 40 ? post.title.substring(0, 40) + '...' : post.title,
          link: `/posts/${post.id}`,
          avatar_src: adminUser?.user_img_url || '',
          author_url: '/users/33',
          author_name: '運営スタッフ'
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
        .select('id, content, created_at, user_id, post_id, parent_id')
        .in('parent_id', commentIds)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (replies) {
        for (const reply of replies) {
          const { data: user } = await supabase
            .from('users')
            .select('name, user_img_url')
            .eq('id', reply.user_id)
            .single();

          notifications.push({
            type: 'reply',
            date: reply.created_at,
            content: reply.content.length > 40 ? reply.content.substring(0, 40) + '...' : reply.content,
            link: `/posts/${reply.post_id}#anke-comment-${reply.id}`,
            avatar_src: user?.user_img_url || '',
            author_url: `/users/${reply.user_id}`,
            author_name: user?.name || '匿名さん',
            comment_id: reply.id
          });
        }
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
        .select('id, content, created_at, user_id, post_id')
        .in('post_id', postIds)
        .eq('status', 'approved')
        .eq('parent_id', 0)
        .neq('user_id', userId)
        .order('created_at', { ascending: false });

      if (postComments) {
        for (const comment of postComments) {
          const { data: user } = await supabase
            .from('users')
            .select('name, user_img_url')
            .eq('id', comment.user_id)
            .single();

          notifications.push({
            type: 'post_comment',
            date: comment.created_at,
            content: comment.content.length > 40 ? comment.content.substring(0, 40) + '...' : comment.content,
            link: `/posts/${comment.post_id}#anke-comment-${comment.id}`,
            avatar_src: user?.user_img_url || '',
            author_url: `/users/${comment.user_id}`,
            author_name: user?.name || '匿名さん',
            comment_id: comment.id
          });
        }
      }
    }

    // 日付順にソート
    notifications.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // 既読状態を取得
    const { data: readNotifications } = await supabase
      .from('notification_reads')
      .select('notification_type, notification_id')
      .eq('user_id', userId);

    const readSet = new Set(
      (readNotifications || []).map(r => `${r.notification_type}-${r.notification_id}`)
    );

    // 各通知に既読フラグを追加
    const notificationsWithReadStatus = notifications.map(n => {
      const notificationKey = `${n.type}-${n.link}`;
      return {
        ...n,
        is_read: readSet.has(notificationKey)
      };
    });

    // ページネーション
    const total = notificationsWithReadStatus.length;
    const paginatedNotifications = notificationsWithReadStatus.slice(offset, offset + limit);
    
    // 未読数をカウント
    const unreadCount = notificationsWithReadStatus.filter(n => !n.is_read).length;

    return NextResponse.json({
      success: true,
      notifications: paginatedNotifications,
      total,
      unreadCount,
      hasMore: offset + limit < total
    });
  } catch (error) {
    console.error('Notifications error:', error);
    return NextResponse.json(
      { success: false, error: '通知の取得に失敗しました' },
      { status: 500 }
    );
  }
}
