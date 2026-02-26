'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { LayoutDashboard, FileText, Users, MessageSquare, Heart, Coins, Mail, Bot, LogOut, Search, Trash2, Settings } from 'lucide-react';

export default function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isProduction = process.env.NODE_ENV === 'production';
  const sidebarBgColor = isProduction ? 'bg-gray-900' : 'bg-blue-900';
  const hoverBgColor = isProduction ? 'hover:bg-gray-800' : 'hover:bg-blue-800';
  const borderColor = isProduction ? 'border-gray-700' : 'border-blue-700';

  // ページタイトルを設定
  useEffect(() => {
    const pageTitles: Record<string, string> = {
      '/admin': 'ダッシュボード',
      '/admin/cleanup': 'クリーンアップ',
      '/admin/auto-creator': 'AI自動投稿',
      '/admin/auto-creator/rss': 'RSS記事一覧',
      '/admin/auto-creator/logs': '実行履歴',
      '/admin/auto-creator/settings': 'AI自動投稿設定',
      '/admin/posts': '投稿管理',
      '/admin/posts/new': '投稿新規作成',
      '/admin/posts/ai-tagger': 'AI自動タグ付け',
      '/admin/posts/ai-tagger/settings': 'AI自動タグ付け設定',
      '/admin/keywords': 'キーワード一覧',
      '/admin/categories': 'カテゴリ管理',
      '/admin/ng-words': 'NGワード管理',
      '/admin/keywords/history': '検索履歴',
      '/admin/keywords/stats': 'キーワード統計',
      '/admin/auto-voter-commenter-liker': 'AI自動投票・コメント・いいね',
      '/admin/auto-voter-commenter-liker/manual': '手動実行',
      '/admin/auto-voter-commenter-liker/logs': '実行履歴',
      '/admin/auto-voter-commenter-liker/settings': 'AI自動投票設定',
      '/admin/comments': 'コメント管理',
      '/admin/likes': 'いいね管理',
      '/admin/likes/stats': 'いいね統計',
      '/admin/likes/settings': 'いいね設定',
      '/admin/users': 'ユーザー管理',
      '/admin/users/ai-generator': 'AI会員生成',
      '/admin/points': 'ポイント管理',
      '/admin/points/stats': 'ポイント統計',
      '/admin/points/settings': 'ポイント設定',
      '/admin/mail': 'メール管理',
      '/admin/mail/templates': 'メールテンプレート',
      '/admin/mail/logs': 'メール送信履歴',
      '/admin/mail/settings': 'SMTP設定',
      '/admin/api-settings': 'API設定',
    };

    const pageTitle = pageTitles[pathname] || 'ダッシュボード';
    document.title = `${pageTitle}｜ハナシテ`;
  }, [pathname]);
  
  return (
    <div className="flex h-screen bg-gray-100">
      {/* サイドバー */}
      <aside className={`w-64 ${sidebarBgColor} text-white flex flex-col`}>
        <nav className="flex-1 overflow-y-auto py-2">
          <Link
            href="/"
            target="_blank"
            rel="noopener noreferrer"
            className={`flex items-center gap-2 px-3 py-1 text-blue-400 ${hoverBgColor} hover:text-blue-300 transition-colors border-b ${borderColor} pb-2 mb-2`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
              <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span className="text-sm font-medium">トップページ</span>
          </Link>
          
          <Link
            href="/admin"
            className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm">ダッシュボード</span>
          </Link>

          <Link
            href="/admin/cleanup"
            className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
          >
            <Trash2 className="w-5 h-5" />
            <span className="text-sm">クリーンアップ（削除記事に対するコメント、いいね、フォローを削除）</span>
          </Link>

          <div>
            <Link
              href="/admin/auto-creator"
              className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
            >
              <Bot className="w-4 h-4" />
              <span className="text-sm">AI自動投稿</span>
            </Link>
            <div className="ml-11 space-y-1">
              <Link
                href="/admin/auto-creator"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                ダッシュボード
              </Link>
              <Link
                href="/admin/auto-creator/rss"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                RSS記事一覧
              </Link>
              <Link
                href="/admin/auto-creator/logs"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                実行履歴
              </Link>
              <Link
                href="/admin/auto-creator/settings"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                設定
              </Link>
            </div>
          </div>

          <div>
            <Link
              href="/admin/posts"
              className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
            >
              <FileText className="w-5 h-5" />
              <span className="text-sm">投稿管理</span>
            </Link>
            <div className="ml-11 space-y-1">
              <Link
                href="/admin/posts"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                投稿一覧
              </Link>
              <Link
                href="/admin/posts/new"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                投稿新規作成
              </Link>
              <Link
                href="/admin/posts/ai-tagger"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                AI自動タグ付け
              </Link>
              <Link
                href="/admin/posts/ai-tagger/settings"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                設定
              </Link>
            </div>
          </div>

          <div>
            <Link
              href="/admin/keywords"
              className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
            >
              <Search className="w-5 h-5" />
              <span className="text-sm">キーワード検索</span>
            </Link>
            <div className="ml-11 space-y-1">
              <Link
                href="/admin/keywords"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                キーワード一覧
              </Link>
              <Link
                href="/admin/categories"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                カテゴリ管理
              </Link>
              <Link
                href="/admin/ng-words"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                NGワード管理
              </Link>
              <Link
                href="/admin/keywords/history"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                検索履歴
              </Link>
              <Link
                href="/admin/keywords/stats"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                統計
              </Link>
            </div>
          </div>

          {/* 自動投票・コメント・いいね */}
          <div>
            <Link
              href="/admin/auto-voter-commenter-liker"
              className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
            >
              <MessageSquare className="w-5 h-5" />
              <span className="text-sm">AI自動投票・コメント・いいね</span>
            </Link>
            <div className="ml-11 space-y-1">
              <Link
                href="/admin/auto-voter-commenter-liker"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                ダッシュボード
              </Link>
              <Link
                href="/admin/auto-voter-commenter-liker/manual"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                手動実行
              </Link>
              <Link
                href="/admin/auto-voter-commenter-liker/logs"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                実行履歴
              </Link>
              <Link
                href="/admin/auto-voter-commenter-liker/settings"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                設定
              </Link>
            </div>
          </div>

          <Link
            href="/admin/comments"
            className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
          >
            <MessageSquare className="w-5 h-5" />
            <span className="text-sm">コメント管理</span>
          </Link>
<div>
            <Link
              href="/admin/likes"
              className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
            >
              <Heart className="w-5 h-5" />
              <span className="text-sm">いいね管理</span>
            </Link>
            <div className="ml-11 space-y-1">
              <Link
                href="/admin/likes/stats"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                統計
              </Link>
              <Link
                href="/admin/likes"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                いいね一覧
              </Link>
              <Link
                href="/admin/likes/settings"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                設定
              </Link>
            </div>
          </div>
          <div>
            <Link
              href="/admin/users"
              className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
            >
              <Users className="w-5 h-5" />
              <span className="text-sm">ユーザー管理</span>
            </Link>
            <div className="ml-11 space-y-1">
              <Link
                href="/admin/users"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                ユーザー一覧
              </Link>
              <Link
                href="/admin/users/ai-generator"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                AI会員生成
              </Link>
            </div>
          </div>

          

          <div>
            <Link
              href="/admin/points"
              className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
            >
              <Coins className="w-5 h-5" />
              <span className="text-sm">ポイント管理</span>
            </Link>
            <div className="ml-11 space-y-1">
              <Link
                href="/admin/points/stats"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                統計
              </Link>
              <Link
                href="/admin/points"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                ポイント履歴
              </Link>
              <Link
                href="/admin/points/settings"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                設定
              </Link>
            </div>
          </div>

          <div>
            <Link
              href="/admin/mail"
              className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
            >
              <Mail className="w-5 h-5" />
              <span className="text-sm">メール管理</span>
            </Link>
            <div className="ml-11 space-y-1">
              <Link
                href="/admin/mail/templates"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                テンプレート
              </Link>
              <Link
                href="/admin/mail/logs"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                送信履歴
              </Link>
              <Link
                href="/admin/mail/settings"
                className={`block px-3 py-1 text-sm text-gray-400 ${hoverBgColor} hover:text-white transition-colors`}
              >
                SMTP設定
              </Link>
            </div>
          </div>

          <Link
            href="/admin/api-settings"
            className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-sm">API設定</span>
          </Link>

          <div className={`border-t ${borderColor} mt-3 pt-3`}>
            <Link
              href="/" target="blank"
              className={`flex items-center gap-2 px-3 py-1 text-gray-300 ${hoverBgColor} hover:text-white transition-colors`}
            >
              <LogOut className="w-5 h-5" />
              <span className="text-sm">サイトに戻る</span>
            </Link>
          </div>
        </nav>
      </aside>

      {/* メインコンテンツ */}
      <main className="flex-1 overflow-y-auto">
        <div className="p-4">
          {children}
        </div>
      </main>
    </div>
  );
}
