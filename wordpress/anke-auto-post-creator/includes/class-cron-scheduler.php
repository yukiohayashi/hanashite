<?php
/**
 * Cronスケジューラークラス
 */

if (!defined('ABSPATH')) {
    exit;
}

class Anke_Auto_Creator_Cron_Scheduler {
    
    private $settings;
    
    public function __construct() {
        $this->settings = get_option('anke_auto_creator_settings', array());
    }
    
    /**
     * Cron実行
     */
    public function execute() {
        error_log('=== Anke Auto Creator Cron START ===');
        error_log('Execution time: ' . date('Y-m-d H:i:s'));
        
        // 停止状態チェック
        if (!($this->settings['enabled'] ?? true)) {
            error_log('SKIP: Auto creation is disabled');
            return array(
                'success' => false,
                'message' => '自動作成が停止中です'
            );
        }
        
        // 作成しない時間帯チェック
        if ($this->is_blackout_time()) {
            error_log('SKIP: Blackout time');
            return array(
                'success' => false,
                'message' => '作成しない時間帯です'
            );
        }
        
        // URLリストを取得
        $urls = $this->settings['urls'] ?? array();
        
        if (empty($urls)) {
            error_log('ERROR: No RSS URLs configured');
            return array(
                'success' => false,
                'message' => 'URLが設定されていません'
            );
        }
        
        error_log('Configured RSS URLs: ' . count($urls));
        
        // ランダムにURLを選択
        $url = $urls[array_rand($urls)];
        
        // 現在のソースURLを保存（記録用）
        $this->settings['current_source_url'] = $url;
        update_option('anke_auto_creator_settings', $this->settings);
        
        // スクレイピング
        $scraper = new Anke_Auto_Creator_URL_Scraper();
        $articles = $scraper->fetch_articles($url, 10);
        
        if (empty($articles)) {
            error_log('Anke Auto Creator: 記事が取得できませんでした。URL: ' . $url);
            return array(
                'success' => false,
                'message' => '記事が取得できませんでした（URL: ' . $url . '）'
            );
        }
        
        // 未処理の記事を探す
        $creator = new Anke_Auto_Creator_Anke_Creator();
        $unprocessed_article = null;
        
        error_log('Checking ' . count($articles) . ' articles for unprocessed ones');
        
        foreach ($articles as $article) {
            $is_processed = $creator->is_url_processed($article['url']);
            error_log('Article URL: ' . $article['url'] . ' | Processed: ' . ($is_processed ? 'YES' : 'NO'));
            
            if (!$is_processed) {
                $unprocessed_article = $article;
                error_log('Found unprocessed article: ' . $article['url']);
                break;
            }
        }
        
        if (!$unprocessed_article) {
            error_log('ERROR: No unprocessed articles found');
            return array(
                'success' => false,
                'message' => '未処理の記事がありません'
            );
        }
        
        // ChatGPTでアンケート生成
        error_log('Starting ChatGPT generation for: ' . $unprocessed_article['title']);
        $generator = new Anke_Auto_Creator_ChatGPT_Generator();
        $anke_data = $generator->generate_anke($unprocessed_article);
        error_log('ChatGPT generation completed');
        
        if (isset($anke_data['error'])) {
            return array(
                'success' => false,
                'message' => 'アンケート生成エラー: ' . $anke_data['error']
            );
        }
        
        // 質問者を選択
        $questioner_id = $this->select_questioner();
        
        if (!$questioner_id) {
            return array(
                'success' => false,
                'message' => '質問者が見つかりません'
            );
        }
        
        // アンケート作成
        $result = $creator->create_anke($anke_data, $unprocessed_article, $questioner_id);
        
        if (isset($result['error'])) {
            return array(
                'success' => false,
                'message' => 'アンケート作成エラー: ' . $result['error']
            );
        }
        
        // 次回実行時刻を計算（ゆらぎを含む）
        $this->schedule_next_run();
        
        return array(
            'success' => true,
            'message' => 'アンケートを作成しました',
            'post_id' => $result['post_id'],
            'post_url' => $result['post_url'],
            'article_url' => $unprocessed_article['url']
        );
    }
    
    /**
     * 作成しない時間帯かチェック
     */
    private function is_blackout_time() {
        $blackout_start = $this->settings['blackout_start'] ?? '00:00';
        $blackout_end = $this->settings['blackout_end'] ?? '06:00';
        
        if (empty($blackout_start) || empty($blackout_end)) {
            return false;
        }
        
        $current_time = current_time('H:i');
        
        // 日をまたぐ場合の処理
        if ($blackout_start > $blackout_end) {
            return $current_time >= $blackout_start || $current_time < $blackout_end;
        } else {
            return $current_time >= $blackout_start && $current_time < $blackout_end;
        }
    }

    /**
     * 手動実行用に質問者を選択（既存ロジックをそのまま利用）
     */
    public function select_questioner_for_manual() {
        return $this->select_questioner();
    }
    
    /**
     * 質問者を選択
     */
    private function select_questioner() {
        global $wpdb;
        
        error_log('=== SELECT QUESTIONER DEBUG ===');
        
        // ランダムに選択（AI会員の使用確率に基づく）
        // status=2（編集者）またはstatus=6（AI会員）のみ使用
        $ai_member_probability = isset($this->settings['ai_member_probability']) ? intval($this->settings['ai_member_probability']) : 70;
        
        // 確率でAI会員か編集者かを決定
        $use_ai_member = rand(1, 100) <= $ai_member_probability;
        $status = $use_ai_member ? 6 : 2;
        
        $questioner = $wpdb->get_row($wpdb->prepare(
            "SELECT id, user_nicename, status FROM {$wpdb->prefix}anke_users WHERE status = %d ORDER BY RAND() LIMIT 1",
            $status
        ));
        
        if ($questioner) {
            $type = $use_ai_member ? 'AI会員' : '編集者';
            error_log('Questioner selected (' . $type . '): ID=' . $questioner->id . ' (' . $questioner->user_nicename . ', status=' . $questioner->status . ')');
            return $questioner->id;
        }
        
        error_log('ERROR: No users with status=' . $status . ' found in wp_anke_users');
        return 0;
    }
    
    /**
     * 次回実行をスケジュール（ゆらぎ付き）
     */
    private function schedule_next_run() {
        $interval_hours = $this->settings['interval_hours'] ?? 1;
        $variance_minutes = $this->settings['interval_variance'] ?? 15;
        
        // ゆらぎを計算（±variance_minutes）
        $variance_seconds = rand(-$variance_minutes * 60, $variance_minutes * 60);
        // wp_schedule_event()用のUTCタイムスタンプ
        $next_run_utc = time() + ($interval_hours * 3600) + $variance_seconds;
        // 表示用のJSTタイムスタンプ
        $next_run = current_time('timestamp') + ($interval_hours * 3600) + $variance_seconds;
        
        // 既存のスケジュールを削除（特定のタイムスタンプのみ）
        $timestamp = wp_next_scheduled('anke_auto_creator_cron');
        if ($timestamp) {
            wp_unschedule_event($timestamp, 'anke_auto_creator_cron');
        }
        
        // 新しいスケジュールを設定（繰り返し実行）
        $scheduled = wp_schedule_event($next_run_utc, 'anke_rss_interval', 'anke_auto_creator_cron');
        
        if ($scheduled === false) {
            error_log('Anke Auto Creator ERROR: Failed to schedule next cron event');
        } else {
            // ログに記録
            update_option('anke_auto_creator_next_run', $next_run);
            error_log('Anke Auto Creator: Next RSS cron scheduled at ' . wp_date('Y-m-d H:i:s', $next_run));
        }
    }
    
    /**
     * 次回実行時刻を取得
     */
    public static function get_next_run_time() {
        $next_run = get_option('anke_auto_creator_next_run', 0);
        
        // 過去の時刻の場合は無効化
        if ($next_run && $next_run > current_time('timestamp')) {
            // next_runはJSTタイムスタンプなので、そのままdate()に渡す
            return date('Y-m-d H:i:s', $next_run);
        }
        
        $timestamp = wp_next_scheduled('anke_auto_creator_cron');
        
        // スケジュールが未設定で、自動作成が有効な場合は初回スケジュールを設定
        if (!$timestamp) {
            $settings = get_option('anke_auto_creator_settings', array());
            if ($settings['enabled'] ?? true) {
                self::setup_initial_schedule();
                $timestamp = wp_next_scheduled('anke_auto_creator_cron');
            }
        }
        
        // timestampはUTCなので、GMTオフセットを加算してからdate()に渡す
        return $timestamp ? date('Y-m-d H:i:s', $timestamp + (get_option('gmt_offset') * HOUR_IN_SECONDS)) : '未設定';
    }
    
    /**
     * 初回スケジュールを設定
     */
    public static function setup_initial_schedule() {
        $settings = get_option('anke_auto_creator_settings', array());
        $interval_hours = $settings['interval_hours'] ?? 1;
        $variance_minutes = $settings['interval_variance'] ?? 15;
        
        // ゆらぎを計算
        $variance_seconds = rand(-$variance_minutes * 60, $variance_minutes * 60);
        // wp_schedule_event()用のUTCタイムスタンプ
        $next_run_utc = time() + ($interval_hours * 3600) + $variance_seconds;
        // 表示用のJSTタイムスタンプ
        $next_run = current_time('timestamp') + ($interval_hours * 3600) + $variance_seconds;
        
        // スケジュールを設定（繰り返し実行）
        wp_schedule_event($next_run_utc, 'anke_rss_interval', 'anke_auto_creator_cron');
        update_option('anke_auto_creator_next_run', $next_run);
        
        error_log('Anke Auto Creator: Initial RSS cron scheduled at ' . wp_date('Y-m-d H:i:s', $next_run));
    }
}
