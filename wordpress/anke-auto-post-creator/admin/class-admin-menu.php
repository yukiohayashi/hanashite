<?php
/**
 * 管理画面メニュークラス
 */

if (!defined('ABSPATH')) {
    exit;
}

class Anke_Auto_Creator_Admin_Menu {
    
    public function __construct() {
        add_action('admin_menu', array($this, 'add_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
    }
    
    /**
     * 管理メニューを追加
     */
    public function add_menu() {
        add_menu_page(
            'アンケ自動作成',
            'アンケ自動作成',
            'manage_options',
            'anke-auto-creator',
            array($this, 'render_settings_page'),
            'dashicons-admin-generic',
            30
        );
    }
    
    /**
     * 設定を登録
     */
    public function register_settings() {
        register_setting('anke_auto_creator_settings', 'anke_auto_creator_settings');
    }
    
    /**
     * スクリプトを読み込み
     */
    public function enqueue_scripts($hook) {
        if ($hook !== 'toplevel_page_anke-auto-creator') {
            return;
        }
        
        wp_enqueue_script(
            'anke-auto-creator-admin',
            ANKE_AUTO_CREATOR_URL . 'admin/js/admin.js',
            array('jquery'),
            ANKE_AUTO_CREATOR_VERSION,
            true
        );
        
        wp_localize_script('anke-auto-creator-admin', 'ankeAutoCreator', array(
            'ajax_url' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('anke_auto_creator_manual')
        ));
    }
    
    /**
     * 設定画面を表示
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            return;
        }
        
        // 有効/無効の切り替え
        if (isset($_POST['action']) && $_POST['action'] === 'toggle_enabled') {
            check_admin_referer('anke_auto_creator_toggle');
            $this->toggle_enabled();
            $status = $_POST['enabled'] === '1' ? '開始' : '停止';
            echo '<div class="notice notice-success"><p>自動作成を' . esc_html($status) . 'しました</p></div>';
        }
        
        // 設定を保存
        if (isset($_POST['anke_auto_creator_save'])) {
            check_admin_referer('anke_auto_creator_settings');
            $this->save_settings();
            echo '<div class="notice notice-success"><p>設定を保存しました</p></div>';
        }
        
        $settings = get_option('anke_auto_creator_settings', array());
        $questioners = $this->get_questioners();
        
        include ANKE_AUTO_CREATOR_PATH . 'admin/views/settings.php';
    }
    
    /**
     * 有効/無効を切り替え
     */
    private function toggle_enabled() {
        $settings = get_option('anke_auto_creator_settings', array());
        $enabled = isset($_POST['enabled']) && $_POST['enabled'] === '1';
        $settings['enabled'] = $enabled;
        update_option('anke_auto_creator_settings', $settings);
        
        // 既存のスケジュールを削除
        $timestamp = wp_next_scheduled('anke_auto_creator_cron');
        if ($timestamp) {
            wp_unschedule_event($timestamp, 'anke_auto_creator_cron');
        }
        delete_option('anke_auto_creator_next_run');
        
        // 有効化する場合は新しいスケジュールを設定
        if ($enabled) {
            Anke_Auto_Creator_Cron_Scheduler::setup_initial_schedule();
        }
    }
    
    /**
     * 設定を保存
     */
    private function save_settings() {
        // OpenAI API設定の保存
        if (isset($_POST['anke_openai_save']) && check_admin_referer('anke_openai_settings', 'anke_openai_nonce')) {
            $settings = get_option('anke_auto_creator_settings', array());
            $settings['openai_api_key'] = sanitize_text_field($_POST['openai_api_key'] ?? '');
            $settings['openai_model'] = sanitize_text_field($_POST['openai_model'] ?? 'gpt-4o-mini');
            $settings['max_keywords'] = intval($_POST['max_keywords'] ?? 5);
            $settings['max_categories'] = intval($_POST['max_categories'] ?? 3);
            $settings['questioner_mode'] = sanitize_text_field($_POST['questioner_mode'] ?? 'random');
            $settings['fixed_questioner'] = intval($_POST['fixed_questioner'] ?? 0);
            $settings['title_prompt'] = wp_kses_post($_POST['title_prompt'] ?? '');
            $settings['choices_prompt'] = wp_kses_post($_POST['choices_prompt'] ?? '');
            update_option('anke_auto_creator_settings', $settings);
            add_settings_error('anke_auto_creator', 'settings_updated', '設定を保存しました。', 'updated');
            return;
        }
        
        // RSS設定の保存
        $urls = array();
        // 動的な数のURLを受け取る（url_1, url_2, url_3, ...）
        $i = 1;
        while (isset($_POST["url_{$i}"])) {
            $url = sanitize_text_field($_POST["url_{$i}"]);
            if (!empty($url)) {
                $urls[] = $url;
            }
            $i++;
        }
        
        $settings = get_option('anke_auto_creator_settings', array());
        $settings['urls'] = $urls;
        // intervalは分単位で受け取り、時間単位で保存
        $interval_minutes = intval($_POST['interval'] ?? 60);
        $settings['interval_hours'] = round($interval_minutes / 60, 2); // 時間に変換
        $settings['interval_variance'] = intval($_POST['interval_variance'] ?? 15);
        $settings['posts_per_run'] = intval($_POST['posts_per_run'] ?? 1);
        $settings['blackout_start'] = sanitize_text_field($_POST['blackout_start'] ?? '00:00');
        $settings['blackout_end'] = sanitize_text_field($_POST['blackout_end'] ?? '06:00');
        $settings['scraping_delay_min'] = intval($_POST['scraping_delay_min'] ?? 30);
        $settings['scraping_delay_max'] = intval($_POST['scraping_delay_max'] ?? 120);
        
        update_option('anke_auto_creator_settings', $settings);
    }
    
    /**
     * 質問者一覧を取得
     */
    private function get_questioners() {
        global $wpdb;
        
        return $wpdb->get_results(
            "SELECT id, user_nicename, user_email 
             FROM {$wpdb->prefix}anke_users 
             WHERE status = 2 
             ORDER BY user_nicename ASC"
        );
    }
}
