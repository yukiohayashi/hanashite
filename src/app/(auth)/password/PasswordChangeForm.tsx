'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function PasswordChangeForm() {
  const router = useRouter();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // バリデーション
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError('すべての項目を入力してください');
      return;
    }

    if (newPassword.length < 8) {
      setError('新しいパスワードは8文字以上で入力してください');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('新しいパスワードと確認用パスワードが一致しません');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/password/change', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'パスワード変更に失敗しました');
        return;
      }

      setSuccess('パスワードを変更しました');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');

      // 3秒後に通知ページにリダイレクト
      setTimeout(() => {
        router.push('/notifications');
      }, 3000);
    } catch (err) {
      setError('パスワード変更中にエラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white shadow-sm p-6 rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 p-3 rounded text-red-700 text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 p-3 rounded text-green-700 text-sm">
            {success}
          </div>
        )}

        <div>
          <label htmlFor="currentPassword" className="block mb-2 font-medium text-gray-700 text-sm">
            現在のパスワード
          </label>
          <div className="relative">
            <input
              type={showCurrentPassword ? 'text' : 'password'}
              id="currentPassword"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="border-gray-300 px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-orange-500 w-full focus:outline-none"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="top-1/2 right-3 absolute text-gray-500 hover:text-gray-700 -translate-y-1/2"
            >
              <i className={`fas ${showCurrentPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="newPassword" className="block mb-2 font-medium text-gray-700 text-sm">
            新しいパスワード（8文字以上）
          </label>
          <div className="relative">
            <input
              type={showNewPassword ? 'text' : 'password'}
              id="newPassword"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="border-gray-300 px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-orange-500 w-full focus:outline-none"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="top-1/2 right-3 absolute text-gray-500 hover:text-gray-700 -translate-y-1/2"
            >
              <i className={`fas ${showNewPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>

        <div>
          <label htmlFor="confirmPassword" className="block mb-2 font-medium text-gray-700 text-sm">
            新しいパスワード（確認）
          </label>
          <div className="relative">
            <input
              type={showConfirmPassword ? 'text' : 'password'}
              id="confirmPassword"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="border-gray-300 px-3 py-2 pr-10 border rounded-md focus:ring-2 focus:ring-orange-500 w-full focus:outline-none"
              disabled={loading}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="top-1/2 right-3 absolute text-gray-500 hover:text-gray-700 -translate-y-1/2"
            >
              <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="bg-[#ff6b35] hover:bg-[#e55a24] disabled:opacity-50 px-6 py-3 rounded-md w-full font-bold text-white transition-colors disabled:cursor-not-allowed"
        >
          {loading ? '変更中...' : 'パスワードを変更'}
        </button>
      </form>
    </div>
  );
}
