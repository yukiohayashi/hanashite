import type { Metadata } from "next";
import { Noto_Sans_JP } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const notoSansJP = Noto_Sans_JP({
  subsets: ['latin'],
  weight: ['400', '500', '700'],
  display: 'swap',
  preload: true,
  variable: '--font-noto-sans',
});

export const metadata: Metadata = {
  title: {
    template: "%s｜恋愛相談・恋愛掲示板ハナシテ",
    default: "恋愛相談・恋愛掲示板ハナシテ - 恋愛・結婚の悩みを匿名で相談",
  },
  description: "恋愛掲示板ハナシテは、恋愛・結婚の悩みを気軽に話せる匿名相談サイト。解決しなくても大丈夫。「わかるよ」と共感しあえる場所です。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isProduction = process.env.NODE_ENV === 'production';
  
  return (
    <html lang="ja" suppressHydrationWarning>
      <head>
        {isProduction && (
          <>
            <script
              async
              src="https://www.googletagmanager.com/gtag/js?id=G-FZ0MZRX2DG"
            />
            <script
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', 'G-FZ0MZRX2DG');
                `,
              }}
            />
          </>
        )}
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css"
          integrity="sha512-DTOQO9RWCH3ppGqcWaEA1BIZOC6xxalwEsw9c2QQeAIftl+Vegovlnee1c9QX4TctnWMn13TZye+giMm8e2LwA=="
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
        />
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-6354581291730879"
          crossOrigin="anonymous"
        />
        {/* 構造化データ（JSON-LD） */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              "name": "恋愛掲示板ハナシテ",
              "alternateName": "ハナシテ",
              "url": "https://dokujo.com",
              "description": "恋愛掲示板ハナシテは、恋愛・結婚の悩みを気軽に話せる匿名相談サイト。解決しなくても大丈夫。「わかるよ」と共感しあえる場所です。",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://dokujo.com/?q={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "name": "恋愛掲示板ハナシテ",
              "url": "https://dokujo.com",
              "logo": "https://dokujo.com/icon.png",
              "sameAs": []
            })
          }}
        />
      </head>
      <body
        className={`${notoSansJP.variable} antialiased`}
        suppressHydrationWarning
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
