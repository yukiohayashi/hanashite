import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

async function getSettings() {
  console.log('Fetching settings from Supabase...');
  console.log('SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  const { data: settings, error } = await supabase
    .from('auto_creator_settings')
    .select('setting_key, setting_value')
    .in('setting_key', [
      'enabled',
      'scraping_urls', 
      'ai_user_probability', 
      'max_posts_per_execution',
      'interval',
      'interval_variance',
      'no_create_start_hour',
      'no_create_end_hour'
    ]);

  if (error) {
    console.error('Supabase error:', error);
    throw new Error(`Supabase error: ${error.message}`);
  }
  
  console.log('Fetched settings:', settings);

  const settingsMap: Record<string, string> = {};
  settings?.forEach(s => {
    settingsMap[s.setting_key] = s.setting_value;
  });
  
  console.log('Settings map:', settingsMap);

  return {
    isActive: settingsMap.enabled === 'true',
    scrapingUrls: JSON.parse(settingsMap.scraping_urls || '[]'),
    aiUserProbability: parseInt(settingsMap.ai_user_probability || '70'),
    maxPostsPerExecution: parseInt(settingsMap.max_posts_per_execution || '5'),
    executionInterval: parseInt(settingsMap.interval || '60'),
    executionVariance: parseInt(settingsMap.interval_variance || '15'),
    noCreateStartHour: parseInt(settingsMap.no_create_start_hour || '0'),
    noCreateEndHour: parseInt(settingsMap.no_create_end_hour || '6'),
  };
}


export async function POST() {
  try {
    const settings = await getSettings();
    
    console.log('Settings:', JSON.stringify(settings, null, 2));

    if (!settings.isActive) {
      console.log('AI自動投稿が無効です。isActive:', settings.isActive);
      return NextResponse.json({
        success: false,
        message: 'AI自動投稿は無効になっています',
        debug: {
          isActive: settings.isActive,
          scrapingUrlsCount: settings.scrapingUrls.length,
        }
      });
    }

    // 実行間隔チェック（ゆらぎを適用）
    const { data: nextExecData } = await supabase
      .from('auto_creator_settings')
      .select('setting_value')
      .eq('setting_key', 'next_execution_time')
      .maybeSingle();
    
    const now = new Date();
    
    if (nextExecData?.setting_value) {
      const nextExecutionTime = new Date(nextExecData.setting_value);
      
      // 次回実行予定時刻になっていない場合はスキップ
      if (now < nextExecutionTime) {
        const remainingMinutes = Math.ceil((nextExecutionTime.getTime() - now.getTime()) / (1000 * 60));
        console.log(`次回実行予定時刻まで待機: あと${remainingMinutes}分`);
        return NextResponse.json({
          success: false,
          message: `次回実行予定時刻まで待機（あと${remainingMinutes}分）`,
          skipped: true,
          nextExecutionTime: nextExecutionTime.toISOString(),
        });
      }
    }
    
    // 次回実行予定時刻を先に設定（重複実行を防ぐため）
    const minInterval = settings.executionInterval - settings.executionVariance;
    const maxInterval = settings.executionInterval + settings.executionVariance;
    const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);
    const nextExecutionTime = new Date(now.getTime() + randomInterval * 60 * 1000);
    
    console.log(`次回実行予定時刻を計算: ${nextExecutionTime.toISOString()} (${Math.round(randomInterval)}分後, 範囲: ${minInterval}〜${maxInterval}分)`);
    
    // upsertを使って確実に保存（レコードがない場合は作成）
    const { error: upsertError } = await supabase
      .from('auto_creator_settings')
      .upsert({
        setting_key: 'next_execution_time',
        setting_value: nextExecutionTime.toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'setting_key'
      });
    
    if (upsertError) {
      console.error('next_execution_time更新エラー:', upsertError);
    } else {
      console.log(`next_execution_time更新成功: ${nextExecutionTime.toISOString()}`);
    }

    // 作成しない時間帯チェック
    const currentHour = new Date().getHours();
    if (settings.noCreateStartHour < settings.noCreateEndHour) {
      // 例: 0時～6時
      if (currentHour >= settings.noCreateStartHour && currentHour < settings.noCreateEndHour) {
        console.log(`作成しない時間帯です: ${currentHour}時`);
        return NextResponse.json({
          success: false,
          message: `作成しない時間帯です（${settings.noCreateStartHour}時～${settings.noCreateEndHour}時）`,
          skipped: true,
        });
      }
    } else if (settings.noCreateStartHour > settings.noCreateEndHour) {
      // 例: 22時～6時（日をまたぐ）
      if (currentHour >= settings.noCreateStartHour || currentHour < settings.noCreateEndHour) {
        console.log(`作成しない時間帯です: ${currentHour}時`);
        return NextResponse.json({
          success: false,
          message: `作成しない時間帯です（${settings.noCreateStartHour}時～${settings.noCreateEndHour}時）`,
          skipped: true,
        });
      }
    }

    let createdCount = 0;
    const results: Array<{ success: boolean; url: string; message: string }> = [];

    // Yahoo!知恵袋の未処理記事を投稿に変換（1件のみ）
    const { data: unprocessedSources } = await supabase
      .from('auto_consultation_sources')
      .select('*')
      .eq('is_processed', false)
      .limit(1);
    
    if (unprocessedSources && unprocessedSources.length > 0) {
      console.log(`Yahoo!知恵袋の未処理記事: ${unprocessedSources.length}件`);
      
      for (const source of unprocessedSources) {
        if (createdCount >= settings.maxPostsPerExecution) {
          break;
        }
        
        try {
          // post-from-source APIを呼び出して投稿を作成
          const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auto-creator/post-from-source`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              source_id: source.id,
            }),
          });
          
          const result = await response.json();
          
          if (result.success) {
            createdCount++;
            results.push({
              success: true,
              url: source.source_url,
              message: '投稿を作成しました',
            });
            console.log(`Yahoo!知恵袋記事から投稿を作成: ${source.source_title}`);
          } else {
            results.push({
              success: false,
              url: source.source_url,
              message: result.error || '投稿の作成に失敗しました',
            });
          }
        } catch (error) {
          console.error(`Yahoo!知恵袋記事の処理エラー:`, error);
          results.push({
            success: false,
            url: source.source_url,
            message: error instanceof Error ? error.message : '不明なエラー',
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: `${createdCount}件の相談を作成しました`,
      created_count: createdCount,
      results,
    });

  } catch (error) {
    console.error('Error in auto-creator:', error);
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'エラーが発生しました',
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
