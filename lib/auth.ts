import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { supabase } from './supabase';

export const { auth, handlers, signIn, signOut } = NextAuth({
  providers: [
    {
      id: 'line',
      name: 'LINE',
      type: 'oidc',
      clientId: '2008700898',
      clientSecret: '737bbd80269d446f1d27cd2edaef6e83',
      issuer: 'https://access.line.me',
      authorization: {
        url: 'https://access.line.me/oauth2/v2.1/authorize',
        params: { 
          scope: 'profile openid email',
          response_type: 'code'
        }
      },
      token: 'https://api.line.me/oauth2/v2.1/token',
      userinfo: 'https://api.line.me/v2/profile',
      profile(profile: any) {
        return {
          id: profile.userId || profile.sub,
          name: profile.displayName || profile.name,
          email: profile.email || null,
          image: profile.pictureUrl || profile.picture,
        };
      },
    },
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        // Supabaseでユーザー認証
        const { data: user, error } = await supabase
          .from('users')
          .select('id, email, name, image, status')
          .eq('email', credentials.email)
          .single();

        if (error || !user) {
          return null;
        }

        // パスワード検証は省略（実際の実装では必要）
        return {
          id: user.id.toString(),
          email: user.email,
          name: user.name,
          image: user.image,
          status: user.status || 0,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.status = (user as any).status || 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = parseInt(token.id as string);
        session.user.status = (token.status as number) || 0;
        
        // statusが設定されていない場合、データベースから取得
        if (!session.user.status) {
          const { data: user } = await supabase
            .from('users')
            .select('status')
            .eq('id', session.user.id)
            .single();
          
          if (user) {
            session.user.status = user.status || 0;
          }
        }
      }
      return session;
    }
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
});
