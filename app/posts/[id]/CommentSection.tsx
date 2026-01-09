'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: number;
  parent_id?: number;
  users?: {
    name: string;
    worker_img_url?: string | null;
  };
  like_count?: number;
  is_liked?: boolean;
}

interface CommentSectionProps {
  postId: number;
  initialComments: Comment[];
  totalCount: number;
}

function getTimeAgo(dateString: string): string {
  const now = new Date();
  const past = new Date(dateString);
  const diffMs = now.getTime() - past.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  const diffWeek = Math.floor(diffDay / 7);
  const diffMonth = Math.floor(diffDay / 30);
  const diffYear = Math.floor(diffDay / 365);

  if (diffYear > 0) return `${diffYear}年`;
  if (diffMonth > 0) return `${diffMonth}ヶ月`;
  if (diffWeek >= 4) return `${diffWeek}週間`;
  if (diffDay > 0) return `${diffDay}日`;
  if (diffHour > 0) return `${diffHour}時間`;
  if (diffMin > 0) return `${diffMin}分`;
  return '1分未満';
}

export default function CommentSection({ postId, initialComments, totalCount }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likingComments, setLikingComments] = useState<Set<number>>(new Set());
  const [replyingTo, setReplyingTo] = useState<number | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          content: newComment,
          parentId: replyingTo,
          userId: session?.user?.id || null,
        }),
      });

      const data = await response.json();

      if (data.success && data.comment) {
        setComments([data.comment, ...comments]);
        setNewComment('');
        setReplyingTo(null);
      } else {
        alert('コメントの投稿に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (error) {
      alert('コメントの投稿に失敗しました: ' + String(error));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLike = async (commentId: number) => {
    if (likingComments.has(commentId)) return;

    setLikingComments(prev => new Set(prev).add(commentId));

    try {
      const response = await fetch('/api/comment-likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          commentId,
          userId: session?.user?.id || null,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // コメントのいいね数を更新
        setComments(prevComments =>
          prevComments.map(comment =>
            comment.id === commentId
              ? { ...comment, like_count: (comment.like_count || 0) + (data.liked ? 1 : -1), is_liked: data.liked }
              : comment
          )
        );
      } else {
        alert('いいねの処理に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (error) {
      alert('いいねの処理に失敗しました: ' + String(error));
    } finally {
      setLikingComments(prev => {
        const next = new Set(prev);
        next.delete(commentId);
        return next;
      });
    }
  };

  return (
    <div className="bg-white shadow-sm my-2.5 p-2.5 rounded-lg">
      <div className="mb-2.5 pb-1.5 border-gray-100 border-b-2">
        <h3 className="m-0 font-bold text-gray-800 text-base">
          コメント <span className="text-[#ff6b35]">{totalCount}</span>件
        </h3>
      </div>

      {!session && (
        <div className="bg-blue-50 mb-6 p-4 border border-blue-200 rounded-lg">
          <p className="mb-2 text-blue-800 text-sm">
            💡 <strong>ログインしてコメントすると</strong>
          </p>
          <ul className="space-y-1 mb-3 pl-5 text-blue-700 text-xs">
            <li>返信があったらマイページに通知が届きます</li>
            <li>ニックネームとアバターで投稿できます</li>
            <li>投稿したコメントの削除・編集が可能です</li>
          </ul>
          <Link
            href="/login"
            className="inline-block bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg text-white text-sm"
          >
            ログインしてコメントする
          </Link>
          <p className="mt-2 text-gray-600 text-xs">
            ゲストとしてもコメント可能です（下記フォームから投稿）
          </p>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="mb-6">
        {replyingTo && (
          <div className="flex justify-between items-center mb-2 p-2 bg-gray-100 rounded">
            <span className="text-gray-600 text-sm">ID: {replyingTo} への返信</span>
            <button
              type="button"
              onClick={() => setReplyingTo(null)}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              ✕ キャンセル
            </button>
          </div>
        )}
        <textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={replyingTo ? "返信を入力してください..." : (session ? "コメントを入力してください..." : "ゲストとしてコメントを入力...")}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
          rows={3}
          disabled={isSubmitting}
        />
        <div className="flex justify-center mt-3">
          <button
            type="submit"
            disabled={isSubmitting || !newComment.trim()}
            className="bg-[#ff6b35] hover:bg-[#ff5722] disabled:bg-gray-300 disabled:opacity-50 px-6 py-2 rounded-lg font-medium text-white disabled:cursor-not-allowed transition-colors"
            style={{ backgroundColor: isSubmitting || !newComment.trim() ? undefined : '#ff6b35' }}
          >
            {isSubmitting ? '投稿中...' : (replyingTo ? '返信する' : 'コメントする')}
          </button>
        </div>
      </form>

      <div className="mt-5">
        {comments.length > 0 ? (
          (() => {
            // 親コメントと返信コメントを分離（parent_idが0またはnullの場合は親コメント）
            const parentComments = comments.filter(c => !c.parent_id || c.parent_id === 0);
            const replyComments = comments.filter(c => c.parent_id && c.parent_id !== 0);
            
            // 親コメントごとに返信をグループ化
            return parentComments.map((comment) => {
              const users = comment.users;
              const userName = users?.name || 'ゲスト';
              const avatarUrl = users?.worker_img_url || 'https://anke.jp/wp-content/themes/anke/images/default_avatar.jpg';
              const timeAgo = getTimeAgo(comment.created_at);
              const replies = replyComments.filter(r => r.parent_id === comment.id);
              
              return (
                <div key={comment.id}>
                  <div className="flex flex-wrap py-2.5 border-t border-gray-100 pt-2.5">
                  <div className="flex-shrink-0 mr-2.5">
                    <img 
                      src={avatarUrl} 
                      alt={userName} 
                      className="rounded-full w-5 h-5 object-cover"
                    />
                  </div>
                  
                  <div className="flex-1 ml-2">
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-600 text-sm">{userName}</span>
                        <span className="text-gray-500 text-xs">{timeAgo}前</span>
                      </div>
                      <span className="text-gray-400 hover:text-gray-600 text-xs transition-colors cursor-pointer" 
                            onClick={() => {
                              navigator.clipboard.writeText(String(comment.id));
                              alert('IDをコピーしました!');
                            }}
                            title="クリックでコピー">
                        ID: {comment.id}
                      </span>
                    </div>
                    
                    <div className="mb-2.5 text-gray-800 leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: comment.content.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') }} />
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => handleLike(comment.id)}
                        disabled={likingComments.has(comment.id)}
                        className={`inline-flex items-center gap-1 bg-transparent p-0 border-0 text-xl hover:scale-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${comment.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                      >
                        <span className="text-xl">♥</span>
                        <span className="font-medium text-gray-600 text-sm">{comment.like_count || ''}</span>
                      </button>
                      
                      {session && (
                        <button 
                          onClick={() => setReplyingTo(comment.id)}
                          className="bg-transparent p-0 border-0 text-gray-600 hover:text-[#ff6b35] text-xs transition-colors cursor-pointer"
                        >
                          返信
                        </button>
                      )}
                    </div>
                  </div>
                </div>
                  
                  {/* 返信コメント */}
                  {replies.map((reply) => {
                    const replyUsers = reply.users;
                    const replyUserName = replyUsers?.name || 'ゲスト';
                    const replyAvatarUrl = replyUsers?.worker_img_url || 'https://anke.jp/wp-content/themes/anke/images/default_avatar.jpg';
                    const replyTimeAgo = getTimeAgo(reply.created_at);
                    
                    return (
                      <div key={reply.id} className="ml-12 mt-2">
                        <div className="flex flex-wrap py-2.5">
                          <div className="flex-shrink-0 mr-2.5">
                            <img 
                              src={replyAvatarUrl} 
                              alt={replyUserName} 
                              className="rounded-full w-5 h-5 object-cover"
                            />
                          </div>
                          
                          <div className="flex-1 ml-2">
                            <div className="flex justify-between items-center gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-600 text-sm">{replyUserName}</span>
                                <span className="text-gray-500 text-xs">{replyTimeAgo}前</span>
                              </div>
                              <span className="text-gray-400 hover:text-gray-600 text-xs transition-colors cursor-pointer" 
                                    onClick={() => {
                                      navigator.clipboard.writeText(String(reply.id));
                                      alert('IDをコピーしました!');
                                    }}
                                    title="クリックでコピー">
                                ID: {reply.id}
                              </span>
                            </div>
                            
                            <div className="mb-2.5 text-gray-800 leading-relaxed">
                              <div dangerouslySetInnerHTML={{ __html: reply.content.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') }} />
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <button 
                                onClick={() => handleLike(reply.id)}
                                disabled={likingComments.has(reply.id)}
                                className={`inline-flex items-center gap-1 bg-transparent p-0 border-0 text-xl hover:scale-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${reply.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                              >
                                <span className="text-xl">♥</span>
                                <span className="font-medium text-gray-600 text-sm">{reply.like_count || ''}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()
        ) : (
          <p className="px-5 py-10 text-gray-500 text-center">まだコメントがありません。最初のコメントを投稿しましょう！</p>
        )}
      </div>
    </div>
  );
}
