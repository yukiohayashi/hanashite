const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createUuidTestUser() {
  const testUserId = 'b20acaef-d6de-48d7-bedc-affa6e8c30c9';
  
  // 既存のユーザーを確認
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('id', testUserId)
    .single();

  if (existing) {
    console.log('✅ UUID test user already exists:', testUserId);
    return;
  }

  // UUID形式のテストユーザーを作成
  const { data, error } = await supabase
    .from('users')
    .insert({
      id: testUserId,
      name: 'テストユーザー（X認証）',
      email: 'test-x-user@example.com',
      user_img_url: null,
      user_description: 'X（Twitter）認証のテストユーザーです',
      status: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .select()
    .single();

  if (error) {
    console.error('❌ Error creating UUID test user:', error);
    return;
  }

  console.log('✅ UUID test user created successfully:', data);
  console.log('🔗 Access at: http://localhost:3000/users/' + testUserId);
}

createUuidTestUser();
