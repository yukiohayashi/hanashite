import { supabase } from '@/lib/supabase';
import PostsTable from './PostsTable';

async function getPosts(statusFilter?: string, limit: number = 100, sortBy: string = 'created_at', sortOrder: string = 'desc', searchQuery?: string) {
  console.log('getPosts - sortBy:', sortBy, 'sortOrder:', sortOrder);
  
  let query = supabase
    .from('posts')
    .select('id, title, content, status, created_at, user_id, thumbnail_url, og_image, category_id, total_votes, best_answer_id, best_answer_selected_at, deadline_at, categories(id, name)');

  if (statusFilter) {
    query = query.eq('status', statusFilter);
  }

  if (searchQuery) {
    query = query.or(`title.ilike.%${searchQuery}%,content.ilike.%${searchQuery}%`);
  }

  // 投票数でソートする場合は、total_votesカラムを使用
  if (sortBy === 'vote_count') {
    console.log('ソート: total_votes', sortOrder === 'asc' ? '昇順' : '降順');
    query = query.order('total_votes', { ascending: sortOrder === 'asc' });
  } else {
    console.log('ソート:', sortBy, sortOrder === 'asc' ? '昇順' : '降順');
    query = query.order(sortBy, { ascending: sortOrder === 'asc' });
  }

  const { data: posts, error } = await query.limit(limit);

  if (error) {
    console.error('Error fetching posts:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return [];
  }

  if (!posts || posts.length === 0) return [];

  // ソート結果を確認
  if (posts.length > 0) {
    console.log('取得件数:', posts.length);
    console.log('最初の投稿:', { id: posts[0].id, created_at: posts[0].created_at, total_votes: posts[0].total_votes });
    console.log('最後の投稿:', { id: posts[posts.length - 1].id, created_at: posts[posts.length - 1].created_at, total_votes: posts[posts.length - 1].total_votes });
  }

  const postIds = posts.map(p => p.id);
  const userIds = [...new Set(posts.map(p => p.user_id).filter(Boolean))];

  // ユーザー情報を一括取得
  const { data: users } = await supabase
    .from('users')
    .select('id, name')
    .in('id', userIds);

  const userMap = new Map(users?.map(u => [u.id, u]) || []);

  // ベストアンサーを一括取得（commentsテーブルから）
  const postsWithBestAnswer = posts.filter(p => p.best_answer_id);
  const bestAnswerIds = postsWithBestAnswer.map(p => p.best_answer_id).filter(Boolean);

  console.log('Posts with best answer:', postsWithBestAnswer.length);
  console.log('Best answer IDs:', bestAnswerIds);

  const bestAnswerMap = new Map<number, { userId: string; userName: string }>();
  
  if (bestAnswerIds.length > 0) {
    // commentsを取得
    const { data: bestComments, error: commentsError } = await supabase
      .from('comments')
      .select('id, user_id')
      .in('id', bestAnswerIds);

    console.log('Best comments query result:', { bestComments, commentsError });
    if (commentsError) {
      console.error('Comments query error details:', JSON.stringify(commentsError, null, 2));
    }

    if (bestComments && bestComments.length > 0) {
      // ユーザーIDを収集
      const commentUserIds = [...new Set(bestComments.map(c => c.user_id).filter(Boolean))];
      
      // ユーザー情報を取得
      const { data: commentUsers } = await supabase
        .from('users')
        .select('id, name')
        .in('id', commentUserIds);

      const commentUserMap = new Map(commentUsers?.map(u => [u.id, u]) || []);

      postsWithBestAnswer.forEach(post => {
        const comment = bestComments.find(c => c.id === post.best_answer_id);
        console.log(`Post ${post.id} - Looking for comment ${post.best_answer_id}:`, comment);
        if (comment) {
          const user = commentUserMap.get(comment.user_id);
          bestAnswerMap.set(post.id, {
            userId: comment.user_id || '',
            userName: user?.name || 'ゲスト'
          });
          console.log(`Set best answer for post ${post.id}:`, user?.name || 'ゲスト');
        }
      });
    }
  }
  
  console.log('Final best answer map size:', bestAnswerMap.size);
  console.log('Best answer map entries:', Array.from(bestAnswerMap.entries()));

  // キーワードを一括取得
  const { data: postKeywords } = await supabase
    .from('post_keywords')
    .select('post_id, keyword_id, keywords(id, keyword)')
    .in('post_id', postIds);

  const keywordsMap = new Map<number, any[]>();
  postKeywords?.forEach(pk => {
    if (!keywordsMap.has(pk.post_id)) {
      keywordsMap.set(pk.post_id, []);
    }
    if (pk.keywords) {
      keywordsMap.get(pk.post_id)!.push(pk.keywords);
    }
  });

  // データをマッピング
  const postsWithDetails = posts.map(post => ({
    ...post,
    users: userMap.get(post.user_id) || null,
    keywords: keywordsMap.get(post.id) || [],
    bestAnswer: bestAnswerMap.get(post.id) || null,
  }));

  return postsWithDetails;
}

async function getPostCounts() {
  // 各ステータスごとに件数を取得
  const { count: allCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true });

  const { count: publishedCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'published');

  const { count: draftCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'draft');

  const { count: trashCount } = await supabase
    .from('posts')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'trash');

  return {
    all: allCount || 0,
    published: publishedCount || 0,
    draft: draftCount || 0,
    trash: trashCount || 0,
  };
}

export default async function PostsManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; limit?: string; sort?: string; order?: string; page?: string; q?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status;
  const limit = params.limit ? parseInt(params.limit) : 300;
  const page = params.page ? parseInt(params.page) : 1;
  const sortBy = params.sort || 'created_at';
  const sortOrder = params.order || 'desc';
  const searchQuery = params.q || '';
  const posts = await getPosts(statusFilter, limit, sortBy, sortOrder, searchQuery);
  const counts = await getPostCounts();
  
  // ページネーション計算
  const totalPosts = statusFilter ? counts[statusFilter as keyof typeof counts] || counts.all : counts.all;
  const totalPages = Math.ceil(totalPosts / limit);
  const currentPage = Math.min(Math.max(1, page), totalPages);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">投稿管理</h1>
        <a
          href="/admin/posts/new"
          className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          + 新規作成
        </a>
      </div>

      {/* 検索フォーム */}
      <div className="bg-white p-4 rounded-lg shadow">
        <form method="get" action="/admin/posts" className="flex gap-2">
          {statusFilter && <input type="hidden" name="status" value={statusFilter} />}
          {sortBy && sortBy !== 'created_at' && <input type="hidden" name="sort" value={sortBy} />}
          {sortOrder && sortOrder !== 'desc' && <input type="hidden" name="order" value={sortOrder} />}
          <input
            type="text"
            name="q"
            defaultValue={searchQuery}
            placeholder="タイトルまたは本文で検索..."
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            検索
          </button>
          {searchQuery && (
            <a
              href="/admin/posts"
              className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
            >
              クリア
            </a>
          )}
        </form>
        {searchQuery && (
          <div className="mt-2 text-sm text-gray-600">
            「{searchQuery}」の検索結果: {posts.length}件
          </div>
        )}
      </div>

      {/* 表示件数選択 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">表示件数:</span>
          <a
            href={`/admin/posts${statusFilter ? `?status=${statusFilter}&` : '?'}limit=100`}
            className={`px-3 py-1 rounded ${
              limit === 100 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            100件
          </a>
          <a
            href={`/admin/posts${statusFilter ? `?status=${statusFilter}&` : '?'}limit=300`}
            className={`px-3 py-1 rounded ${
              limit === 300 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            300件
          </a>
          <a
            href={`/admin/posts${statusFilter ? `?status=${statusFilter}&` : '?'}limit=500`}
            className={`px-3 py-1 rounded ${
              limit === 500 ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            500件
          </a>
        </div>
      </div>

      {/* ステータスフィルタリンク */}
      <div className="flex items-center gap-2 text-sm">
        <a
          href="/admin/posts"
          className={`hover:text-blue-600 ${
            !statusFilter ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          すべて ({counts.all})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/posts?status=published"
          className={`hover:text-blue-600 ${
            statusFilter === 'published' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          公開 ({counts.published})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/posts?status=draft"
          className={`hover:text-blue-600 ${
            statusFilter === 'draft' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          下書き ({counts.draft})
        </a>
        <span className="text-gray-400">|</span>
        <a
          href="/admin/posts?status=trash"
          className={`hover:text-blue-600 ${
            statusFilter === 'trash' ? 'text-blue-600 font-semibold' : 'text-gray-600'
          }`}
        >
          ゴミ箱 ({counts.trash})
        </a>
      </div>

      {/* ページネーション（上部） */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          {currentPage > 1 && (
            <a
              href={`/admin/posts?${new URLSearchParams({
                ...(statusFilter && { status: statusFilter }),
                limit: limit.toString(),
                page: (currentPage - 1).toString(),
              })}`}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              ← 前へ
            </a>
          )}
          
          {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <a
                key={pageNum}
                href={`/admin/posts?${new URLSearchParams({
                  ...(statusFilter && { status: statusFilter }),
                  limit: limit.toString(),
                  page: pageNum.toString(),
                })}`}
                className={`px-4 py-2 rounded ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {pageNum}
              </a>
            );
          })}
          
          {totalPages > 10 && <span className="px-2 text-gray-500">...</span>}
          
          {currentPage < totalPages && (
            <a
              href={`/admin/posts?${new URLSearchParams({
                ...(statusFilter && { status: statusFilter }),
                limit: limit.toString(),
                page: (currentPage + 1).toString(),
              })}`}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              次へ →
            </a>
          )}
        </div>
      )}

      <PostsTable posts={posts} initialCounts={counts} />
      
      {/* ページネーション */}
      {totalPages > 1 && (
        <div className="mt-6 flex items-center justify-center gap-2">
          {/* 前へ */}
          {currentPage > 1 && (
            <a
              href={`/admin/posts?${new URLSearchParams({
                ...(statusFilter && { status: statusFilter }),
                limit: limit.toString(),
                page: (currentPage - 1).toString(),
              })}`}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              ← 前へ
            </a>
          )}
          
          {/* ページ番号 */}
          {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
            const pageNum = i + 1;
            return (
              <a
                key={pageNum}
                href={`/admin/posts?${new URLSearchParams({
                  ...(statusFilter && { status: statusFilter }),
                  limit: limit.toString(),
                  page: pageNum.toString(),
                })}`}
                className={`px-4 py-2 rounded ${
                  currentPage === pageNum
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {pageNum}
              </a>
            );
          })}
          
          {totalPages > 10 && <span className="px-2 text-gray-500">...</span>}
          
          {/* 次へ */}
          {currentPage < totalPages && (
            <a
              href={`/admin/posts?${new URLSearchParams({
                ...(statusFilter && { status: statusFilter }),
                limit: limit.toString(),
                page: (currentPage + 1).toString(),
              })}`}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
            >
              次へ →
            </a>
          )}
        </div>
      )}
      
      {/* 表示件数の情報 */}
      <div className="mt-4 text-center text-sm text-gray-600">
        全{totalPosts}件中 {posts.length}件を表示中 (ページ {currentPage}/{totalPages})
      </div>
    </div>
  );
}
