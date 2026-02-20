import { supabase } from '@/lib/supabase';
import UsersTable from './UsersTable';
import Link from 'next/link';

async function getUsers(statusFilter?: number, hasImage?: boolean, page: number = 1, limit: number = 100) {
  console.log('getUsers - statusFilter:', statusFilter, 'hasImage:', hasImage, 'page:', page, 'limit:', limit);
  
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  
  // ユーザーデータを取得
  let query = supabase
    .from('users')
    .select('id, name, email, image, created_at, is_banned, status, profile_slug, avatar_style, avatar_seed, use_custom_image', { count: 'exact' });

  // ステータスフィルター適用
  if (statusFilter !== undefined) {
    query = query.eq('status', statusFilter);
  }

  // プロフィール画像フィルター適用
  if (hasImage) {
    query = query.not('image', 'is', null);
  }

  const { data: allData, error: allError } = await query;

  if (allError) {
    console.error('Error fetching users:', allError);
    return { users: [], total: 0 };
  }

  const filteredData = allData || [];

  // IDを数値順にソート
  const sortedData = filteredData.sort((a, b) => {
    const numA = parseInt(a.id) || 0;
    const numB = parseInt(b.id) || 0;
    return numB - numA; // 降順（新しいIDが上）
  });

  // ページネーション
  const paginatedData = sortedData.slice(from, to + 1);
  
  // 各ユーザーの投稿件数を取得
  const userIds = paginatedData.map(u => u.id);
  const { data: postCounts } = await supabase
    .from('posts')
    .select('user_id')
    .in('user_id', userIds);
  
  // ユーザーごとの投稿件数をカウント
  const postCountMap = new Map<string, number>();
  postCounts?.forEach(post => {
    const count = postCountMap.get(post.user_id) || 0;
    postCountMap.set(post.user_id, count + 1);
  });
  
  // ユーザーデータに投稿件数を追加
  const usersWithPostCount = paginatedData.map(user => ({
    ...user,
    post_count: postCountMap.get(user.id) || 0
  }));
  
  console.log('getUsers - returned users:', usersWithPostCount.length, 'total:', filteredData.length);
  
  return { users: usersWithPostCount, total: filteredData.length };
}

async function getUserCounts() {
  const { data: allUsers } = await supabase.from('users').select('status, image');
  
  const counts = {
    all: allUsers?.length || 0,
    admin: allUsers?.filter(u => u.status === 3).length || 0,
    editor: allUsers?.filter(u => u.status === 2).length || 0,
    suspended: allUsers?.filter(u => u.status === 4).length || 0,
    member: allUsers?.filter(u => u.status === 1).length || 0,
    ai_editor: allUsers?.filter(u => u.status === 2).length || 0,
    ai_member: allUsers?.filter(u => u.status === 6).length || 0,
    with_image: allUsers?.filter(u => u.image).length || 0,
  };

  return counts;
}

export default async function UsersManagementPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; hasImage?: string; page?: string; limit?: string }>;
}) {
  const params = await searchParams;
  const statusFilter = params.status ? parseInt(params.status) : undefined;
  const hasImage = params.hasImage === 'true';
  const page = params.page ? parseInt(params.page) : 1;
  const limit = params.limit ? parseInt(params.limit) : 100;
  
  // デバッグログ
  console.log('UsersManagementPage - params:', params);
  console.log('UsersManagementPage - statusFilter:', statusFilter, 'hasImage:', hasImage, 'page:', page, 'limit:', limit);
  
  const { users, total } = await getUsers(statusFilter, hasImage, page, limit);
  const counts = await getUserCounts();
  
  const totalPages = Math.ceil(total / limit);
  
  console.log('UsersManagementPage - users count:', users.length, 'total:', total, 'totalPages:', totalPages);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">ユーザー管理</h1>
      </div>

      {/* 権限フィルターと表示件数 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm">
          <a
            href="/admin/users"
            className={`hover:text-blue-600 ${
              statusFilter === undefined ? 'text-blue-600 font-semibold' : 'text-gray-600'
            }`}
          >
            すべて ({counts.all})
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/admin/users?status=3"
            className={`hover:text-blue-600 ${
              statusFilter === 3 ? 'text-blue-600 font-semibold' : 'text-gray-600'
            }`}
          >
            運営者 ({counts.admin})
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/admin/users?status=2"
            className={`hover:text-blue-600 ${
              statusFilter === 2 ? 'text-blue-600 font-semibold' : 'text-gray-600'
            }`}
          >
            編集者({counts.ai_editor})
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/admin/users?status=4"
            className={`hover:text-blue-600 ${
              statusFilter === 4 ? 'text-blue-600 font-semibold' : 'text-gray-600'
            }`}
          >
            停止 ({counts.suspended})
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/admin/users?status=1"
            className={`hover:text-blue-600 ${
              statusFilter === 1 ? 'text-blue-600 font-semibold' : 'text-gray-600'
            }`}
          >
            会員 ({counts.member})
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/admin/users?status=6"
            className={`hover:text-blue-600 ${
              statusFilter === 6 ? 'text-blue-600 font-semibold' : 'text-gray-600'
            }`}
          >
            AI会員 ({counts.ai_member})
          </a>
          <span className="text-gray-400">|</span>
          <a
            href="/admin/users?hasImage=true"
            className={`hover:text-blue-600 ${
              hasImage ? 'text-blue-600 font-semibold' : 'text-gray-600'
            }`}
          >
            画像あり ({counts.with_image})
          </a>
        </div>
        
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-600">表示件数:</span>
          <a
            href={`/admin/users?${new URLSearchParams({
              ...(statusFilter !== undefined && { status: statusFilter.toString() }),
              limit: '100'
            })}`}
            className={`px-2 py-1 rounded ${
              limit === 100 ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            100件
          </a>
          <a
            href={`/admin/users?${new URLSearchParams({
              ...(statusFilter !== undefined && { status: statusFilter.toString() }),
              limit: '300'
            })}`}
            className={`px-2 py-1 rounded ${
              limit === 300 ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            300件
          </a>
          <a
            href={`/admin/users?${new URLSearchParams({
              ...(statusFilter !== undefined && { status: statusFilter.toString() }),
              limit: '500'
            })}`}
            className={`px-2 py-1 rounded ${
              limit === 500 ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            500件
          </a>
        </div>
      </div>

      {/* 上部ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                全 <span className="font-medium">{total}</span> 件中{' '}
                <span className="font-medium">{(page - 1) * limit + 1}</span> から{' '}
                <span className="font-medium">{Math.min(page * limit, total)}</span> 件を表示
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <a
                  href={`/admin/users?${new URLSearchParams({ 
                    ...(statusFilter !== undefined && { status: statusFilter.toString() }),
                    limit: limit.toString(),
                    page: Math.max(1, page - 1).toString()
                  })}`}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${
                    page === 1 ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  ← 前へ
                </a>
                
                {Array.from({ length: Math.min(10, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 10) {
                    pageNum = i + 1;
                  } else if (page <= 5) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 4) {
                    pageNum = totalPages - 9 + i;
                  } else {
                    pageNum = page - 4 + i;
                  }
                  
                  return (
                    <a
                      key={pageNum}
                      href={`/admin/users?${new URLSearchParams({ 
                        ...(statusFilter !== undefined && { status: statusFilter.toString() }),
                        limit: limit.toString(),
                        page: pageNum.toString()
                      })}`}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        page === pageNum
                          ? 'z-10 bg-blue-600 text-white'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {pageNum}
                    </a>
                  );
                })}
                
                <a
                  href={`/admin/users?${new URLSearchParams({ 
                    ...(statusFilter !== undefined && { status: statusFilter.toString() }),
                    limit: limit.toString(),
                    page: Math.min(totalPages, page + 1).toString()
                  })}`}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 ${
                    page === totalPages ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  次へ →
                </a>
              </nav>
            </div>
          </div>
        </div>
      )}

      <UsersTable users={users} />

      {/* 下部ページネーション */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
          <div className="flex flex-1 justify-between sm:hidden">
            <a
              href={`/admin/users?${new URLSearchParams({ 
                ...(statusFilter !== undefined && { status: statusFilter.toString() }),
                page: Math.max(1, page - 1).toString()
              })}`}
              className={`relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                page === 1 ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              前へ
            </a>
            <a
              href={`/admin/users?${new URLSearchParams({ 
                ...(statusFilter !== undefined && { status: statusFilter.toString() }),
                page: Math.min(totalPages, page + 1).toString()
              })}`}
              className={`relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 ${
                page === totalPages ? 'pointer-events-none opacity-50' : ''
              }`}
            >
              次へ
            </a>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                全 <span className="font-medium">{total}</span> 件中{' '}
                <span className="font-medium">{(page - 1) * limit + 1}</span> から{' '}
                <span className="font-medium">{Math.min(page * limit, total)}</span> 件を表示
              </p>
            </div>
            <div>
              <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                <a
                  href={`/admin/users?${new URLSearchParams({ 
                    ...(statusFilter !== undefined && { status: statusFilter.toString() }),
                    limit: limit.toString(),
                    page: Math.max(1, page - 1).toString()
                  })}`}
                  className={`relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    page === 1 ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <span className="sr-only">前へ</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd" />
                  </svg>
                </a>
                
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  
                  return (
                    <a
                      key={pageNum}
                      href={`/admin/users?${new URLSearchParams({ 
                        ...(statusFilter !== undefined && { status: statusFilter.toString() }),
                        limit: limit.toString(),
                        page: pageNum.toString()
                      })}`}
                      className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${
                        page === pageNum
                          ? 'z-10 bg-blue-600 text-white focus:z-20 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600'
                          : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'
                      }`}
                    >
                      {pageNum}
                    </a>
                  );
                })}
                
                <a
                  href={`/admin/users?${new URLSearchParams({ 
                    ...(statusFilter !== undefined && { status: statusFilter.toString() }),
                    limit: limit.toString(),
                    page: Math.min(totalPages, page + 1).toString()
                  })}`}
                  className={`relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 ${
                    page === totalPages ? 'pointer-events-none opacity-50' : ''
                  }`}
                >
                  <span className="sr-only">次へ</span>
                  <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                  </svg>
                </a>
              </nav>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
