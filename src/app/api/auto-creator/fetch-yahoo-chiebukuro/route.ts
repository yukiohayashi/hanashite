import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import * as cheerio from 'cheerio';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const categoryName = searchParams.get('category_name');

    // Yahoo!知恵袋のURLを取得
    const { data: settings } = await supabase
      .from('auto_creator_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'scraping_urls')
      .maybeSingle();

    if (!settings?.setting_value) {
      return NextResponse.json({
        success: false,
        error: 'Yahoo!知恵袋のURLが設定されていません',
      }, { status: 400 });
    }

    const urls = JSON.parse(settings.setting_value);
    if (!urls || urls.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Yahoo!知恵袋のURLが設定されていません',
      }, { status: 400 });
    }

    const url = urls[0];
    
    // URLからカテゴリIDを抽出
    const categoryIdMatch = url.match(/category\/(\d+)/);
    const targetCategoryId = categoryIdMatch ? categoryIdMatch[1] : null;
    console.log(`対象カテゴリID: ${targetCategoryId}`);

    // Yahoo!知恵袋をスクレイピング
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'ja,en-US;q=0.9,en;q=0.8',
      },
    });

    if (!response.ok) {
      return NextResponse.json({
        success: false,
        error: `Yahoo!知恵袋へのアクセスに失敗しました: ${response.status}`,
      }, { status: response.status });
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    const questions: Array<{
      title: string;
      url: string;
      pubDate: string;
    }> = [];

    // Yahoo!知恵袋の質問リストを抽出
    // 各質問は .ClapLv3List_Chie-List__ListItem__ZEhUo クラスで囲まれている
    const listItems = $('.ClapLv3List_Chie-List__ListItem__ZEhUo');
    console.log(`質問リスト要素数: ${listItems.length}`);
    
    // 最初の要素のHTML構造をデバッグ出力
    if (listItems.length > 0) {
      console.log('=== 最初の質問要素のHTML構造 ===');
      console.log($(listItems[0]).html()?.substring(0, 500));
      console.log('================================');
    }
    
    // 設定から最大スクレイピング件数を取得
    const { data: settingsData } = await supabase
      .from('auto_creator_settings')
      .select('setting_key, setting_value')
      .eq('setting_key', 'max_scraping_items')
      .maybeSingle();
    
    const maxItems = settingsData?.setting_value ? parseInt(settingsData.setting_value) : 20;
    
    const listItemsArray = listItems.toArray();
    console.log(`取得対象記事数: ${listItemsArray.length}件、最大取得件数: ${maxItems}件`);
    
    for (let i = 0; i < Math.min(listItemsArray.length, maxItems); i++) {
      const elem = listItemsArray[i];
      const $elem = $(elem);
      
      // リンク要素を取得
      const $link = $elem.find('a.ClapLv2ListItem_Chie-ListItem__Anchor__8LjVN');
      const href = $link.attr('href') || '';
      
      // タイトルを取得
      const $titleElem = $link.find('.ClapLv1TextBlock_Chie-TextBlock__Text__etZbS');
      const title = $titleElem.text().trim();
      
      // カテゴリラベルを取得（正確なセレクタ）
      const categoryLabel = $link.find('p.ClapLv2ListItem_Chie-ListItem__Category__fImXp').text().trim();
      
      // URLを構築
      const questionUrl = href.startsWith('http') 
        ? href 
        : href.startsWith('/') 
          ? `https://chiebukuro.yahoo.co.jp${href}`
          : `https://detail.chiebukuro.yahoo.co.jp${href}`;

      // カテゴリラベルで恋愛関連かどうかをフィルタリング
      const loveRelatedCategories = [
        '恋愛相談',
        '恋愛相談、人間関係の悩み'
      ];
      
      const shouldInclude = loveRelatedCategories.some(cat => categoryLabel === cat);

      // 50文字未満のタイトルは除外
      if (title && questionUrl && title.length >= 50 && shouldInclude) {
        // 質問詳細ページから性別を確認
        try {
          const detailResponse = await fetch(questionUrl);
          const detailHtml = await detailResponse.text();
          const $detail = cheerio.load(detailHtml);
          
          // 質問者の性別を取得（Yahoo知恵袋の質問者情報から）
          const questionerInfo = $detail('.Chie-UserInfo__Text').text();
          const isMaleByProfile = questionerInfo.includes('男性') || questionerInfo.includes('♂');
          
          // 本文から男性の相談を推測
          const questionContent = $detail('.Chie-QuestionDetailBody').text();
          const maleKeywords = [
            '女とご飯',
            '女と',
            '彼女が',
            '女の子が',
            '女性が',
            'やれない',
            '可愛くない女',
            '男として',
            '俺は',
            '俺が',
            '男の',
            '童貞',
            '男です',
            '男性です',
            '30代後半の男',
            '30代の男',
            '40代の男',
            '20代の男',
            '50代の男',
            '私は男',
            '僕',
            '僕が',
            '僕の'
          ];
          
          const isMaleByContent = maleKeywords.some(keyword => 
            questionContent.includes(keyword) || title.includes(keyword)
          );
          
          const isMale = isMaleByProfile || isMaleByContent;
          
          if (!isMale) {
            questions.push({ 
              title, 
              url: questionUrl, 
              pubDate: new Date().toISOString() 
            });
          }
        } catch {
          // エラーの場合は念のため追加
          questions.push({ 
            title, 
            url: questionUrl, 
            pubDate: new Date().toISOString() 
          });
        }
      }
    }


    // カテゴリフィルタリング（カテゴリ名が指定されている場合）
    let filteredQuestions = questions;
    if (categoryName) {
      const categoryKeywords: Record<string, string[]> = {
        '片思い': ['片思い', '好きな人', '告白', '脈あり', 'アプローチ'],
        '浮気': ['浮気', '不倫', '二股', '裏切り', '他の女'],
        '別れ話・失恋': ['別れ', '失恋', '振られた', '別れたい', '別れ話'],
        'コミュニケーション': ['会話', 'LINE', 'メール', '連絡', 'コミュニケーション'],
        '復縁': ['復縁', 'よりを戻', '元カノ', '元カレ', '別れた'],
        '職場恋愛': ['職場', '会社', '同僚', '上司', '社内恋愛'],
        '告白・プロポーズ': ['告白', 'プロポーズ', '結婚', '付き合いたい'],
        'マンネリ・倦怠期': ['マンネリ', '倦怠期', '飽きた', '冷めた'],
        '同棲': ['同棲', '一緒に住', '同居', 'ルームシェア'],
        '婚活': ['婚活', '結婚相談所', 'マッチング', '出会い系'],
        'デート': ['デート', 'お出かけ', 'プラン', 'デートスポット'],
        '出会い': ['出会い', 'きっかけ', '知り合', 'ナンパ'],
        '価値観': ['価値観', '考え方', '性格', '相性'],
        '遠距離恋愛': ['遠距離', '遠恋', '会えない', '離れて'],
        '離婚': ['離婚', '別れる', '離婚届', '慰謝料'],
        '夫婦': ['夫婦', '旦那', '妻', '結婚生活'],
        'レス': ['レス', 'セックスレス', '夜の営み', '拒否'],
        '夜の悩み': ['セックス', 'エッチ', '夜', '性'],
        'その他': [],
        '不倫': ['不倫', '既婚者', 'W不倫', '浮気相手'],
      };

      const keywords = categoryKeywords[categoryName] || [];
      if (keywords.length > 0) {
        filteredQuestions = questions.filter(q =>
          keywords.some(keyword => q.title.includes(keyword))
        );
      }
    }

    // auto_consultation_sourcesに保存
    const savedSources = [];
    for (const question of filteredQuestions) {
      // 重複チェック
      const { data: existing } = await supabase
        .from('auto_consultation_sources')
        .select('id')
        .eq('source_url', question.url)
        .single();

      if (!existing) {
        const { data: inserted, error } = await supabase
          .from('auto_consultation_sources')
          .insert({
            source_type: 'yahoo_chiebukuro',
            source_url: question.url,
            source_title: question.title,
            is_processed: false,
          })
          .select()
          .single();

        if (!error && inserted) {
          savedSources.push(inserted);
        }
      }
    }

    return NextResponse.json({
      success: true,
      sources: savedSources,
      total: savedSources.length,
      scraped: questions.length,
      filtered: filteredQuestions.length,
    });
  } catch (error) {
    console.error('Yahoo!知恵袋スクレイピングエラー:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'スクレイピングに失敗しました',
    }, { status: 500 });
  }
}

// POSTメソッドでも同じ処理を実行（CRON対応）
export async function POST(request: Request) {
  return GET(request);
}
