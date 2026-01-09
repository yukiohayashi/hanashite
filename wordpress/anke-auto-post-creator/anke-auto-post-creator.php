<?php
/**
 * Plugin Name: Anke Auto Post Creator
 * Plugin URI: https://anke.jp
 * Description: ニュース記事から自動でアンケートを作成するプラグイン
 * Version: 1.0.0
 * Author: Anke Team
 * License: GPL v2 or later
 * Text Domain: anke-auto-post-creator
 */

if (!defined('ABSPATH')) {
    exit;
}

// 個別ニュース1件だけを手動実行するアクションフック
add_action('wp_ajax_anke_auto_creator_run_single', 'anke_auto_creator_run_single');
function anke_auto_creator_run_single() {
    check_ajax_referer('anke_auto_creator_manual', 'nonce');

    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
    }

    $article_url     = esc_url_raw($_POST['article_url'] ?? '');
    $article_title   = sanitize_text_field($_POST['article_title'] ?? '');
    $article_content = sanitize_textarea_field($_POST['article_content'] ?? '');
    $article_image   = esc_url_raw($_POST['article_image'] ?? '');

    // デバッグ: 受け取った画像URLをログ出力
    error_log('=== RUN SINGLE DEBUG ===');
    error_log('Article URL: ' . $article_url);
    error_log('Article Image: ' . ($article_image ? $article_image : '(empty)'));

    if (empty($article_url) || empty($article_title)) {
        wp_send_json_error('記事URLまたはタイトルが指定されていません');
    }

    // 重複チェック
    $creator = new Anke_Auto_Creator_Anke_Creator();
    if ($creator->is_url_processed($article_url)) {
        wp_send_json_error('この記事は既に処理済みです');
    }

    try {
        // 画像URLが空の場合は、記事ページから取得（Yahoo ニュースなど enclosure がないケース）
        if (empty($article_image)) {
            error_log('Anke Auto Creator: No image in RSS, fetching from article page...');
            $scraper = new Anke_Auto_Creator_URL_Scraper();
            $article_details = $scraper->fetch_article_content($article_url);
            $article_image = $article_details['image'] ?? '';
            
            if (!empty($article_image)) {
                error_log('Anke Auto Creator: Fetched image from article page: ' . $article_image);
            } else {
                error_log('Anke Auto Creator: No image found on article page');
            }
        }

        // 記事データを組み立て
        $article = array(
            'url'     => $article_url,
            'title'   => $article_title,
            'content' => $article_content,
            'image'   => $article_image,
        );

        // アンケート内容を生成
        $generator = new Anke_Auto_Creator_ChatGPT_Generator();
        $anke_data = $generator->generate_anke($article);

        if (isset($anke_data['error'])) {
            wp_send_json_error('アンケート生成エラー: ' . $anke_data['error']);
        }

        // 質問者を選択（自動実行と同じルール）
        $scheduler      = new Anke_Auto_Creator_Cron_Scheduler();
        $questioner_id  = $scheduler->select_questioner_for_manual();

        if (!$questioner_id) {
            wp_send_json_error('質問者が見つかりません');
        }

        // アンケートを1件作成（重複チェックで既にインスタンス化済み）
        $result  = $creator->create_anke($anke_data, $article, $questioner_id);

        if (isset($result['error'])) {
            wp_send_json_error('アンケート作成エラー: ' . $result['error']);
        }

        wp_send_json_success(array(
            'message'     => '選択したニュースからアンケートを作成しました',
            'post_id'     => $result['post_id'],
            'post_url'    => $result['post_url'],
            'article_url' => $article_url,
        ));
    } catch (Exception $e) {
        wp_send_json_error('エラー: ' . $e->getMessage());
    }
}

// RSSフィード取得
add_action('wp_ajax_anke_auto_creator_fetch_rss', 'anke_auto_creator_fetch_rss');
function anke_auto_creator_fetch_rss() {
    check_ajax_referer('anke_auto_creator_manual', 'nonce');

    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
    }

    $url = esc_url_raw($_POST['url'] ?? '');

    if (empty($url)) {
        wp_send_json_error('URLが指定されていません');
    }

    try {
        // fetch_feed()のタイムアウトを延長
        add_filter('http_request_timeout', function() { return 30; });
        
        // RSSフィードを直接取得（画像ダウンロードなし）
        $feed = fetch_feed($url);
        
        // フィルターを削除
        remove_filter('http_request_timeout', function() { return 30; });
        
        if (is_wp_error($feed)) {
            wp_send_json_error('RSSフィードの取得に失敗しました: ' . $feed->get_error_message());
        }

        $feed_title = $feed->get_title();
        $articles = array();
        
        // 最大10件取得
        $items = $feed->get_items(0, 10);
        
        foreach ($items as $item) {
            $articles[] = array(
                'title' => $item->get_title(),
                'url' => $item->get_permalink(),
                'content' => strip_tags($item->get_description()),
                'date' => $item->get_date('Y-m-d H:i:s'),
                'image' => '' // 管理画面では画像URLは不要
            );
        }

        if (empty($articles)) {
            wp_send_json_error('記事が取得できませんでした');
        }

        wp_send_json_success(array(
            'articles' => $articles,
            'feed_title' => $feed_title
        ));
    } catch (Exception $e) {
        wp_send_json_error('エラー: ' . $e->getMessage());
    }
}

// WordPress記事の存在確認
add_action('wp_ajax_anke_auto_creator_check_processed', 'anke_auto_creator_check_processed');
function anke_auto_creator_check_processed() {
    try {
        check_ajax_referer('anke_auto_creator_manual', 'nonce');

        if (!current_user_can('manage_options')) {
            wp_send_json_error('権限がありません');
        }

        $article_url = esc_url_raw($_POST['url'] ?? '');
        $article_title = sanitize_text_field($_POST['title'] ?? '');

        if (empty($article_url)) {
            wp_send_json_error('URLが指定されていません');
        }

        global $wpdb;
        
        // URLを正規化（?source=rssなどのパラメータを除去）
        $base_url = strtok($article_url, '?');
        
        // wp_anke_postsテーブルでURLの存在確認（統合版）
        $ogp_cache = $wpdb->get_row($wpdb->prepare(
            "SELECT post_id, og_title, source_url as url, og_cached_at as created_at 
             FROM wp_anke_posts 
             WHERE source_url = %s OR source_url = %s OR source_url LIKE %s
             ORDER BY 
                CASE 
                    WHEN source_url = %s THEN 1
                    WHEN source_url = %s THEN 2
                    ELSE 3
                END,
                og_cached_at DESC
             LIMIT 1",
            $article_url,
            $base_url,
            $wpdb->esc_like($base_url) . '%',
            $article_url,
            $base_url
        ));
        
        // URLで見つからない場合、タイトルで検索
        if (!$ogp_cache && !empty($article_title)) {
            $ogp_cache = $wpdb->get_row($wpdb->prepare(
                "SELECT post_id, og_title, source_url as url, og_cached_at as created_at 
                 FROM wp_anke_posts 
                 WHERE og_title LIKE %s
                 ORDER BY created_at DESC
                 LIMIT 1",
                '%' . $wpdb->esc_like($article_title) . '%'
            ));
        }

        if ($ogp_cache) {
            // OGPキャッシュがあれば記事作成済みと判断
            $post = null;
            
            // post_idがある場合は直接取得
            if (!empty($ogp_cache->post_id)) {
                $post = $wpdb->get_row($wpdb->prepare(
                    "SELECT ID, post_title FROM {$wpdb->prefix}posts 
                     WHERE ID = %d 
                     AND post_type = 'post' 
                     AND post_status = 'publish'
                     LIMIT 1",
                    $ogp_cache->post_id
                ));
            }
            
            // post_idがない、または投稿が見つからない場合はタイトルで検索
            // 1. 完全一致検索
            if (!$post) {
                $post = $wpdb->get_row($wpdb->prepare(
                    "SELECT ID, post_title FROM {$wpdb->prefix}posts 
                     WHERE post_type = 'post' 
                     AND post_status = 'publish'
                     AND post_title = %s
                     ORDER BY post_date DESC
                     LIMIT 1",
                    $ogp_cache->og_title
                ));
            }
            
            // 2. タイトル全体で部分一致検索
            if (!$post) {
                $post = $wpdb->get_row($wpdb->prepare(
                    "SELECT ID, post_title FROM {$wpdb->prefix}posts 
                     WHERE post_type = 'post' 
                     AND post_status = 'publish'
                     AND post_title LIKE %s
                     ORDER BY post_date DESC
                     LIMIT 1",
                    '%' . $wpdb->esc_like($ogp_cache->og_title) . '%'
                ));
            }
            
            // 3. 最初の10文字で検索
            if (!$post) {
                $short_title = mb_substr($ogp_cache->og_title, 0, 10);
                $post = $wpdb->get_row($wpdb->prepare(
                    "SELECT ID, post_title FROM {$wpdb->prefix}posts 
                     WHERE post_type = 'post' 
                     AND post_status = 'publish'
                     AND post_title LIKE %s
                     ORDER BY post_date DESC
                     LIMIT 1",
                    $wpdb->esc_like($short_title) . '%'
                ));
            }
            
            if ($post) {
                $post_url = get_permalink($post->ID);
                wp_send_json_success(array(
                    'exists' => true,
                    'post_id' => $post->ID,
                    'post_url' => $post_url,
                    'post_title' => $post->post_title
                ));
            } else {
                // OGPキャッシュはあるが記事が見つからない
                wp_send_json_success(array(
                    'exists' => true,
                    'post_id' => null,
                    'post_url' => null,
                    'message' => '記事作成済み（記事URLが見つかりません）'
                ));
            }
        } else {
            wp_send_json_success(array(
                'exists' => false
            ));
        }
    } catch (Exception $e) {
        error_log('WordPress記事確認エラー: ' . $e->getMessage());
        wp_send_json_success(array(
            'exists' => false,
            'error' => $e->getMessage()
        ));
    }
}

// プラグインのバージョン
define('ANKE_AUTO_CREATOR_VERSION', '1.0.0');
define('ANKE_AUTO_CREATOR_PATH', plugin_dir_path(__FILE__));
define('ANKE_AUTO_CREATOR_URL', plugin_dir_url(__FILE__));

// 必要なクラスファイルを読み込み
require_once ANKE_AUTO_CREATOR_PATH . 'includes/class-url-scraper.php';
require_once ANKE_AUTO_CREATOR_PATH . 'includes/class-chatgpt-generator.php';
require_once ANKE_AUTO_CREATOR_PATH . 'includes/class-anke-creator.php';
require_once ANKE_AUTO_CREATOR_PATH . 'includes/class-cron-scheduler.php';
require_once ANKE_AUTO_CREATOR_PATH . 'includes/class-yahoo-trend-fetcher.php';

if (is_admin()) {
    require_once ANKE_AUTO_CREATOR_PATH . 'admin/class-admin-menu.php';
    new Anke_Auto_Creator_Admin_Menu();
}

// カスタムcron間隔を追加
add_filter('cron_schedules', 'anke_auto_creator_add_cron_interval');
function anke_auto_creator_add_cron_interval($schedules) {
    // RSS自動作成用の間隔
    $settings = get_option('anke_auto_creator_settings', array());
    $rss_interval_hours = $settings['interval_hours'] ?? 1;
    $rss_interval_seconds = $rss_interval_hours * 3600;
    
    $schedules['anke_rss_interval'] = array(
        'interval' => $rss_interval_seconds,
        'display'  => sprintf('RSS自動作成間隔 (%d時間)', $rss_interval_hours)
    );
    
    // Yahoo!トレンド用の間隔
    $yahoo_interval_hours = get_option('anke_yahoo_trend_interval', 24);
    $yahoo_interval_seconds = $yahoo_interval_hours * 3600;
    
    $schedules['anke_yahoo_trend_interval'] = array(
        'interval' => $yahoo_interval_seconds,
        'display'  => sprintf('Yahoo!トレンド取得間隔 (%d時間)', $yahoo_interval_hours)
    );
    
    return $schedules;
}

// プラグイン有効化時の処理
register_activation_hook(__FILE__, 'anke_auto_creator_activate');
function anke_auto_creator_activate() {
    // Cronスケジュールを設定（RSS用）
    if (!wp_next_scheduled('anke_auto_creator_cron')) {
        $settings = get_option('anke_auto_creator_settings', array());
        $interval_hours = $settings['interval_hours'] ?? 1;
        $next_run = time() + ($interval_hours * 3600);
        wp_schedule_event($next_run, 'anke_rss_interval', 'anke_auto_creator_cron');
        error_log('Anke Auto Creator: Initial cron scheduled at ' . date('Y-m-d H:i:s', $next_run));
    }
    
    // Yahoo!トレンド用のCronスケジュールを設定
    if (!wp_next_scheduled('anke_yahoo_trend_cron')) {
        wp_schedule_event(time(), 'daily', 'anke_yahoo_trend_cron');
    }
    
    // デフォルト設定を保存
    $default_settings = array(
        'enabled' => true,
        'urls' => array(),
        'openai_api_key' => '',
        'openai_model' => 'gpt-4o-mini',
        'interval_hours' => 1,
        'interval_variance' => 15,
        'questioner_user_id' => 0,
        'questioner_mode' => 'random', // random or fixed
        'posts_per_run' => 1,
        'blackout_start' => '00:00',
        'blackout_end' => '06:00',
        'scraping_delay_min' => 30,
        'scraping_delay_max' => 120,
        'max_keywords' => 5,
        'max_categories' => 2,
        'system_author_id' => 33, // wp_postsのpost_authorに使用するWordPressユーザーID
    );
    
    if (!get_option('anke_auto_creator_settings')) {
        update_option('anke_auto_creator_settings', $default_settings);
    }
    
    // 処理済みURL記録テーブルを作成
    global $wpdb;
    $table_name = $wpdb->prefix . 'anke_auto_creator_processed';
    $charset_collate = $wpdb->get_charset_collate();
    
    $sql = "CREATE TABLE IF NOT EXISTS $table_name (
        id bigint(20) unsigned NOT NULL AUTO_INCREMENT,
        source_url varchar(500) NOT NULL,
        article_url varchar(500) NOT NULL,
        article_title text,
        post_id bigint(20) unsigned,
        created_at datetime DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (id),
        UNIQUE KEY article_url (article_url),
        KEY source_url (source_url),
        KEY created_at (created_at)
    ) $charset_collate;";
    
    require_once(ABSPATH . 'wp-admin/includes/upgrade.php');
    dbDelta($sql);
}

// プラグイン無効化時の処理
register_deactivation_hook(__FILE__, 'anke_auto_creator_deactivate');
function anke_auto_creator_deactivate() {
    // Cronスケジュールを削除（RSS用）
    $timestamp = wp_next_scheduled('anke_auto_creator_cron');
    if ($timestamp) {
        wp_unschedule_event($timestamp, 'anke_auto_creator_cron');
    }
    
    // Yahoo!トレンド用のCronスケジュールを削除
    $timestamp_yahoo = wp_next_scheduled('anke_yahoo_trend_cron');
    if ($timestamp_yahoo) {
        wp_unschedule_event($timestamp_yahoo, 'anke_yahoo_trend_cron');
    }
}

// Cron実行時の処理
add_action('anke_auto_creator_cron', 'anke_auto_creator_run');
function anke_auto_creator_run() {
    $scheduler = new Anke_Auto_Creator_Cron_Scheduler();
    $scheduler->execute();
}

// Cronスケジュールをリセット
add_action('wp_ajax_anke_auto_creator_reset_cron', 'anke_auto_creator_reset_cron');
function anke_auto_creator_reset_cron() {
    check_ajax_referer('anke_auto_creator_manual', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
    }
    
    try {
        // 既存のスケジュールを削除
        $timestamp = wp_next_scheduled('anke_auto_creator_cron');
        if ($timestamp) {
            wp_unschedule_event($timestamp, 'anke_auto_creator_cron');
            error_log('Anke Auto Creator: Removed old cron schedule at ' . date('Y-m-d H:i:s', $timestamp));
        }
        
        // 新しいスケジュールを設定
        $settings = get_option('anke_auto_creator_settings', array());
        $interval_hours = $settings['interval_hours'] ?? 1;
        $variance_minutes = $settings['interval_variance'] ?? 15;
        
        // ゆらぎを計算
        $variance_seconds = rand(-$variance_minutes * 60, $variance_minutes * 60);
        $next_run = time() + ($interval_hours * 3600) + $variance_seconds;
        
        $scheduled = wp_schedule_event($next_run, 'anke_rss_interval', 'anke_auto_creator_cron');
        
        if ($scheduled === false) {
            wp_send_json_error('Cronスケジュールの設定に失敗しました');
        }
        
        update_option('anke_auto_creator_next_run', $next_run);
        error_log('Anke Auto Creator: New cron schedule set at ' . date('Y-m-d H:i:s', $next_run));
        
        wp_send_json_success(array(
            'message' => 'Cronスケジュールをリセットしました',
            'next_run' => date('Y-m-d H:i:s', $next_run)
        ));
    } catch (Exception $e) {
        wp_send_json_error('エラー: ' . $e->getMessage());
    }
}

// 手動実行用のアクションフック
add_action('wp_ajax_anke_auto_creator_manual_run', 'anke_auto_creator_manual_run');
function anke_auto_creator_manual_run() {
    check_ajax_referer('anke_auto_creator_manual', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
    }
    
    try {
        $scheduler = new Anke_Auto_Creator_Cron_Scheduler();
        $result = $scheduler->execute();
        
        if ($result['success']) {
            wp_send_json_success($result);
        } else {
            wp_send_json_error($result['message'] ?? 'エラーが発生しました');
        }
    } catch (Exception $e) {
        wp_send_json_error('エラー: ' . $e->getMessage());
    }
}

// RSS読み込み用のアクションフック
add_action('wp_ajax_anke_auto_creator_load_rss', 'anke_auto_creator_load_rss');
function anke_auto_creator_load_rss() {
    check_ajax_referer('anke_auto_creator_manual', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
    }
    
    $rss_url = sanitize_text_field($_POST['rss_url'] ?? '');
    
    if (empty($rss_url)) {
        wp_send_json_error('URLが指定されていません');
    }
    
    // fetch_feed()のタイムアウトを延長
    add_filter('http_request_timeout', function() { return 30; });
    
    $rss = fetch_feed($rss_url);
    
    // フィルターを削除
    remove_filter('http_request_timeout', function() { return 30; });
    
    if (is_wp_error($rss)) {
        wp_send_json_error('RSSの読み込みに失敗しました: ' . $rss->get_error_message());
    }
    
    $maxitems = $rss->get_item_quantity(10);
    $rss_items = $rss->get_items(0, $maxitems);
    
    $items = array();
    foreach ($rss_items as $item) {
        // 元のコンテンツを取得
        $raw_content = $item->get_content();

        // 「記事を読む」リンクを削除（どのドメインでも共通で邪魔になりやすい部分）
        $raw_content = preg_replace('/<a[^>]*>[^<]*記事を読む[^<]*<\/a>/u', '', $raw_content);

        // 本文を取得（HTMLタグを除去して先頭500文字）
        $content = trim(strip_tags($raw_content));
        $content = mb_substr($content, 0, 500);
        if (mb_strlen($content) >= 500) {
            $content .= '...';
        }

        // enclosure から画像URLを取得（例: ライブドアニュース）
        $image_url = '';
        $enclosure = $item->get_enclosure();
        if ($enclosure && method_exists($enclosure, 'get_link')) {
            $image_url = $enclosure->get_link();
        }
        
        $items[] = array(
            'title'   => $item->get_title(),
            'url'     => $item->get_permalink(),
            'date'    => $item->get_date('Y-m-d H:i:s'),
            'content' => $content,
            'image'   => $image_url,
        );
    }
    
    wp_send_json_success(array(
        'title' => $rss->get_title(),
        'items' => $items
    ));
}

// Yahoo!トレンド開始/停止トグル
add_action('wp_ajax_anke_yahoo_trend_toggle', 'anke_yahoo_trend_toggle');
function anke_yahoo_trend_toggle() {
    check_ajax_referer('anke_yahoo_trend_toggle', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
        return;
    }
    
    $enabled = isset($_POST['enabled']) && $_POST['enabled'] === '1' ? 1 : 0;
    
    // 設定を保存
    update_option('anke_yahoo_trend_enabled', $enabled);
    
    // 既存のスケジュールを削除
    $timestamp = wp_next_scheduled('anke_yahoo_trend_cron');
    if ($timestamp) {
        wp_unschedule_event($timestamp, 'anke_yahoo_trend_cron');
    }
    
    // 有効な場合は新しいスケジュールを設定
    if ($enabled) {
        $interval = get_option('anke_yahoo_trend_interval', 24);
        $next_run = time() + ($interval * 3600);
        wp_schedule_event($next_run, 'anke_yahoo_trend_interval', 'anke_yahoo_trend_cron');
    }
    
    wp_send_json_success($enabled ? 'Yahoo!トレンド自動取得を開始しました' : 'Yahoo!トレンド自動取得を停止しました');
}

// Yahoo!トレンド手動取得用のアクションフック
add_action('wp_ajax_anke_yahoo_fetch_trends_manual', 'anke_yahoo_fetch_trends_manual');
function anke_yahoo_fetch_trends_manual() {
    check_ajax_referer('anke_yahoo_manual', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
    }
    
    $fetcher = new Anke_Yahoo_Trend_Fetcher();
    $limit = get_option('anke_yahoo_trend_limit', 5);
    
    $trends = $fetcher->fetch_trends('japan', $limit);
    
    if (is_wp_error($trends)) {
        wp_send_json_error($trends->get_error_message());
    }
    
    wp_send_json_success(array(
        'trends' => $trends
    ));
}

// Yahoo!トレンド個別記事作成用のアクションフック
add_action('wp_ajax_anke_yahoo_create_single', 'anke_yahoo_create_single');
function anke_yahoo_create_single() {
    check_ajax_referer('anke_yahoo_manual', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
    }
    
    $trend_name = sanitize_text_field($_POST['trend_name'] ?? '');
    
    if (empty($trend_name)) {
        wp_send_json_error('トレンドワードが指定されていません');
    }
    
    // トレンドデータを作成
    $trend = array(
        'name' => $trend_name,
        'tweet_volume' => 0,
    );
    
    // ダミーツイート生成
    $fetcher = new Anke_Yahoo_Trend_Fetcher();
    $tweets = $fetcher->search_tweets($trend['name'], 5);
    
    if (is_wp_error($tweets) || empty($tweets)) {
        wp_send_json_error('ツイートの取得に失敗しました');
    }
    
    // 記事コンテンツ作成（Yahoo!トレンドの場合は空にする）
    $article = array(
        'url' => 'https://search.yahoo.co.jp/realtime/search?p=' . urlencode($trend['name']),
        'title' => "【トレンド】{$trend['name']}について",
        'content' => '',
        'image' => get_site_url() . '/wp-content/uploads/yahoo-thumbnail.jpg',
    );
    
    // ChatGPTでアンケート生成
    $generator = new Anke_Auto_Creator_ChatGPT_Generator();
    $anke_data = $generator->generate_anke($article);
    
    if (isset($anke_data['error'])) {
        wp_send_json_error('ChatGPTエラー: ' . $anke_data['error']);
    }
    
    // 質問者を選択
    $scheduler = new Anke_Auto_Creator_Cron_Scheduler();
    $questioner_id = $scheduler->select_questioner_for_manual();
    
    if (!$questioner_id) {
        wp_send_json_error('質問者が見つかりません');
    }
    
    // アンケートを作成
    $creator = new Anke_Auto_Creator_Anke_Creator();
    $result = $creator->create_anke($anke_data, $article, $questioner_id);
    
    if (isset($result['error'])) {
        wp_send_json_error('記事作成エラー: ' . $result['error']);
    }
    
    // カテゴリーを設定
    $category = get_option('anke_yahoo_trend_category', 0);
    if ($category > 0) {
        wp_set_post_categories($result['post_id'], array($category));
    }
    
    // 投稿ステータスを設定
    $post_status = get_option('anke_yahoo_trend_post_status', 'draft');
    wp_update_post(array(
        'ID' => $result['post_id'],
        'post_status' => $post_status
    ));
    
    wp_send_json_success(array(
        'post_id' => $result['post_id'],
        'post_url' => get_permalink($result['post_id'])
    ));
}

// Yahoo!リアルタイム検索トレンドからアンケート作成用のCronフック
add_action('anke_yahoo_trend_cron', 'anke_yahoo_trend_cron_execute');
function anke_yahoo_trend_cron_execute() {
    $enabled = get_option('anke_yahoo_trend_enabled', 0);
    
    if (!$enabled) {
        error_log('[Anke Yahoo Trend Cron] 無効化されているため実行をスキップしました');
        return;
    }
    
    error_log('[Anke Yahoo Trend Cron] 自動実行を開始しました');
    
    $fetcher = new Anke_Yahoo_Trend_Fetcher();
    $limit = get_option('anke_yahoo_trend_limit', 5);
    
    $trends = $fetcher->fetch_trends('japan', $limit);
    
    if (is_wp_error($trends)) {
        error_log('Anke Yahoo Trend Error: ' . $trends->get_error_message());
        return;
    }
    
    // トレンドからアンケートを作成
    $post_status = get_option('anke_yahoo_trend_post_status', 'draft');
    $category = get_option('anke_yahoo_trend_category', 0);
    $auto_post_count = get_option('anke_yahoo_trend_auto_post_count', 3);
    
    // 自動投稿件数分だけ処理
    $trends_to_post = array_slice($trends, 0, $auto_post_count);
    
    foreach ($trends_to_post as $trend) {
        // トレンドワードでツイートを検索
        $tweets = $fetcher->search_tweets($trend['name'], 5);
        
        if (is_wp_error($tweets) || empty($tweets)) {
            continue;
        }
        
        // 投稿内容からアンケート記事を生成（Yahoo!トレンドの場合は空にする）
        $article = array(
            'url' => 'https://search.yahoo.co.jp/realtime/search?p=' . urlencode($trend['name']),
            'title' => "【トレンド】{$trend['name']}について",
            'content' => '',
            'image' => get_site_url() . '/wp-content/uploads/yahoo-thumbnail.jpg',
        );
        
        // ChatGPTでアンケート生成
        $generator = new Anke_Auto_Creator_ChatGPT_Generator();
        $anke_data = $generator->generate_anke($article);
        
        if (isset($anke_data['error'])) {
            error_log('Anke Yahoo Trend: ChatGPT Error - ' . $anke_data['error']);
            continue;
        }
        
        // 質問者を選択
        $scheduler = new Anke_Auto_Creator_Cron_Scheduler();
        $questioner_id = $scheduler->select_questioner_for_manual();
        
        if (!$questioner_id) {
            error_log('Anke Yahoo Trend: No questioner found');
            continue;
        }
        
        // アンケートを作成
        $creator = new Anke_Auto_Creator_Anke_Creator();
        $result = $creator->create_anke($anke_data, $article, $questioner_id);
        
        if (isset($result['error'])) {
            error_log('Anke Yahoo Trend: Create Error - ' . $result['error']);
            continue;
        }
        
        // カテゴリーを設定
        if ($category > 0) {
            wp_set_post_categories($result['post_id'], array($category));
        }
        
        // 投稿ステータスを設定
        wp_update_post(array(
            'ID' => $result['post_id'],
            'post_status' => $post_status,
        ));
        
        error_log('[Anke Yahoo Trend Cron] 記事作成完了: post_id=' . $result['post_id'] . ', trend=' . $trend['name']);
        
        // API制限を考慮して1件のみ作成
        break;
    }
    
    error_log('[Anke Yahoo Trend Cron] 自動実行を完了しました');
}
