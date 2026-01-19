'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Notification {
  type: string;
  date: string;
  content: string;
  link: string;
  avatar_src: string;
  author_url: string;
  author_name: string;
  comment_id?: number;
  is_read?: boolean;
}

export default function NotificationList() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(false);
  const [offset, setOffset] = useState(0);
  const { data: session } = useSession();

  useEffect(() => {
    if (session?.user?.id) {
      fetchNotifications(0);
    }
  }, [session]);

  const fetchNotifications = async (currentOffset: number) => {
    if (!session?.user?.id) return;

    setLoading(true);
    try {
      const response = await fetch(
        `/api/mypage?userId=${session.user.id}&offset=${currentOffset}&limit=15`
      );
      const data = await response.json();

      if (data.success) {
        if (currentOffset === 0) {
          setNotifications(data.notifications);
        } else {
          setNotifications(prev => [...prev, ...data.notifications]);
        }
        setHasMore(data.hasMore);
        setOffset(currentOffset + 15);
      }
    } catch (error) {
      console.error('通知の取得エラー:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    fetchNotifications(offset);
  };

  const markAsRead = async (notification: Notification) => {
    if (!session?.user?.id || notification.is_read) return;

    try {
      await fetch('/api/mypage/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id,
          notificationType: notification.type,
          notificationId: notification.link
        }),
      });

      // ローカル状態を更新
      setNotifications(prev =>
        prev.map(n =>
          n.link === notification.link && n.type === notification.type
            ? { ...n, is_read: true }
            : n
        )
      );
    } catch (error) {
      console.error('既読マークエラー:', error);
    }
  };

  const markAllAsRead = async () => {
    if (!session?.user?.id) return;

    try {
      // 全ての未読通知を既読にする（読み込まれていない通知も含む）
      const response = await fetch('/api/mypage/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: session.user.id
        }),
      });

      if (response.ok) {
        // ローカル状態を更新
        setNotifications(prev =>
          prev.map(n => ({ ...n, is_read: true }))
        );
        
        // 通知を再取得して最新の状態を反映
        fetchNotifications(0);
      }
    } catch (error) {
      console.error('一括既読マークエラー:', error);
    }
  };

  const getNotificationText = (notification: Notification) => {
    switch (notification.type) {
      case 'admin_post':
        return '運営スタッフからのお知らせ';
      case 'worker_post':
        return 'アンケワークス';
      case 'post_comment':
        return 'さんがあなたの投稿にコメントしました';
      case 'reply':
        return 'さんから返信コメントがありました';
      default:
        return '';
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="text-gray-500">読み込み中...</div>
      </div>
    );
  }

  if (notifications.length === 0) {
    return (
      <div className="bg-white shadow-sm p-10 rounded-lg text-center text-gray-500">
        通知はまだありません
      </div>
    );
  }

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <>
      {notifications.length > 0 && unreadCount > 0 && (
        <div className="flex justify-end mb-3">
          <button
            onClick={markAllAsRead}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
          >
            すべて既読にする ({unreadCount})
          </button>
        </div>
      )}
      
      <ul id="bbsitems" className="m-0 p-0 list-none">
        {notifications.map((notification, index) => (
          <li 
            key={`${notification.type}-${notification.date}-${index}`}
            className="hover:bg-gray-100 m-1.5 px-2 pb-2.5 border-gray-300 border-b transition-colors"
          >
            <div className="flex items-start mb-2 anke_meta_info">
              <div className="shrink-0 mr-1.5 anke_meta_icon">
                <Link href={notification.author_url}>
                  <img 
                    src={notification.avatar_src || '/images/default_avatar.jpg'} 
                    alt="" 
                    className="rounded-full w-5 h-5 object-cover"
                  />
                </Link>
              </div>
              <div className="flex flex-col anke_meta_text">
                <div className="mb-0 text-gray-700 text-sm anke_meta_nickname">
                  {notification.type !== 'admin_post' && notification.type !== 'worker_post' && (
                    <Link href={notification.author_url} className="hover:text-orange-600">
                      {notification.author_name}
                    </Link>
                  )}
                  {getNotificationText(notification)}
                </div>
                <div className="text-gray-400 text-xs anke_meta_date">
                  {formatDate(notification.date)}
                </div>
              </div>
            </div>
            <div className="text-sm anke_meta_commtxt">
              <Link 
                href={notification.link} 
                className="text-gray-800 hover:text-orange-600 no-underline"
                onClick={() => markAsRead(notification)}
              >
                {notification.content}
              </Link>
            </div>
          </li>
        ))}
      </ul>

      {hasMore && (
        <div className="mt-4 text-center">
          <button
            onClick={loadMore}
            disabled={loading}
            className="bg-[#ff6b35] hover:bg-[#ff5722] disabled:opacity-50 px-6 py-2 rounded-lg font-medium text-white disabled:cursor-not-allowed"
          >
            {loading ? '読み込み中...' : 'さらに読み込む'}
          </button>
        </div>
      )}

      {!hasMore && notifications.length > 0 && (
        <div className="mt-4 p-5 text-center text-gray-500 text-sm">
          すべての通知を表示しました
        </div>
      )}
    </>
  );
}
