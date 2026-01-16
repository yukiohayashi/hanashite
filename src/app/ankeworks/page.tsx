import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import AnkeworksHeader from './AnkeworksHeader';
import HomeRightSidebar from '@/components/HomeRightSidebar';

interface Worker {
  id: number;
  title: string;
  content: string;
  user_id: number;
  created_at: string;
  users: {
    id: number;
    name: string;
    user_img_url: string | null;
  } | null;
  worker_meta: {
    vote_budget: number;
    guest_check: boolean;
  };
  anke_count: number;
  categories: Array<{ id: number; name: string; slug: string }>;
}

async function getWorkers(category?: string) {
  const { data: workers, error } = await supabase
    .from('workers')
    .select('*')
    .eq('status', 'published')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching workers:', error);
    return [];
  }

  // 各workerの作成数を取得
  const workersWithCount = await Promise.all(
    (workers || []).map(async (worker) => {
      const { count } = await supabase
        .from('posts')
        .select('id', { count: 'exact', head: true })
        .eq('workid', worker.id);
      
      return {
        ...worker,
        anke_count: count || 0
      };
    })
  );

  return workersWithCount;
}

async function getVotePerPrice() {
  const { data } = await supabase
    .from('point_settings')
    .select('point_value')
    .eq('point_type', 'work_vote')
    .eq('is_active', true)
    .single();

  return data?.point_value || 10;
}

export default async function AnkeworksPage() {
  const workers = await getWorkers();
  const votePerPrice = await getVotePerPrice();

  const categories = [
    { name: 'すべて', slug: '', color: '#E25E8B' },
  ];

  return (
    <>
      <AnkeworksHeader />
      <div className="wrapper flex max-w-7xl mx-auto gap-4 px-4">
        <main className="flex-1 min-w-0">
          <section id="worker-posts" className="py-4">
            <p className="text-sm text-gray-700 mb-4">
              アンケワークスでは、企業様のご依頼に沿ったアンケートを作成し、投票を集めることで報酬を獲得できます！
              調査結果は企業様の施策に役立てられます。以下のご依頼の中から作成したいアンケートを選び、多くの投票を集めましょう！
            </p>

            {/* カテゴリボタン */}
            <div className="flex flex-wrap gap-2 mb-6">
              {categories.map((cat) => (
                <Link
                  key={cat.slug}
                  href={cat.slug ? `/ankeworks?category=${cat.slug}` : '/ankeworks'}
                  className="px-4 py-2 rounded text-white font-medium text-sm"
                  style={{ backgroundColor: cat.color }}
                >
                  {cat.name}
                </Link>
              ))}
            </div>

            {workers.length > 0 ? (
              <div className="space-y-6">
                {workers.map((worker: any) => (
                  <div key={worker.id} className="bg-white border border-gray-200 p-6">
                    <h3 className="text-lg font-bold mb-3">
                      <Link href={`/ankeworks/${worker.id}`} className="text-blue-600 hover:underline">
                        {worker.title}
                      </Link>
                    </h3>

                    <div className="text-sm text-gray-700 mb-4 whitespace-pre-wrap">
                      {worker.content}
                    </div>

                    <table className="w-full border-collapse mb-4 text-sm">
                      <tbody>
                        <tr className="border-b">
                          <th className="bg-gray-100 p-2 text-left font-medium w-32">報酬単価</th>
                          <td className="p-2">作成で{worker.vote_per_price}pt獲得、1票獲得毎に{worker.vote_per_price}pt獲得</td>
                        </tr>
                        <tr className="border-b">
                          <th className="bg-gray-100 p-2 text-left font-medium">残予算</th>
                          <td className="p-2">{worker.vote_budget.toLocaleString()} pt</td>
                        </tr>
                        <tr className="border-b">
                          <th className="bg-gray-100 p-2 text-left font-medium">支払い条件</th>
                          <td className="p-2">
                            {worker.guest_check ? 'ゲストユーザーが投票しても支払い' : 'ログインユーザーの投票のみ'}
                          </td>
                        </tr>
                        <tr className="border-b">
                          <th className="bg-gray-100 p-2 text-left font-medium">作成数</th>
                          <td className="p-2">
                            <Link href={`/ankeworks/${worker.id}`} className="text-orange-500 hover:underline">
                              {worker.anke_count || 0}件
                            </Link>
                          </td>
                        </tr>
                        <tr>
                          <th className="bg-gray-100 p-2 text-left font-medium">状況</th>
                          <td className="p-2">
                            {worker.vote_budget >= worker.vote_per_price ? '募集中' : '募集終了'}
                          </td>
                        </tr>
                      </tbody>
                    </table>

                    <div className="space-y-2">
                      <div className="text-center">
                        <Link
                          href={`/post-create?workid=${worker.id}`}
                          className="inline-flex justify-center items-center bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded font-bold text-white text-sm transition-colors"
                          style={{ minWidth: '200px' }}
                        >
                          この依頼でアンケートを作成する
                        </Link>
                      </div>
                      <div className="text-center">
                        <Link
                          href={`/ankeworks/${worker.id}`}
                          className="inline-flex justify-center items-center bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded font-bold text-white text-sm transition-colors"
                          style={{ minWidth: '180px' }}
                        >
                          詳しくみる
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-gray-600 py-12">
                現在、アンケート作成依頼はありません。
              </p>
            )}
          </section>
        </main>

        <aside className="hidden lg:block w-72 shrink-0">
          <HomeRightSidebar />
        </aside>
      </div>
    </>
  );
}
