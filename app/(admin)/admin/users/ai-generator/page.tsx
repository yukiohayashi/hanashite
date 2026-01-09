'use client';

import { useState } from 'react';
import { Users, Sparkles } from 'lucide-react';

export default function AIUserGeneratorPage() {
  const [count, setCount] = useState(1);
  const [useAI, setUseAI] = useState(true);
  const [message, setMessage] = useState('');
  const [processing, setProcessing] = useState(false);
  const [generatedUsers, setGeneratedUsers] = useState<any[]>([]);

  const handleGenerate = async () => {
    if (count < 1 || count > 100) {
      setMessage('❌ 生成数は1〜100の範囲で指定してください');
      return;
    }

    setProcessing(true);
    setMessage('');
    setGeneratedUsers([]);

    try {
      const response = await fetch('/api/users/ai-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ count, use_ai: useAI }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(`✅ ${data.count}人のAI会員を生成しました`);
        setGeneratedUsers(data.users || []);
      } else {
        setMessage(`❌ エラー: ${data.error}`);
      }
    } catch (error) {
      setMessage('❌ エラーが発生しました');
    }

    setProcessing(false);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">AI会員生成</h1>
        <p className="mt-1 text-sm text-gray-600">
          リアルなテストユーザーを生成
        </p>
      </div>

      {/* API設定リンク */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          OpenAI APIキーは <a href="/admin/api-settings" className="font-medium underline hover:text-blue-600">API設定</a> で管理されています
        </p>
      </div>

      {message && (
        <div className={`p-3 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
          {message}
        </div>
      )}

      {/* 生成設定 */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="text-lg font-bold text-gray-900 mb-4">生成設定</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              生成数
            </label>
            <input
              type="number"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              min="1"
              max="100"
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            />
            <p className="text-xs text-gray-500 mt-1">1〜100人まで指定可能</p>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={useAI}
              onChange={(e) => setUseAI(e.target.checked)}
              className="w-4 h-4"
            />
            <label className="text-sm text-gray-700">
              OpenAI APIを使用してリアルなプロフィールを生成
            </label>
          </div>

          {!useAI && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <p className="text-sm text-yellow-800">
                ⚠️ OpenAI APIを使用しない場合、ランダムなプロフィールが生成されます
              </p>
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={processing}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
          >
            {processing ? (
              <>処理中...</>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                AI会員を生成
              </>
            )}
          </button>
        </div>
      </div>

      {/* 生成されたユーザー一覧 */}
      {generatedUsers.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="p-4 bg-gray-50 border-b">
            <h2 className="text-lg font-bold text-gray-900">生成されたAI会員</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    ニックネーム
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    性別
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    生年
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    都道府県
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    職業
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    自己紹介
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {generatedUsers.map((user, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {user.user_nicename}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.sex === 'male' ? '男性' : '女性'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.birth_year}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.prefecture}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {user.job}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-md truncate">
                      {user.user_description}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ニックネーム生成ルール */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-bold text-yellow-900 mb-3">ニックネーム生成ルール</h3>
        
        <div className="mb-3">
          <h4 className="font-semibold text-yellow-900 text-sm mb-2">生成形式</h4>
          <p className="text-sm text-yellow-800">
            <code className="bg-yellow-100 px-2 py-1 rounded">プレフィックス（70種類以上） + 4桁の数字</code>
          </p>
        </div>

        <div className="mb-3">
          <h4 className="font-semibold text-yellow-900 text-sm mb-2">プレフィックスの種類</h4>
          <div className="space-y-2 text-sm text-yellow-800">
            <div>
              <strong>英語:</strong> user, member, guest, happy, lucky, smile, peace, dream, star, moon, sun, sky など
            </div>
            <div>
              <strong>食べ物（英語）:</strong> apple, banana, orange, grape, melon, peach, cake, cookie, candy, chocolate, tea, coffee など
            </div>
            <div>
              <strong>食べ物（日本語）:</strong> りんご, みかん, いちご, すいか, おにぎり, すし, らーめん, うどん, たこやき など
            </div>
            <div>
              <strong>その他（日本語）:</strong> ねこ, いぬ, うさぎ, はな, そら, うみ, やま, ほし, にじ など
            </div>
          </div>
        </div>

        <div className="mb-3">
          <h4 className="font-semibold text-yellow-900 text-sm mb-2">生成例</h4>
          <div className="flex flex-wrap gap-2 text-sm">
            <code className="bg-yellow-100 px-2 py-1 rounded text-yellow-900">りんご1234</code>
            <code className="bg-yellow-100 px-2 py-1 rounded text-yellow-900">apple5678</code>
            <code className="bg-yellow-100 px-2 py-1 rounded text-yellow-900">ねこ9012</code>
            <code className="bg-yellow-100 px-2 py-1 rounded text-yellow-900">smile3456</code>
            <code className="bg-yellow-100 px-2 py-1 rounded text-yellow-900">すし7890</code>
            <code className="bg-yellow-100 px-2 py-1 rounded text-yellow-900">star2345</code>
          </div>
        </div>

        <p className="text-xs text-yellow-700">
          ※ 数字は1000〜9999の範囲でランダム生成<br/>
          ※ シンプルで管理しやすい形式
        </p>
      </div>

      {/* 説明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="font-bold text-blue-900 mb-2">AI会員について</h3>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• OpenAI APIを使用してリアルなユーザープロフィールを生成します</li>
          <li>• 生成されたユーザーはstatus=6（AI会員）として登録されます</li>
          <li>• パスワードは「00000000」で統一されます</li>
          <li>• メールアドレスは「yhayashi+[ユーザーID]@sucmedia.co.jp」形式で自動生成されます</li>
        </ul>
      </div>
    </div>
  );
}
