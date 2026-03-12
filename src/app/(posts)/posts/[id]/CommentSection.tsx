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
    avatar_seed?: string | null;
    use_custom_image?: boolean | null;
    marriage?: string | null;
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
  deadlineAt?: string | null;
  bestAnswerPoints?: number;
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

export default function CommentSection({ postId, initialComments, totalCount, postUserId, bestAnswerId, deadlineAt, bestAnswerPoints = 10 }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likingComments, setLikingComments] = useState<Set<number>>(new Set());
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  
  // 現在のユーザーが相談者かどうかを判定
  const isPostOwner = session?.user?.id && postUserId && Number(session.user.id) === Number(postUserId);
  
  // ベストアンサーの回答者を取得
  const bestAnswerComment = bestAnswerId ? comments.find(c => c.id === bestAnswerId) : null;
  const isBestAnswerUser = bestAnswerComment && session?.user?.id && Number(session.user.id) === Number(bestAnswerComment.user_id);
  
  // コメント可能条件
  // 1. ベストアンサーがない場合: 締め切りに関係なく誰でも可能（締め切りは目安）
  // 2. ベストアンサーがある場合: 相談者またはベストアンサー回答者のみ可能
  const canComment = bestAnswerId 
    ? (isPostOwner || isBestAnswerUser)
    : true;

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
    // ログインチェック
    if (!session) {
      if (confirm('いいねするにはログインが必要です。ログインページに移動しますか？')) {
        window.location.href = '/login';
      }
      return;
    }

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
          userId: session.user.id,
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
        <div className="bg-[#fff0eb] mb-6 p-4 border border-[#ffab91] rounded-lg text-center">
          <p className="mb-2 text-[#d84315] text-sm">
            💡 <strong>ログインして回答すると</strong>
          </p>
          <ul className="space-y-1 mb-3 text-[#d84315] text-xs text-left inline-block">
            <li>返信があったらマイページに通知が届きます</li>
            <li>ニックネームとアバターで投稿できます</li>
            <li>投稿した回答の削除・編集が可能です</li>
          </ul>
          <div className="flex justify-center">
            <Link
              href="/login"
              className="inline-flex justify-center items-center bg-[#388e3c] hover:bg-[#2e7d32] px-6 py-3 rounded font-bold text-white text-sm no-underline transition-colors"
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
      
      {/* ベストアンサーがある場合の表示 */}
      {bestAnswerId && !canComment && (
        <div className="mb-6 p-4 font-bold rounded-lg text-center">
          <div className="flex items-center justify-center font-bol gap-2 text-[#f4511e]">
       
            <span className="font-medium">
              【受付終了】{comments.find(c => c.id === bestAnswerId)?.users?.name || 'ゲスト'}さんがベストアンサーに選ばれました！
            </span>
          </div>
        </div>
      )}
      
      {!bestAnswerId && (
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
            let parentComments = comments.filter(c => !c.parent_id || c.parent_id === 0);
            
            // 特定のコメントIDに対するすべての返信を取得する再帰関数
            const getReplies = (parentId: number): Comment[] => {
              return comments.filter(c => c.parent_id === parentId);
            };
            
            // ベストアンサーがある場合、それを最初に表示
            if (bestAnswerId) {
              const bestAnswer = comments.find(c => c.id === bestAnswerId);
              if (bestAnswer && bestAnswer.parent_id && bestAnswer.parent_id !== 0) {
                // ベストアンサーが返信の場合、親コメントを見つけて最初に移動
                const parentComment = comments.find(c => c.id === bestAnswer.parent_id);
                if (parentComment) {
                  parentComments = [
                    parentComment,
                    ...parentComments.filter(c => c.id !== parentComment.id)
                  ];
                }
              } else if (bestAnswer) {
                // ベストアンサーが親コメントの場合、最初に移動
                parentComments = [
                  bestAnswer,
                  ...parentComments.filter(c => c.id !== bestAnswerId)
                ];
              }
            }
            
            // 親コメントごとに返信をグループ化
            return parentComments.map((comment) => {
              const users = comment.users;
              const userName = users?.name || 'ゲスト';
              const getCommentAvatarUrl = () => {
                if (users?.use_custom_image && users?.image) {
                  return users.image;
                }
                if (users?.avatar_seed && (users.avatar_seed.startsWith('f20_') || users.avatar_seed.startsWith('f30_') || users.avatar_seed.startsWith('f40_') || 
                           users.avatar_seed.startsWith('m20_') || users.avatar_seed.startsWith('m30_') || users.avatar_seed.startsWith('m40_') ||
                           users.avatar_seed.startsWith('cat_') || users.avatar_seed.startsWith('dog_') || users.avatar_seed.startsWith('rabbit_') ||
                           users.avatar_seed.startsWith('bear_') || users.avatar_seed.startsWith('other_'))) {
                  return `/images/local-avatars/${users.avatar_seed}.webp`;
                }
                return '/images/local-avatars/default-avatar.webp';
              };
              const avatarUrl = getCommentAvatarUrl();
              const replies = getReplies(comment.id);
              
              const isBestAnswer = bestAnswerId === comment.id;
              
              return (
                <div key={comment.id} id={`reply-${comment.id}`} className={isBestAnswer ? 'border-2 border-[#f4511e] rounded-lg p-3 bg-[#fff8f6] my-4' : ''}>
                  {isBestAnswer && (
                    <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-[#f4511e]">
                      <span className="text-[#f4511e] text-lg">🏆</span>
                      <span className="font-bold text-[#f4511e] text-base">ベストアンサー</span>
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                        <span>{bestAnswerPoints}pt獲得</span>
                        <span className="text-base">🪙</span>
                      </span>
                    </div>
                  )}
                  <div className={`flex flex-wrap py-2.5 ${!isBestAnswer ? 'border-t border-gray-100 pt-2.5' : ''}`}>
                  <div className="shrink-0 mr-1">
                    {comment.user_id ? (
                      <Link href={`/users/${comment.user_id}`}>
                        <div className="w-5 h-5 rounded-full overflow-hidden">
                          <img 
                            src={avatarUrl} 
                            alt={userName} 
                            className="rounded-full w-full h-full object-cover scale-125 hover:opacity-80 transition-opacity cursor-pointer"
                          />
                        </div>
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
                        {users?.marriage && users.marriage !== 'private' && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            {users.marriage === 'single' && '独身'}
                            {users.marriage === 'dating' && '交際中'}
                            {users.marriage === 'married' && '既婚'}
                            {users.marriage === 'divorced' && '離婚経験'}
                            {users.marriage === 'other' && 'その他'}
                          </span>
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
                      
                      {!isBestAnswer && (
                        <Link
                          href={`/report?url=${encodeURIComponent(`https://dokujo.com/posts/${postId}#comment-${comment.id}`)}`}
                          className="text-gray-600 hover:text-red-600 text-xs transition-colors ml-auto"
                        >
                          通報する
                        </Link>
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
                      if (replyUsers?.avatar_seed && (replyUsers.avatar_seed.startsWith('f20_') || replyUsers.avatar_seed.startsWith('f30_') || replyUsers.avatar_seed.startsWith('f40_') || 
                                 replyUsers.avatar_seed.startsWith('m20_') || replyUsers.avatar_seed.startsWith('m30_') || replyUsers.avatar_seed.startsWith('m40_') ||
                                 replyUsers.avatar_seed.startsWith('cat_') || replyUsers.avatar_seed.startsWith('dog_') || replyUsers.avatar_seed.startsWith('rabbit_') ||
                                 replyUsers.avatar_seed.startsWith('bear_') || replyUsers.avatar_seed.startsWith('other_'))) {
                        return `/images/local-avatars/${replyUsers.avatar_seed}.webp`;
                      }
                      return '/images/local-avatars/default-avatar.webp';
                    };
                    const replyAvatarUrl = getReplyAvatarUrl();
                    const nestedReplies = getReplies(reply.id);
                    const isReplyBestAnswer = bestAnswerId === reply.id;
                    
                    return (
                      <div key={reply.id} id={`reply-${reply.id}`} className={`ml-12 mt-2 ${isReplyBestAnswer ? 'border-2 border-[#f4511e] rounded-lg p-3 bg-[#fff8f6]' : ''}`}>
                        {isReplyBestAnswer && (
                          <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-[#f4511e]">
                            <span className="text-[#f4511e] text-lg">🏆</span>
                            <span className="font-bold text-[#f4511e] text-base">ベストアンサー</span>
                            <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                              <span>{bestAnswerPoints}pt獲得</span>
                              <span className="text-base">🪙</span>
                            </span>
                          </div>
                        )}
                        <div className="flex flex-wrap py-2.5">
                          <div className="shrink-0 mr-1">
                            {reply.user_id ? (
                              <Link href={`/users/${reply.user_id}`}>
                                <div className="w-5 h-5 rounded-full overflow-hidden">
                                  <img 
                                    src={replyAvatarUrl} 
                                    alt={replyUserName} 
                                    className="rounded-full w-full h-full object-cover scale-125 hover:opacity-80 transition-opacity cursor-pointer"
                                  />
                                </div>
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
                                {replyUsers?.marriage && replyUsers.marriage !== 'private' && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    {replyUsers.marriage === 'single' && '独身'}
                                    {replyUsers.marriage === 'dating' && '交際中'}
                                    {replyUsers.marriage === 'married' && '既婚'}
                                    {replyUsers.marriage === 'divorced' && '離婚経験'}
                                    {replyUsers.marriage === 'other' && 'その他'}
                                  </span>
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
                              
                              {!isReplyBestAnswer && (
                                <Link
                                  href={`/report?url=${encodeURIComponent(`https://dokujo.com/posts/${postId}#comment-${reply.id}`)}`}
                                  className="text-gray-600 hover:text-red-600 text-xs transition-colors ml-auto"
                                >
                                  通報する
                                </Link>
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
                            if (nestedUsers?.avatar_seed && (nestedUsers.avatar_seed.startsWith('f20_') || nestedUsers.avatar_seed.startsWith('f30_') || nestedUsers.avatar_seed.startsWith('f40_') || 
                                       nestedUsers.avatar_seed.startsWith('m20_') || nestedUsers.avatar_seed.startsWith('m30_') || nestedUsers.avatar_seed.startsWith('m40_') ||
                                       nestedUsers.avatar_seed.startsWith('cat_') || nestedUsers.avatar_seed.startsWith('dog_') || nestedUsers.avatar_seed.startsWith('rabbit_') ||
                                       nestedUsers.avatar_seed.startsWith('bear_') || nestedUsers.avatar_seed.startsWith('other_'))) {
                              return `/images/local-avatars/${nestedUsers.avatar_seed}.webp`;
                            }
                            return '/images/local-avatars/default-avatar.webp';
                          };
                          const nestedAvatarUrl = getNestedAvatarUrl();
                          const isNestedBestAnswer = bestAnswerId === nestedReply.id;
                          
                          return (
                            <div key={nestedReply.id} id={`reply-${nestedReply.id}`} className={`ml-12 mt-2 ${isNestedBestAnswer ? 'border-2 border-[#f4511e] rounded-lg p-3 bg-[#fff8f6]' : ''}`}>
                              {isNestedBestAnswer && (
                                <div className="flex items-center justify-center gap-2 mb-3 pb-3 border-b border-[#f4511e]">
                                  <span className="text-[#f4511e] text-lg">🏆</span>
                                  <span className="font-bold text-[#f4511e] text-base">ベストアンサー</span>
                                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm font-medium">
                                    <span>{bestAnswerPoints}pt獲得</span>
                                
                                  </span>
                                </div>
                              )}
                              <div className="flex flex-wrap py-2.5">
                                <div className="shrink-0 mr-1">
                                  {nestedReply.user_id ? (
                                    <Link href={`/users/${nestedReply.user_id}`}>
                                      <div className="w-5 h-5 rounded-full overflow-hidden">
                                        <img 
                                          src={nestedAvatarUrl} 
                                          alt={nestedUserName} 
                                          className="rounded-full w-full h-full object-cover scale-125 hover:opacity-80 transition-opacity cursor-pointer"
                                        />
                                      </div>
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
                                    
                                    {!isNestedBestAnswer && (
                                      <Link
                                        href={`/report?url=${encodeURIComponent(`https://dokujo.com/posts/${postId}#comment-${nestedReply.id}`)}`}
                                        className="text-gray-600 hover:text-red-600 text-xs transition-colors ml-auto"
                                      >
                                        通報する
                                      </Link>
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
