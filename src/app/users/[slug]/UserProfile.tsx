'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface User {
  id: number;
  name: string;
  email: string;
  user_description?: string;
  user_img_url?: string;
  sns_x?: string;
  created_at: string;
  profile_slug?: string;
  avatar_style?: string;
  avatar_seed?: string;
  use_custom_image?: boolean;
}

interface Post {
  id: number;
  title: string;
  created_at: string;
}

interface Comment {
  id: number;
  content: string;
  created_at: string;
  post_id: number;
  parent_id?: number;
  posts: {
    id: number;
    title: string;
    user_id: number;
  };
}

interface Activity {
  type: 'post' | 'comment';
  date: string;
  title: string;
  link: string;
  postTitle?: string;
  commentType?: string;
  authorName?: string;
}

interface UserProfileProps {
  user: User;
  posts: Post[];
  comments: Comment[];
  isOwnProfile: boolean;
}

export default function UserProfile({ user, posts, comments, isOwnProfile }: UserProfileProps) {
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    const allActivities: Activity[] = [];

    // 投稿を追加
    posts.forEach(post => {
      allActivities.push({
        type: 'post',
        date: post.created_at,
        title: post.title,
        link: `/posts/${post.id}`,
        authorName: user.name,
      });
    });

    // コメントを追加
    comments.forEach(comment => {
      const trimmedContent = comment.content.length > 54 
        ? comment.content.substring(0, 54) + '...' 
        : comment.content;
      
      allActivities.push({
        type: 'comment',
        date: comment.created_at,
        title: trimmedContent,
        link: `/posts/${comment.post_id}#comment-${comment.id}`,
        postTitle: comment.posts.title,
        commentType: comment.parent_id ? '返信' : 'コメント',
      });
    });

    // 日付順にソート
    allActivities.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );

    // 最大100件
    setActivities(allActivities.slice(0, 100));
  }, [posts, comments, user.name]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getJoinDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear()}年${date.getMonth() + 1}月`;
  };

  return (
    <>
      <div className="autor__container flex flex-row items-start gap-4 p-2.5">
        <div className="autor__containerPhoto shrink-0">
          <img 
            src={user.use_custom_image && user.user_img_url 
              ? user.user_img_url 
              : `https://api.dicebear.com/9.x/${user.avatar_style || 'big-smile'}/svg?seed=${encodeURIComponent(user.avatar_seed || String(user.id))}&size=80`
            } 
            alt={user.name} 
            className="w-20 h-20 rounded-full object-cover"
          />
        </div>
        
        <div className="autor__container_name flex-1">
          <div className="author_name text-2xl font-extrabold">
            {user.name}<span className="text-base">さん</span>
          </div>
          <p>
            {user.user_description || ''}
            {isOwnProfile && (
              <Link href="/profileset" className="text-orange-500 hover:underline ml-2">
                【プロフィール編集】
              </Link>
            )}
          </p>
        </div>
      </div>
      
      <p className="mt-2">
        {user.sns_x && (
          <a href={user.sns_x} target="_blank" rel="noopener noreferrer" className="inline-block mr-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-twitter-x inline" viewBox="0 0 16 16">
              <path d="M12.6.75h2.454l-5.36 6.142L16 15.25h-4.937l-3.867-5.07-4.425 5.07H.316l5.733-6.57L0 .75h5.063l3.495 4.633L12.601.75Zm-.86 13.028h1.36L4.323 2.145H2.865z" />
            </svg>
          </a>
        )}
        {getJoinDate(user.created_at)}から利用
      </p>
      
      <div className="text-center my-4">最大100件表示</div>
      
      <ul id="bbsitems" className="list-none p-0 m-0">
        {activities.map((activity, index) => (
          <li 
            key={`${activity.type}-${index}`}
            className="m-1.5 border-b border-gray-300 pb-2.5 px-2 hover:bg-gray-100 transition-colors"
          >
            <div className="anke_meta_info flex items-start mb-2">
              <div className="anke_meta_text flex flex-col">
                {activity.type === 'post' ? (
                  <div className="anke_meta_nickname text-sm text-gray-700 mb-0">
                    <Link href={activity.link} className="no-underline text-gray-800 hover:text-orange-600">
                      {activity.authorName}
                    </Link>
                    さんから相談がありました！
                  </div>
                ) : activity.commentType === '返信' ? (
                  <div className="anke_meta_nickname text-sm text-gray-700 mb-0">
                    <Link href={activity.link} className="no-underline text-gray-800 hover:text-orange-600">
                      返信
                    </Link>
                  </div>
                ) : (
                  <div className="anke_meta_nickname text-sm text-gray-700 mb-0">
                    <Link href={activity.link} className="no-underline text-gray-800 hover:text-orange-600">
                      コメント
                    </Link>
                  </div>
                )}
                <div className="anke_meta_date text-xs text-gray-400">
                  {formatDate(activity.date)}
                </div>
              </div>
            </div>
            <div className="anke_meta_commtxt text-sm">
              <Link href={activity.link} className="no-underline text-gray-800 hover:text-orange-600">
                {activity.title}
                {activity.type === 'comment' && activity.postTitle && (
                  <span> ({activity.postTitle})</span>
                )}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      
      {activities.length === 0 && (
        <div className="text-center py-10 text-gray-500">
          まだ投稿やコメントがありません
        </div>
      )}
    </>
  );
}
