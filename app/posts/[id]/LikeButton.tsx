'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { supabase } from '../../lib/supabase';

interface LikeButtonProps {
  postId: number;
}

export default function LikeButton({ postId }: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { data: session } = useSession();
  const userId = session?.user?.id || null;

  useEffect(() => {
    fetchLikeData();
  }, [postId, userId]);

  const fetchLikeData = async () => {
    // いいね数を取得
    const { data: countData } = await supabase
      .from('like_counts')
      .select('like_count')
      .eq('target_id', postId)
      .eq('like_type', 'post')
      .single();

    if (countData) {
      setLikeCount(countData.like_count);
    }

    // ユーザーのいいね状態を確認
    if (userId) {
      const { data: likeData } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', userId)
        .eq('target_id', postId)
        .eq('like_type', 'post')
        .single();

      setIsLiked(!!likeData);
    }
  };

  const handleLike = async () => {
    if (!userId) {
      alert('いいねするにはログインが必要です');
      return;
    }

    setIsLoading(true);

    try {
      if (isLiked) {
        // いいねを削除
        await supabase
          .from('likes')
          .delete()
          .eq('user_id', userId)
          .eq('target_id', postId)
          .eq('like_type', 'post');

        setLikeCount(prev => Math.max(0, prev - 1));
        setIsLiked(false);
      } else {
        // いいねを追加
        await supabase
          .from('likes')
          .insert({
            user_id: userId,
            target_id: postId,
            like_type: 'post',
            created_at: new Date().toISOString()
          });

        setLikeCount(prev => prev + 1);
        setIsLiked(true);
      }

      // カウントを更新
      await supabase
        .from('like_counts')
        .upsert({
          target_id: postId,
          like_type: 'post',
          like_count: isLiked ? likeCount - 1 : likeCount + 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'target_id'
        });
    } catch (error) {
      console.error('いいねエラー:', error);
      alert('いいねに失敗しました');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={`flex items-center gap-1 px-2 py-1 rounded transition-colors ${
        isLiked 
          ? 'text-pink-600' 
          : 'text-gray-600 hover:text-pink-500'
      }`}
    >
      <span className="text-xl">{isLiked ? '❤️' : '🤍'}</span>
      <span className="text-sm">{likeCount}</span>
    </button>
  );
}
