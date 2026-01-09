import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import Parser from 'rss-parser';

interface RSSItem {
  title: string;
  link: string;
  pubDate: string;
  contentSnippet?: string;
  content?: string;
  enclosure?: {
    url: string;
  };
}

async function getScrapingUrls() {
  const { data, error } = await supabase
    .from('auto_creator_settings')
    .select('setting_value')
    .eq('setting_key', 'scraping_urls')
    .single();

  if (error || !data) {
    return [];
  }

  try {
    return JSON.parse(data.setting_value);
  } catch (e) {
    return [];
  }
}

async function isProcessed(articleUrl: string) {
  const { data, error } = await supabase
    .from('auto_creator_processed')
    .select('id')
    .eq('article_url', articleUrl)
    .single();

  return !error && data;
}

export async function GET() {
  try {
    const urls = await getScrapingUrls();

    if (urls.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'スクレイピングURLが設定されていません',
      });
    }

    const parser = new Parser({
      customFields: {
        item: ['enclosure'],
      },
    });

    const allArticles: Array<{
      feedName: string;
      title: string;
      link: string;
      pubDate: string;
      content: string;
      image: string;
      isProcessed: boolean;
    }> = [];

    for (const url of urls) {
      try {
        const feed = await parser.parseURL(url);
        const feedName = feed.title || url;

        for (const item of feed.items) {
          const rssItem = item as RSSItem;
          const isAlreadyProcessed = await isProcessed(rssItem.link || '');

          allArticles.push({
            feedName,
            title: rssItem.title || '',
            link: rssItem.link || '',
            pubDate: rssItem.pubDate || '',
            content: rssItem.contentSnippet || rssItem.content || '',
            image: rssItem.enclosure?.url || '',
            isProcessed: !!isAlreadyProcessed,
          });
        }
      } catch (error) {
        console.error(`Error fetching RSS from ${url}:`, error);
      }
    }

    // 日付順にソート（新しい順）
    allArticles.sort((a, b) => {
      const dateA = new Date(a.pubDate).getTime();
      const dateB = new Date(b.pubDate).getTime();
      return dateB - dateA;
    });

    return NextResponse.json({
      success: true,
      articles: allArticles,
      total: allArticles.length,
    });
  } catch (error) {
    console.error('Fetch RSS error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'RSS記事の取得に失敗しました',
      },
      { status: 500 }
    );
  }
}
