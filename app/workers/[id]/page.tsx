import { supabase } from '@/lib/supabase';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Header from '@/app/components/Header';
import Footer from '@/app/components/Footer';

interface WorkerPageProps {
  params: {
    id: string;
  };
}

async function getWorker(id: string) {
  const { data: worker, error } = await supabase
    .from('workers')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !worker) {
    return null;
  }

  return worker;
}

async function getWorkerPostCount(workerId: string) {
  const { count } = await supabase
    .from('posts')
    .select('id', { count: 'exact', head: true })
    .eq('workid', workerId);

  return count || 0;
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

export default async function WorkerDetailPage({ params }: WorkerPageProps) {
  const { id } = await params;
  const worker = await getWorker(id);
  
  if (!worker) {
    notFound();
  }

  const postCount = await getWorkerPostCount(id);
  const votePerPrice = await getVotePerPrice();

  return (
    <div className="bg-gray-50 min-h-screen">
      <Header />
      
      <div className="wrapper max-w-7xl mx-auto px-4 py-8">
        <main className="bg-white border border-gray-200 p-6 rounded">
          <h1 className="text-2xl font-bold mb-4">{worker.title}</h1>
          
          <div className="mb-6">
            <div className="text-sm text-gray-600 mb-2">
              投稿日: {new Date(worker.created_at).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </div>
          </div>
          
          <div className="mb-6 whitespace-pre-wrap text-gray-700">
            {worker.content}
          </div>
          
          <table className="w-full border-collapse mb-6 text-sm">
            <tbody>
              <tr className="border-b">
                <th className="bg-gray-100 p-3 text-left font-medium w-48">報酬単価</th>
                <td className="p-3">1票獲得毎に{votePerPrice}pt獲得</td>
              </tr>
              <tr className="border-b">
                <th className="bg-gray-100 p-3 text-left font-medium">残予算</th>
                <td className="p-3">{worker.vote_budget.toLocaleString()} pt</td>
              </tr>
              <tr className="border-b">
                <th className="bg-gray-100 p-3 text-left font-medium">支払い条件</th>
                <td className="p-3">
                  {worker.guest_check ? 'ゲストユーザーが投票しても支払い' : 'ログインユーザーの投票のみ'}
                </td>
              </tr>
              <tr className="border-b">
                <th className="bg-gray-100 p-3 text-left font-medium">作成されたアンケート数</th>
                <td className="p-3">{postCount}件</td>
              </tr>
              <tr>
                <th className="bg-gray-100 p-3 text-left font-medium">募集状況</th>
                <td className="p-3">
                  {worker.vote_budget >= votePerPrice ? '募集中' : '募集終了'}
                </td>
              </tr>
            </tbody>
          </table>
          
          <div className="space-y-3">
            <div className="text-center">
              <Link
                href={`/anke-create?workid=${id}`}
                className="inline-flex justify-center items-center bg-orange-500 hover:bg-orange-600 px-6 py-3 rounded font-bold text-white text-sm transition-colors"
                style={{ minWidth: '200px' }}
              >
                この依頼でアンケートを作成する
              </Link>
            </div>
            
            <div className="text-center">
              <Link
                href="/ankeworks"
                className="inline-flex justify-center items-center bg-gray-500 hover:bg-gray-600 px-6 py-3 rounded font-bold text-white text-sm transition-colors"
                style={{ minWidth: '180px' }}
              >
                依頼一覧に戻る
              </Link>
            </div>
          </div>
        </main>
      </div>
      
      <Footer />
    </div>
  );
}
