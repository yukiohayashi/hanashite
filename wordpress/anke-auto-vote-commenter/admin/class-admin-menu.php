<?php
/**
 * 管理画面メニュークラス
 */

if (!defined('ABSPATH')) {
    exit;
}

class Anke_Auto_Commenter_Admin_Menu {
    
    /**
     * コンストラクタ
     */
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'save_settings'));
    }
    
    /**
     * 管理画面メニューを追加
     */
    public function add_admin_menu() {
        add_menu_page(
            'アンケ自動投票コメント',
            'アンケ自動投票コメント',
            'manage_options',
            'anke-auto-vote-commenter',
            array($this, 'render_settings_page'),
            'dashicons-admin-comments',
            30
        );
    }
    
    /**
     * 設定画面を表示
     */
    public function render_settings_page() {
        if (!current_user_can('manage_options')) {
            wp_die('権限がありません');
        }
        
        include ANKE_AUTO_COMMENTER_PLUGIN_DIR . 'admin/views/settings.php';
    }
    
    /**
     * 設定を保存
     */
    public function save_settings() {
        if (!isset($_POST['anke_commenter_save'])) {
            return;
        }
        
        if (!current_user_can('manage_options')) {
            wp_die('権限がありません');
        }
        
        check_admin_referer('anke_commenter_settings', 'anke_commenter_nonce');
        
        // 設定を取得
        $interval_minutes = intval($_POST['interval'] ?? 120);
        
        // 最小1分（制限なし）
        $interval_minutes = max(1, $interval_minutes);
        $settings = array(
            'enabled' => isset($_POST['enabled']) ? true : false,
            'interval' => $interval_minutes, // 分単位で保存
            'interval_variance' => intval($_POST['interval_variance'] ?? 30),
            'no_run_start' => sanitize_text_field($_POST['no_run_start'] ?? '00:00'),
            'no_run_end' => sanitize_text_field($_POST['no_run_end'] ?? '06:00'),
            'commenter_mode' => sanitize_text_field($_POST['commenter_mode'] ?? 'random'),
            'fixed_commenter' => intval($_POST['fixed_commenter'] ?? 0),
            'posts_per_run' => max(1, min(10, intval($_POST['posts_per_run'] ?? 1))), // 1〜10件
            'votes_per_run' => max(1, min(20, intval($_POST['votes_per_run'] ?? 3))), // 1〜20票
            'votes_variance' => max(0, min(10, intval($_POST['votes_variance'] ?? 2))), // 0〜10票
            'comment_min_length' => intval($_POST['comment_min_length'] ?? 50),
            'comment_max_length' => intval($_POST['comment_max_length'] ?? 150),
            'profile_weight' => sanitize_text_field($_POST['profile_weight'] ?? 'high'),
            'content_weight' => sanitize_text_field($_POST['content_weight'] ?? 'high'),
            'comment_style' => sanitize_text_field($_POST['comment_style'] ?? 'formal'),
            'reply_probability' => intval($_POST['reply_probability'] ?? 30),
            'like_probability' => intval($_POST['like_probability'] ?? 40),
            'post_like_probability' => intval($_POST['post_like_probability'] ?? 50),
            'target_days' => intval($_POST['target_days'] ?? 3),
            'author_reply_probability' => intval($_POST['author_reply_probability'] ?? 70),
            'max_comments_per_post' => intval($_POST['max_comments_per_post'] ?? 50),
            'max_comments_variance' => intval($_POST['max_comments_variance'] ?? 20),
            'min_votes' => intval($_POST['min_votes'] ?? 0),
            'max_votes' => intval($_POST['max_votes'] ?? 9999),
            'mention_other_choices_probability' => intval($_POST['mention_other_choices_probability'] ?? 30),
            'target_categories' => isset($_POST['target_categories']) ? array_map('intval', $_POST['target_categories']) : array(),
            'category_vote_ranges' => isset($_POST['category_vote_ranges']) ? $this->sanitize_category_vote_ranges($_POST['category_vote_ranges']) : array(),
            'category_target_days' => isset($_POST['category_target_days']) ? array_map('intval', $_POST['category_target_days']) : array(),
        );
        
        // 設定を保存
        update_option('anke_auto_commenter_settings', $settings);
        
        // Cronスケジュールを更新
        $this->update_cron_schedule($settings);
    }
    
    /**
     * カテゴリごとの投票数範囲をサニタイズ
     * 
     * @param array $ranges 投票数範囲の配列
     * @return array サニタイズされた配列
     */
    private function sanitize_category_vote_ranges($ranges) {
        $sanitized = array();
        
        if (!is_array($ranges)) {
            return $sanitized;
        }
        
        foreach ($ranges as $category_id => $range) {
            $cat_id = intval($category_id);
            $sanitized[$cat_id] = array(
                'min' => isset($range['min']) ? intval($range['min']) : 0,
                'max' => isset($range['max']) ? intval($range['max']) : 9999,
            );
        }
        
        return $sanitized;
    }
    
    /**
     * Cronスケジュールを更新
     * 注: CRONマネージャーが管理するため、独自のスケジュール設定は不要
     * 
     * @param array $settings 設定
     */
    private function update_cron_schedule($settings) {
        // 既存のスケジュールを削除（CRONマネージャーが管理するため）
        $timestamp = wp_next_scheduled('anke_auto_commenter_cron');
        if ($timestamp) {
            wp_unschedule_event($timestamp, 'anke_auto_commenter_cron');
        }
    }
}
