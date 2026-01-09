import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      status?: number;
    };
  }

  interface User {
    id: string;
    status?: number;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    status?: number;
  }
}
