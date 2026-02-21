'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import GuestAvatar from '@/components/GuestAvatar';

interface Comment {
  id: number;
  content: string;
  created_at: string;
  user_id: number;
  parent_id?: number;
  users?: {
    name: string;
    image?: string | null;
    avatar_style?: string | null;
    avatar_seed?: string | null;
    use_custom_image?: boolean | null;
  };
  like_count?: number;
  is_liked?: boolean;
}

interface CommentSectionProps {
  postId: number;
  initialComments: Comment[];
  totalCount: number;
  postUserId?: number;
  bestAnswerId?: number | null;
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

// クライアント側でのみレンダリングする時間表示コンポーネント
function TimeAgo({ dateString }: { dateString: string }) {
  const [timeAgo, setTimeAgo] = useState<string>('');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setTimeAgo(getTimeAgo(dateString));
  }, [dateString]);

  if (!mounted) {
    return <span className="text-gray-500 text-xs">...</span>;
  }

  return <span className="text-gray-500 text-xs">{timeAgo}前</span>;
}

export default function CommentSection({ postId, initialComments, totalCount, postUserId, bestAnswerId }: CommentSectionProps) {
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
          回答 <span className="text-[#ff6b35]">{totalCount}</span>件
        </h3>
      </div>

      {!session && (
        <div className="bg-blue-50 mb-6 p-4 border border-blue-200 rounded-lg text-center">
          <p className="mb-2 text-blue-800 text-sm">
            💡 <strong>ログインして回答すると</strong>
          </p>
          <ul className="space-y-1 mb-3 text-blue-700 text-xs text-left inline-block">
            <li>返信があったらマイページに通知が届きます</li>
            <li>ニックネームとアバターで投稿できます</li>
            <li>投稿した回答の削除・編集が可能です</li>
          </ul>
          <div className="flex justify-center">
            <Link
              href="/login"
              className="inline-flex justify-center items-center bg-[#ff6b35] hover:bg-[#e58a2f] px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
              style={{ minWidth: '180px' }}
            >
              ログイン
            </Link>
          </div>
          <p className="mt-2 text-gray-600 text-xs">
            ゲストとしても回答可能です（下記フォームから投稿）
          </p>
        </div>
      )}
      
      {/* ベストアンサーがある場合はコメント閉鎖 */}
      {bestAnswerId ? (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
          <div className="flex flex-col items-center gap-2">
            <div className="flex items-center gap-2 text-yellow-700">
              <i className="fas fa-trophy text-yellow-500"></i>
              <span className="font-medium">
                この相談は{comments.find(c => c.id === bestAnswerId)?.users?.name || 'ゲスト'}さんがベストアンサーに選ばれたため、回答受付を終了しました
              </span>
            </div>
            <button
              onClick={() => {
                const element = document.getElementById(`comment-${bestAnswerId}`);
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="mt-2 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-md text-sm font-medium transition-colors"
            >
              ベストアンサーを見る
            </button>
          </div>
        </div>
      ) : (
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
            placeholder={replyingTo ? "返信を入力してください..." : (session ? "回答を入力してください..." : "ゲストとして回答を入力...")}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full"
            rows={3}
            disabled={isSubmitting}
          />
          <div className="flex justify-center mt-3">
            <button
              type="submit"
              disabled={isSubmitting || !newComment.trim()}
              className="inline-flex justify-center items-center bg-[#ff6b35] hover:bg-[#e58a2f] disabled:bg-gray-300 disabled:opacity-50 px-6 py-3 rounded font-bold text-white text-sm disabled:cursor-not-allowed transition-colors"
              style={{ minWidth: '180px' }}
            >
              {isSubmitting ? '投稿中...' : (replyingTo ? '返信する' : '回答する')}
            </button>
          </div>
        </form>
      )}

      <div className="mt-5">
        {comments.length > 0 ? (
          (() => {
            // 親コメントと返信コメントを分離（parent_idが0またはnullの場合は親コメント）
            const parentComments = comments.filter(c => !c.parent_id || c.parent_id === 0);
            
            // 特定のコメントIDに対するすべての返信を取得する再帰関数
            const getReplies = (parentId: number): Comment[] => {
              return comments.filter(c => c.parent_id === parentId);
            };
            
            // 親コメントごとに返信をグループ化
            return parentComments.map((comment) => {
              const users = comment.users;
              const userName = users?.name || 'ゲスト';
              const getCommentAvatarUrl = () => {
                if (users?.use_custom_image && users?.image) {
                  return users.image;
                }
                if (users?.avatar_seed) {
                  const style = users?.avatar_style || 'fun-emoji';
                  return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(users.avatar_seed)}&size=20`;
                }
                return '/images/default-avatar.svg';
              };
              const avatarUrl = getCommentAvatarUrl();
              const replies = getReplies(comment.id);
              
              const isBestAnswer = bestAnswerId === comment.id;
              
              return (
                <div key={comment.id} id={`reply-${comment.id}`}>
                  {isBestAnswer && (
                    <div className="flex items-center gap-2 mb-2 mt-2 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                      <span className="text-yellow-600 text-lg">🏆</span>
                      <span className="font-bold text-yellow-700 text-sm">ベストアンサー</span>
                    </div>
                  )}
                  <div className={`flex flex-wrap py-2.5 border-t border-gray-100 pt-2.5 ${isBestAnswer ? 'bg-yellow-50 -mx-2 px-2 rounded-lg' : ''}`}>
                  <div className="shrink-0 mr-1">
                    {comment.user_id ? (
                      <Link href={`/users/${comment.user_id}`}>
                        <img 
                          src={avatarUrl} 
                          alt={userName} 
                          className="rounded-full w-5 h-5 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                        />
                      </Link>
                    ) : (
                      <GuestAvatar size={20} />
                    )}
                  </div>
                  
                  <div className="flex-1 ml-0">
                    <div className="flex justify-between items-center gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        {comment.user_id ? (
                          <Link href={`/users/${comment.user_id}`} className="font-medium text-gray-600 text-sm hover:text-blue-600 transition-colors">
                            {userName}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-600 text-sm">{userName}</span>
                        )}
                        <TimeAgo dateString={comment.created_at} />
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
                    
                    <div className="flex items-center gap-2">
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
                  
                  {/* 返信コメント（再帰的に表示） */}
                  {replies.map((reply) => {
                    const replyUsers = reply.users;
                    const replyUserName = replyUsers?.name || 'ゲスト';
                    const getReplyAvatarUrl = () => {
                      if (replyUsers?.use_custom_image && replyUsers?.image) {
                        return replyUsers.image;
                      }
                      if (replyUsers?.avatar_seed) {
                        const style = replyUsers?.avatar_style || 'fun-emoji';
                        return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(replyUsers.avatar_seed)}&size=20`;
                      }
                      return '/images/default-avatar.svg';
                    };
                    const replyAvatarUrl = getReplyAvatarUrl();
                    const nestedReplies = getReplies(reply.id);
                    const isReplyBestAnswer = bestAnswerId === reply.id;
                    
                    return (
                      <div key={reply.id} id={`reply-${reply.id}`} className="ml-12 mt-2">
                        {isReplyBestAnswer && (
                          <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                            <span className="text-yellow-600 text-lg">🏆</span>
                            <span className="font-bold text-yellow-700 text-sm">ベストアンサー</span>
                          </div>
                        )}
                        <div className="flex flex-wrap py-2.5">
                          <div className="shrink-0 mr-1">
                            {reply.user_id ? (
                              <Link href={`/users/${reply.user_id}`}>
                                <img 
                                  src={replyAvatarUrl} 
                                  alt={replyUserName} 
                                  className="rounded-full w-5 h-5 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                                />
                              </Link>
                            ) : (
                              <GuestAvatar size={20} />
                            )}
                          </div>
                          
                          <div className="flex-1 ml-0">
                            <div className="flex justify-between items-center gap-2 mb-2">
                              <div className="flex items-center gap-2">
                                {reply.user_id ? (
                                  <Link href={`/users/${reply.user_id}`} className="font-medium text-gray-600 text-sm hover:text-blue-600 transition-colors">
                                    {replyUserName}
                                  </Link>
                                ) : (
                                  <span className="font-medium text-gray-600 text-sm">{replyUserName}</span>
                                )}
                                <TimeAgo dateString={reply.created_at} />
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
                            
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => handleLike(reply.id)}
                                disabled={likingComments.has(reply.id)}
                                className={`inline-flex items-center gap-1 bg-transparent p-0 border-0 text-xl hover:scale-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${reply.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                              >
                                <span className="text-xl">♥</span>
                                <span className="font-medium text-gray-600 text-sm">{reply.like_count || ''}</span>
                              </button>
                              
                              {session && !bestAnswerId && (
                                <button 
                                  onClick={() => setReplyingTo(reply.id)}
                                  className="bg-transparent p-0 border-0 text-gray-600 hover:text-[#ff6b35] text-xs transition-colors cursor-pointer"
                                >
                                  返信
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        {/* さらにネストされた返信 */}
                        {nestedReplies.map((nestedReply) => {
                          const nestedUsers = nestedReply.users;
                          const nestedUserName = nestedUsers?.name || 'ゲスト';
                          const getNestedAvatarUrl = () => {
                            if (nestedUsers?.use_custom_image && nestedUsers?.image) {
                              return nestedUsers.image;
                            }
                            const seed = nestedUsers?.avatar_seed || (nestedReply.user_id ? String(nestedReply.user_id) : 'guest');
                            const style = nestedUsers?.avatar_style || 'big-smile';
                            return `https://api.dicebear.com/9.x/${style}/svg?seed=${encodeURIComponent(seed)}&size=20`;
                          };
                          const nestedAvatarUrl = getNestedAvatarUrl();
                          const isNestedBestAnswer = bestAnswerId === nestedReply.id;
                          
                          return (
                            <div key={nestedReply.id} id={`reply-${nestedReply.id}`} className="ml-12 mt-2">
                              {isNestedBestAnswer && (
                                <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-yellow-50 border border-yellow-300 rounded-lg">
                                  <span className="text-yellow-600 text-lg">🏆</span>
                                  <span className="font-bold text-yellow-700 text-sm">ベストアンサー</span>
                                </div>
                              )}
                              <div className={`flex flex-wrap py-2.5 ${isNestedBestAnswer ? 'bg-yellow-50 -mx-2 px-2 rounded-lg' : ''}`}>
                                <div className="shrink-0 mr-1">
                                  {nestedReply.user_id ? (
                                    <Link href={`/users/${nestedReply.user_id}`}>
                                      <img 
                                        src={nestedAvatarUrl} 
                                        alt={nestedUserName} 
                                        className="rounded-full w-5 h-5 object-cover hover:opacity-80 transition-opacity cursor-pointer"
                                      />
                                    </Link>
                                  ) : (
                                    <GuestAvatar size={20} />
                                  )}
                                </div>
                                
                                <div className="flex-1 ml-0">
                                  <div className="flex justify-between items-center gap-2 mb-2">
                                    <div className="flex items-center gap-2">
                                      {nestedReply.user_id ? (
                                        <Link href={`/users/${nestedReply.user_id}`} className="font-medium text-gray-600 text-sm hover:text-blue-600 transition-colors">
                                          {nestedUserName}
                                        </Link>
                                      ) : (
                                        <span className="font-medium text-gray-600 text-sm">{nestedUserName}</span>
                                      )}
                                      <TimeAgo dateString={nestedReply.created_at} />
                                    </div>
                                    <span className="text-gray-400 hover:text-gray-600 text-xs transition-colors cursor-pointer" 
                                          onClick={() => {
                                            navigator.clipboard.writeText(String(nestedReply.id));
                                            alert('IDをコピーしました!');
                                          }}
                                          title="クリックでコピー">
                                      ID: {nestedReply.id}
                                    </span>
                                  </div>
                                  
                                  <div className="mb-2.5 text-gray-800 leading-relaxed">
                                    <div dangerouslySetInnerHTML={{ __html: nestedReply.content.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') }} />
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={() => handleLike(nestedReply.id)}
                                      disabled={likingComments.has(nestedReply.id)}
                                      className={`inline-flex items-center gap-1 bg-transparent p-0 border-0 text-xl hover:scale-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${nestedReply.is_liked ? 'text-red-500' : 'text-gray-400 hover:text-red-500'}`}
                                    >
                                      <span className="text-xl">♥</span>
                                      <span className="font-medium text-gray-600 text-sm">{nestedReply.like_count || ''}</span>
                                    </button>
                                    
                                    {session && !bestAnswerId && (
                                      <button 
                                        onClick={() => setReplyingTo(nestedReply.id)}
                                        className="bg-transparent p-0 border-0 text-gray-600 hover:text-[#ff6b35] text-xs transition-colors cursor-pointer"
                                      >
                                        返信
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              );
            });
          })()
        ) : (
          <p className="px-5 py-10 text-gray-500 text-center">まだ回答がありません。最初の回答を投稿しましょう！</p>
        )}
      </div>
    </div>
  );
}
