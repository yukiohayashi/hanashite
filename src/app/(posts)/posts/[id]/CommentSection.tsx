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

interface AIUser {
  id: string | number;
  name: string;
  birth_year: number | null;
}

interface CommentSectionProps {
  postId: number;
  initialComments: Comment[];
  totalCount: number;
  postUserId?: number;
  postUserName?: string;
  bestAnswerId?: number | null;
  deadlineAt?: string | null;
  bestAnswerPoints?: number;
  isAdmin?: boolean;
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

// 再帰的な返信表示コンポーネント（深いネスト対応）
interface RecursiveRepliesProps {
  parentId: number;
  allComments: Comment[];
  depth: number;
  bestAnswerId: number | null;
  bestAnswerPoints: number;
  postId: number;
  handleLike: (commentId: number) => void;
  likingComments: Set<number>;
  setReplyingTo: (id: number | null) => void;
  session: any;
}

function RecursiveReplies({ 
  parentId, 
  allComments, 
  depth, 
  bestAnswerId, 
  bestAnswerPoints, 
  postId,
  handleLike,
  likingComments,
  setReplyingTo,
  session
}: RecursiveRepliesProps) {
  const replies = allComments.filter(c => c.parent_id === parentId);
  
  if (replies.length === 0) return null;
  
  const maxDepth = 10; // 最大ネスト深度
  const indentClass = depth <= maxDepth ? `ml-${Math.min(depth * 4, 48)}` : 'ml-48';
  
  return (
    <>
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
        const isReplyBestAnswer = bestAnswerId === reply.id;
        
        return (
          <div key={reply.id} id={`reply-${reply.id}`} className={`${indentClass} mt-2 ${isReplyBestAnswer ? 'border-2 border-[#f4511e] rounded-lg p-3 bg-[#fff8f6]' : ''}`}>
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
                
                <div className="mb-2.5 text-gray-800 text-base leading-relaxed">
                  <div dangerouslySetInnerHTML={{ __html: reply.content.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') }} />
                </div>
                
                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleLike(reply.id)}
                    disabled={likingComments.has(reply.id)}
                    className="inline-flex items-center gap-1 bg-transparent p-0 border-0 text-xl hover:scale-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ color: '#ef4444' }}
                  >
                    <span className="text-xl">{reply.is_liked ? '♥' : '♡'}</span>
                    <span className="text-sm" style={{ color: '#ef4444' }}>{reply.like_count || ''}</span>
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
            
            {/* さらに深い階層の返信を再帰的に表示 */}
            <RecursiveReplies 
              parentId={reply.id} 
              allComments={allComments} 
              depth={depth + 1}
              bestAnswerId={bestAnswerId}
              bestAnswerPoints={bestAnswerPoints}
              postId={postId}
              handleLike={handleLike}
              likingComments={likingComments}
              setReplyingTo={setReplyingTo}
              session={session}
            />
          </div>
        );
      })}
    </>
  );
}

export default function CommentSection({ postId, initialComments, totalCount, postUserId, postUserName, bestAnswerId, deadlineAt, bestAnswerPoints = 10, isAdmin = false }: CommentSectionProps) {
  const { data: session } = useSession();
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [likingComments, setLikingComments] = useState<Set<number>>(new Set());
  const [replyingTo, setReplyingTo] = useState<number | null>(null);
  const [currentBestAnswerId, setCurrentBestAnswerId] = useState<number | null>(bestAnswerId || null);
  const [isSettingBestAnswer, setIsSettingBestAnswer] = useState(false);
  const [commentAsPostOwner, setCommentAsPostOwner] = useState(false);
  const [aiUsers, setAiUsers] = useState<AIUser[]>([]);
  const [selectedAiUserId, setSelectedAiUserId] = useState<string | number | null>(null);
  
  // deadlineAtを使用（lint警告回避）
  const _deadlineAt = deadlineAt;

  // 管理者の場合、AI会員一覧を取得
  useEffect(() => {
    if (!isAdmin) return;
    const fetchAiUsers = async () => {
      try {
        const res = await fetch('/api/users/ai-generate?list=true');
        const data = await res.json();
        console.log('AI会員データ:', data);
        if (data.users) {
          console.log('AI会員数:', data.users.length);
          setAiUsers(data.users);
        }
      } catch (e) {
        console.error('AI会員取得エラー:', e);
      }
    };
    fetchAiUsers();
  }, [isAdmin]);
  
  // 現在のユーザーが相談者かどうかを判定
  const isPostOwner = session?.user?.id && postUserId && Number(session.user.id) === Number(postUserId);
  
  // ベストアンサーの回答者を取得
  const bestAnswerComment = bestAnswerId ? comments.find(c => c.id === bestAnswerId) : null;
  const isBestAnswerUser = bestAnswerComment && session?.user?.id && Number(session.user.id) === Number(bestAnswerComment.user_id);
  
  // コメント可能条件
  // 1. ベストアンサーがない場合: 締め切りに関係なく誰でも可能（締め切りは目安）
  // 2. ベストアンサーがある場合: 相談者、ベストアンサー回答者、または管理者のみ可能
  const canComment = currentBestAnswerId 
    ? (isPostOwner || isBestAnswerUser || isAdmin)
    : true;

  // ベストアンサー決定（運営者用）
  const handleSetBestAnswer = async (commentId: number) => {
    if (!isAdmin || isSettingBestAnswer) return;
    
    if (!confirm('このコメントをベストアンサーに設定しますか？')) return;
    
    setIsSettingBestAnswer(true);
    try {
      const response = await fetch(`/api/posts/${postId}/best-answer`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ best_answer_id: commentId }),
      });
      
      if (response.ok) {
        setCurrentBestAnswerId(commentId);
        window.location.reload();
      } else {
        const data = await response.json();
        alert('ベストアンサーの設定に失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (error) {
      alert('ベストアンサーの設定に失敗しました: ' + String(error));
    } finally {
      setIsSettingBestAnswer(false);
    }
  };

  // ベストアンサー取り消し（運営者用）
  const handleRemoveBestAnswer = async () => {
    if (!isAdmin || isSettingBestAnswer) return;
    
    if (!confirm('ベストアンサーを取り消しますか？（付与されたポイントも削除されます）')) return;
    
    setIsSettingBestAnswer(true);
    try {
      const response = await fetch(`/api/posts/${postId}/best-answer`, {
        method: 'DELETE',
      });
      
      if (response.ok) {
        setCurrentBestAnswerId(null);
        window.location.reload();
      } else {
        const data = await response.json();
        alert('ベストアンサーの取り消しに失敗しました: ' + (data.error || '不明なエラー'));
      }
    } catch (error) {
      alert('ベストアンサーの取り消しに失敗しました: ' + String(error));
    } finally {
      setIsSettingBestAnswer(false);
    }
  };

  // deadlineAtを使用（未使用警告回避）
  void _deadlineAt;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newComment.trim() || isSubmitting) return;

    setIsSubmitting(true);

    try {
      // 管理者がAI会員としてコメントする場合
      let effectiveUserId: number | string | null = session?.user?.id || null;
      if (isAdmin && selectedAiUserId) {
        // ゲストとして投稿する場合はuserIdをnullに
        if (selectedAiUserId === 'guest') {
          effectiveUserId = null;
        } else {
          effectiveUserId = selectedAiUserId;
        }
      } else if (isAdmin && commentAsPostOwner && postUserId) {
        effectiveUserId = postUserId;
      }

      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          content: newComment,
          parentId: replyingTo,
          userId: effectiveUserId,
        }),
      });

      const data = await response.json();

      if (data.success && data.comment) {
        setComments([data.comment, ...comments]);
        setNewComment('');
        setReplyingTo(null);
        setCommentAsPostOwner(false);
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

      {!session && !bestAnswerId && (
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

      {/* ベストアンサー後の管理者用コメントフォーム */}
      {bestAnswerId && canComment && isAdmin && (
        <div className="mb-6">
          <div className="mb-4 p-4 font-bold rounded-lg text-center">
            <div className="flex items-center justify-center font-bol gap-2 text-[#f4511e]">
              <span className="font-medium">
                【受付終了】{comments.find(c => c.id === bestAnswerId)?.users?.name || 'ゲスト'}さんがベストアンサーに選ばれました！
              </span>
            </div>
          </div>
          <form onSubmit={handleSubmit}>
            <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <label className="flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={commentAsPostOwner}
                  onChange={(e) => {
                    setCommentAsPostOwner(e.target.checked);
                    if (e.target.checked) setSelectedAiUserId(null);
                  }}
                  className="mr-2 rounded focus:ring-orange-400 w-4 h-4 text-orange-500"
                />
                <span className="text-sm text-gray-700">
                  <strong>{postUserName || '相談者'}</strong>としてコメントする（管理者機能）
                </span>
              </label>
            </div>
            {aiUsers.length > 0 && (
              <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <label className="block text-sm text-gray-700 mb-1 font-medium">AI会員として投稿</label>
                <select
                  value={selectedAiUserId?.toString() || ''}
                  onChange={(e) => {
                    console.log('選択された値:', e.target.value);
                    const val = e.target.value === '' ? null : e.target.value;
                    console.log('設定する値:', val);
                    setSelectedAiUserId(val);
                    if (val) setCommentAsPostOwner(false);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                >
                  <option value="">自分として投稿</option>
                  <option value="guest">ゲストとして投稿</option>
                  {aiUsers.filter(u => u.name !== '匿名').map((u) => {
                    const currentYear = new Date().getFullYear();
                    const ageGroup = u.birth_year ? `${Math.floor((currentYear - u.birth_year) / 10) * 10}代` : '';
                    return (
                      <option key={u.id} value={u.id.toString()}>
                        {u.name}{ageGroup ? ` ${ageGroup}` : ''}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={commentAsPostOwner ? `${postUserName || '相談者'}として返信を入力...` : "管理者として返信を入力..."}
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
                {isSubmitting ? '投稿中...' : (commentAsPostOwner ? `${postUserName || '相談者'}として返信` : '返信する')}
              </button>
            </div>
          </form>
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
          {isAdmin && aiUsers.length > 0 && (
            <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <label className="block text-sm text-gray-700 mb-1 font-medium">AI会員として投稿（管理者機能）</label>
              <select
                value={selectedAiUserId?.toString() || ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : e.target.value;
                  setSelectedAiUserId(val);
                  if (val) setCommentAsPostOwner(false);
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
                <option value="">自分として投稿</option>
                <option value="guest">ゲストとして投稿</option>
                {aiUsers.filter(u => u.name !== '匿名').map((u) => {
                  const currentYear = new Date().getFullYear();
                  const ageGroup = u.birth_year ? `${Math.floor((currentYear - u.birth_year) / 10) * 10}代` : '';
                  return (
                    <option key={u.id} value={u.id.toString()}>
                      {u.name}{ageGroup ? ` ${ageGroup}` : ''}
                    </option>
                  );
                })}
              </select>
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
                      {isAdmin && (
                        <button
                          onClick={handleRemoveBestAnswer}
                          disabled={isSettingBestAnswer}
                          className="ml-2 px-2 py-1 bg-red-100 text-red-600 text-xs rounded hover:bg-red-200 transition-colors disabled:opacity-50"
                        >
                          {isSettingBestAnswer ? '処理中...' : '取り消し'}
                        </button>
                      )}
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
                        {users?.marriage ? (
                          users.marriage === 'private' ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              非公開
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              {users.marriage === 'single' && '独身'}
                              {users.marriage === 'dating' && '交際中'}
                              {users.marriage === 'married' && '既婚'}
                              {users.marriage === 'divorced' && '離婚経験'}
                              {users.marriage === 'other' && 'その他'}
                            </span>
                          )
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                            非公開
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
                    
                    <div className="mb-2.5 text-gray-800 text-base leading-relaxed">
                      <div dangerouslySetInnerHTML={{ __html: comment.content.replace(/\\n/g, '<br>').replace(/\n/g, '<br>') }} />
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleLike(comment.id)}
                        disabled={likingComments.has(comment.id)}
                        className="inline-flex items-center gap-1 bg-transparent p-0 border-0 text-xl hover:scale-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ color: '#ef4444' }}
                      >
                        <span className="text-xl">{comment.is_liked ? '♥' : '♡'}</span>
                        <span className="text-sm" style={{ color: '#ef4444' }}>{comment.like_count || ''}</span>
                      </button>
                      
                      {session && (
                        <button 
                          onClick={() => setReplyingTo(comment.id)}
                          className="bg-transparent p-0 border-0 text-gray-600 hover:text-[#ff6b35] text-xs transition-colors cursor-pointer"
                        >
                          返信
                        </button>
                      )}
                      
                      {!isBestAnswer && isAdmin && !currentBestAnswerId && (
                        <button
                          onClick={() => handleSetBestAnswer(comment.id)}
                          disabled={isSettingBestAnswer}
                          className="px-2 py-1 bg-gray-200 text-gray-600 text-xs rounded hover:bg-gray-300 transition-colors disabled:opacity-50"
                        >
                          {isSettingBestAnswer ? '処理中...' : 'ベストアンサーにする'}
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
                                {replyUsers?.marriage ? (
                                  replyUsers.marriage === 'private' ? (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                      非公開
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                      {replyUsers.marriage === 'single' && '独身'}
                                      {replyUsers.marriage === 'dating' && '交際中'}
                                      {replyUsers.marriage === 'married' && '既婚'}
                                      {replyUsers.marriage === 'divorced' && '離婚経験'}
                                      {replyUsers.marriage === 'other' && 'その他'}
                                    </span>
                                  )
                                ) : (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                                    非公開
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
                                className="inline-flex items-center gap-1 bg-transparent p-0 border-0 text-xl hover:scale-110 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{ color: '#ef4444' }}
                              >
                                <span className="text-xl">{reply.is_liked ? '♥' : '♡'}</span>
                                <span className="text-sm" style={{ color: '#ef4444' }}>{reply.like_count || ''}</span>
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
                        
                        {/* さらにネストされた返信（再帰的に表示） */}
                        <RecursiveReplies 
                          parentId={reply.id} 
                          allComments={comments} 
                          depth={2}
                          bestAnswerId={bestAnswerId ?? null}
                          bestAnswerPoints={bestAnswerPoints}
                          postId={postId}
                          handleLike={handleLike}
                          likingComments={likingComments}
                          setReplyingTo={setReplyingTo}
                          session={session}
                        />
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
