import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 画像最適化設定
  images: {
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    minimumCacheTTL: 31536000, // 1年間キャッシュ
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'anke.jp',
      },
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'cdnjs.cloudflare.com',
      },
      {
        protocol: 'https',
        hostname: 'pbs.twimg.com',
      },
      {
        protocol: 'https',
        hostname: 'profile.line-scdn.net',
      },
      {
        protocol: 'http',
        hostname: '127.0.0.1',
        port: '54331',
      },
    ],
  },
  
  // Gzip圧縮を有効化
  compress: true,
  
  // 実験的機能（パフォーマンス向上）
  experimental: {
    optimizePackageImports: ['lucide-react', '@radix-ui/react-select', '@radix-ui/react-checkbox'],
  },
  
  // 本番環境での最適化
  productionBrowserSourceMaps: false,
  poweredByHeader: false,
  
  // キャッシュ設定
  onDemandEntries: {
    maxInactiveAge: 60 * 1000,
    pagesBufferLength: 5,
  },
  
  // Docker用のstandaloneモード
  output: 'standalone',
};

export default nextConfig;
