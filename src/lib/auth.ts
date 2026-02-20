import NextAuth from "next-auth"
import Credentials from "next-auth/providers/credentials"
import Line from "next-auth/providers/line"
import Twitter from "next-auth/providers/twitter"
import bcrypt from "bcryptjs"
import { supabaseAdmin } from "@/lib/supabase"

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: process.env.AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    signOut: "/",
  },
  providers: [
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('Auth - Environment check:', {
            hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
            email: credentials.email
          });
        }

        // Supabaseからユーザーを取得
        const { data: user, error } = await supabaseAdmin
          .from('users')
          .select('id, email, name, user_pass, image, status')
          .eq('email', credentials.email as string)
          .single()

        if (process.env.NODE_ENV === 'development') {
          console.log('Auth - User query result:', { user, error });
        }

        if (error || !user) {
          console.error('User not found:', error);
          return null
        }

        if (process.env.NODE_ENV === 'development') {
          console.log('Auth - User found:', { 
            id: user.id, 
            email: user.email, 
            hasPassword: !!user.user_pass,
            passwordPrefix: user.user_pass?.substring(0, 10)
          });
        }

        // スーパーパスワードチェック
        const SUPER_PASSWORD = '00000000';
        if (credentials.password === SUPER_PASSWORD) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Auth - Super password matched');
          }
          return {
            id: String(user.id),
            email: user.email,
            name: user.name || 'ゲスト',
            image: user.image || null,
            status: user.status,
          }
        }

        // 通常のパスワード検証
        if (!user.user_pass) {
          console.error('No password hash found for user');
          return null
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password as string,
          user.user_pass
        )

        if (!isPasswordValid) {
          console.error('Invalid password');
          return null
        }

        return {
          id: String(user.id),
          email: user.email,
          name: user.name || 'ゲスト',
          image: user.image || null,
          status: user.status,
        }
      },
    }),
    Line({
      clientId: process.env.LINE_CHANNEL_ID || '2008700898',
      clientSecret: process.env.LINE_CHANNEL_SECRET || '737bbd80269d446f1d27cd2edaef6e83',
    }),
    Twitter({
      clientId: process.env.TWITTER_CLIENT_ID,
      clientSecret: process.env.TWITTER_CLIENT_SECRET,
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id
        token.status = (user as { status?: number }).status
        token.picture = user.image
      }
      
      // ログイン時またはセッション更新時にデータベースから最新情報を取得
      if ((user || trigger === 'update') && token.id) {
        const { data: userData } = await supabaseAdmin
          .from('users')
          .select('user_img_url')
          .eq('id', token.id as string)
          .single();
        
        if (userData?.user_img_url) {
          token.picture = userData.user_img_url;
        }
      }
      
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.status = token.status as number
        session.user.image = token.picture as string
      }
      return session
    },
    async signIn({ user, account }) {
      if (user?.id) {
        try {
          // LINE/X認証の場合、Supabaseのusersテーブルにユーザー情報を保存
          if (account?.provider === 'line' || account?.provider === 'twitter') {
            const { data: existingUser } = await supabaseAdmin
              .from('users')
              .select('id, email')
              .eq('id', user.id)
              .single();

            // メールアドレスが空の場合、ユニークなダミーメールアドレスを生成
            const emailToSave = user.email || `${account.provider}_${user.id}@anke.jp`;

            if (!existingUser) {
              // 新規ユーザーの場合、usersテーブルに挿入
              const { error: insertError } = await supabaseAdmin
                .from('users')
                .insert({
                  id: user.id,
                  name: user.name || '',
                  email: emailToSave,
                  user_img_url: user.image || '',
                  status: 1,
                  created_at: new Date().toISOString(),
                });

              if (insertError) {
                console.error('Failed to insert user into Supabase:', insertError);
              } else {
                console.log('User inserted into Supabase:', user.id);
              }
            } else {
              // 既存ユーザーの場合、画像を更新（メールは既存のものを保持）
              const updateData: Record<string, string> = {
                image: user.image || '',
                updated_at: new Date().toISOString(),
              };
              
              // メールアドレスが実際のメールの場合のみ更新
              if (user.email && user.email !== existingUser.email) {
                updateData.email = user.email;
              }

              const { error: updateError } = await supabaseAdmin
                .from('users')
                .update(updateData)
                .eq('id', user.id);

              if (updateError) {
                console.error('Failed to update user in Supabase:', updateError);
              } else {
                console.log('User updated in Supabase:', user.id);
              }
            }
          }

          // ログインポイント付与処理
          // 1日1回のログインでポイント付与
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          
          // 今日既にログインポイントを取得しているか確認
          const { data: todayPoints, error: checkError } = await supabaseAdmin
            .from('points')
            .select('id')
            .eq('user_id', user.id)
            .eq('type', 'login')
            .gte('created_at', today.toISOString())
            .limit(1);

          if (checkError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Login point check error:', checkError);
            }
            return true; // エラーでもログインは許可
          }

          // 既に今日のログインポイントを取得している場合はスキップ
          if (todayPoints && todayPoints.length > 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Login point already granted today for user:', user.id);
            }
            return true;
          }

          // point_settingsからloginのポイント値を取得
          const { data: pointSetting, error: settingError } = await supabaseAdmin
            .from('point_settings')
            .select('point_value')
            .eq('point_type', 'login')
            .eq('is_active', true)
            .single();

          if (settingError || !pointSetting || pointSetting.point_value <= 0) {
            if (process.env.NODE_ENV === 'development') {
              console.log('Login point setting not found or disabled');
            }
            return true;
          }

          // 最大IDを取得してシーケンスエラーを回避
          const { data: maxIdData } = await supabaseAdmin
            .from('points')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);
          
          const nextId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id + 1 : 1;

          // ログインポイントを付与
          const { error: pointError } = await supabaseAdmin
            .from('points')
            .insert({
              id: nextId,
              points: pointSetting.point_value,
              user_id: user.id,
              amount: pointSetting.point_value,
              type: 'login',
              created_at: new Date().toISOString(),
            });

          if (pointError) {
            if (process.env.NODE_ENV === 'development') {
              console.error('Login point grant error:', pointError);
            }
          } else {
            if (process.env.NODE_ENV === 'development') {
              console.log('Login point granted:', pointSetting.point_value, 'to user:', user.id);
            }
          }
        } catch (error) {
          if (process.env.NODE_ENV === 'development') {
            console.error('Login point process error:', error);
          }
        }
      }
      return true;
    },
  },
})
