'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '../lib/supabase';

interface Comment {
  id: number;
  post_id: number;
  content: string;
  created_at: string;
  posts: {
    title: string;
  } | null;
}

interface Post {
  id: number;
  title: string;
  created_at: string;
}

export default function RightSidebar() {
  const [latestComments, setLatestComments] = useState<Comment[]>([]);
  const [latestPosts, setLatestPosts] = useState<Post[]>([]);
  const [adminPosts, setAdminPosts] = useState<Post[]>([]);

  useEffect(() => {
    // 最新コメントを取得
    const fetchComments = async () => {
      // commentsとpostsを別々に取得して結合
      const { data: commentsData, error } = await supabase
        .from('comments')
        .select('id, post_id, content, created_at')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) {
        console.error('コメント取得エラー:', error);
        return;
      }
      
      if (commentsData && commentsData.length > 0) {
        // 投稿IDのリストを取得
        const postIds = commentsData.map(c => c.post_id);
        
        // 投稿タイトルを取得
        const { data: postsData } = await supabase
          .from('posts')
          .select('id, title')
          .in('id', postIds);
        
        // ユーザーIDのリストを取得
        const userIds = [...new Set(commentsData.map(c => c.user_id).filter(id => id !== null))];
        
        // ユーザー情報を取得
        const { data: usersData } = await supabase
          .from('users')
          .select('id, name')
          .in('id', userIds);
        
        // コメントと投稿とユーザーを結合
        const formattedData = commentsData.map(comment => ({
          ...comment,
          posts: postsData?.find(p => p.id === comment.post_id) || null,
          user_name: usersData?.find(u => u.id === comment.user_id)?.name || null
        }));
        
        setLatestComments(formattedData);
      }
    };

    // 運営からお知らせを取得（user_id=33の投稿）
    const fetchAdminPosts = async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title, created_at')
        .eq('user_id', 33)
        .in('status', ['publish', 'published'])
        .order('created_at', { ascending: false })
        .limit(2);
      
      if (data) {
        setAdminPosts(data);
      }
    };

    // 最新アンケートを取得
    const fetchPosts = async () => {
      const { data } = await supabase
        .from('posts')
        .select('id, title, created_at')
        .in('status', ['publish', 'published'])
        .order('created_at', { ascending: false })
        .limit(10);
      
      if (data) {
        setLatestPosts(data);
      }
    };

    fetchComments();
    fetchAdminPosts();
    fetchPosts();
  }, []);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getFullYear().toString().slice(-2)}/${date.getMonth() + 1}/${date.getDate()}`;
  };

  const truncateText = (text: string, maxLength: number) => {
    if (text.length > maxLength) {
      return text.substring(0, maxLength) + '...';
    }
    return text;
  };

  return (
    <div className="space-y-4">
      {/* 運営からお知らせ */}
      <div>
        <h3 className="mb-2 px-2 font-bold text-base" style={{ color: '#ff6b35' }}>
          運営からお知らせ <i className="fa fa-info-circle" aria-hidden="true"></i>
        </h3>
        <ul className="bg-white shadow m-0 p-0 rounded-lg list-none">
          {adminPosts.length > 0 ? (
            adminPosts.map((post) => (
              <li key={post.id} className="border-gray-200 border-b last:border-b-0">
                <Link href={`/posts/${post.id}`} className="block hover:bg-gray-100 px-2 py-2 transition-colors">
                  <span className="text-gray-900">{post.title}</span>
                  <br />
                  <span className="text-gray-500 text-xs">{formatDate(post.created_at)}</span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-2 py-2 text-gray-600 text-sm">お知らせはありません</li>
          )}
        </ul>
      </div>

      {/* 最新コメント */}
      <div>
        <h3 className="mt-4 mb-2 px-2 font-bold text-base" style={{ color: '#ff6b35' }}>
          最新コメント <i className="fas fa-comment"></i>
        </h3>
        <ul className="bg-white shadow m-0 p-0 rounded-lg list-none">
          {latestComments.length > 0 ? (
            latestComments.map((comment) => (
              <li key={comment.id} className="border-gray-200 border-b last:border-b-0">
                <Link href={`/posts/${comment.post_id}`} className="block hover:bg-gray-100 px-2 py-2 transition-colors">
                  <span className="block text-gray-900 text-sm">{truncateText(comment.content, 26)}</span>
                  <span className="block text-gray-500 text-xs">{comment.posts?.title || ''}</span>
                  <span className="text-gray-400 text-xs">{(comment as any).user_name || 'ゲスト'}さん</span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-2 py-2 text-gray-600 text-sm">コメントなし</li>
          )}
        </ul>
      </div>

      {/* 最新アンケート */}
      <div>
        <h3 className="mt-4 mb-2 px-2 font-bold text-base" style={{ color: '#ff6b35' }}>
          最新アンケート <i className="fas fa-poll"></i>
        </h3>
        <ul className="flex flex-col gap-2 bg-white shadow m-0 p-0 rounded-lg list-none">
          {latestPosts.length > 0 ? (
            latestPosts.map((post) => (
              <li key={post.id} className="border-gray-200 border-b-[1px] last:border-b-0">
                <Link href={`/posts/${post.id}`} className="block hover:bg-gray-100 px-2 py-2 transition-colors">
                  <span className="block text-gray-900 text-sm">{post.title}</span>
                  <span className="text-gray-500 text-xs">{formatDate(post.created_at)}</span>
                </Link>
              </li>
            ))
          ) : (
            <li className="px-2 py-2 text-gray-600 text-sm">アンケートなし</li>
          )}
        </ul>
      </div>
    </div>
  );
}
