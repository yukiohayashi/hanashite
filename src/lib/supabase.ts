import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// 環境変数の確認ログ
console.log('Supabase initialization:', {
  hasUrl: !!supabaseUrl,
  hasAnonKey: !!supabaseAnonKey,
  hasServiceRoleKey: !!supabaseServiceRoleKey,
  url: supabaseUrl,
  anonKeyPrefix: supabaseAnonKey?.substring(0, 20),
  serviceRoleKeyPrefix: supabaseServiceRoleKey?.substring(0, 20),
});

// クライアントサイド用（RLS有効）
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'supabase-js-web',
    },
  },
});

// サーバーサイド用（RLSバイパス）
// サーバーサイドでのみ使用可能
export const supabaseAdmin = supabaseServiceRoleKey 
  ? createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      },
      db: {
        schema: 'public',
      },
    })
  : supabase; // フォールバック（開発環境用）

if (!supabaseServiceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set, using fallback client');
}
