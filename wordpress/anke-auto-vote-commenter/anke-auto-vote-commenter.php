<?php
/**
 * Plugin Name: Anke Auto Vote Commenter
 * Plugin URI: https://anke.jp
 * Description: アンケート記事に対して自動的に投票・コメント投稿・返信・いいねを実行するプラグイン。ユーザープロフィールを考慮した自然なコメントを生成します。
 * Version: 1.0.0
 * Author: Anke Team
 * Author URI: https://anke.jp
 * License: GPL v2 or later
 * Text Domain: anke-auto-vote-commenter
 */

// 直接アクセスを防止
if (!defined('ABSPATH')) {
    exit;
}

// プラグインのバージョン
define('ANKE_AUTO_COMMENTER_VERSION', '1.0.0');
define('ANKE_AUTO_COMMENTER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ANKE_AUTO_COMMENTER_PLUGIN_URL', plugin_dir_url(__FILE__));

// 必要なクラスファイルを読み込み
require_once ANKE_AUTO_COMMENTER_PLUGIN_DIR . 'includes/class-voter.php';
require_once ANKE_AUTO_COMMENTER_PLUGIN_DIR . 'includes/class-profile-analyzer.php';
require_once ANKE_AUTO_COMMENTER_PLUGIN_DIR . 'includes/class-commenter.php';
require_once ANKE_AUTO_COMMENTER_PLUGIN_DIR . 'admin/class-admin-menu.php';

/**
 * プラグイン有効化時の処理
 */
function anke_auto_commenter_activate() {
    // デフォルト設定を保存
    $default_settings = array(
        'enabled' => false, // デフォルトは無効
        'interval' => 2, // 2時間ごと
        'interval_variance' => 30, // ±30分
        'no_run_start' => '00:00',
        'no_run_end' => '06:00',
        'commenter_mode' => 'random', // random or fixed
        'fixed_commenter' => 0,
        'posts_per_run' => 1, // 1回の実行で処理する記事数（1〜10件）
        'comment_min_length' => 10,
        'comment_max_length' => 60,
        'profile_weight' => 'high', // high, medium, low
    );
    
    if (!get_option('anke_auto_commenter_settings')) {
        add_option('anke_auto_commenter_settings', $default_settings);
    }
}
register_activation_hook(__FILE__, 'anke_auto_commenter_activate');

/**
 * プラグイン無効化時の処理
 */
function anke_auto_commenter_deactivate() {
    // Cronジョブを削除
    $timestamp = wp_next_scheduled('anke_auto_commenter_cron');
    if ($timestamp) {
        wp_unschedule_event($timestamp, 'anke_auto_commenter_cron');
    }
}
register_deactivation_hook(__FILE__, 'anke_auto_commenter_deactivate');

/**
 * 管理画面メニューを初期化
 */
function anke_auto_commenter_init_admin() {
    if (is_admin()) {
        new Anke_Auto_Commenter_Admin_Menu();
    }
}
add_action('plugins_loaded', 'anke_auto_commenter_init_admin');

/**
 * Cronスケジュールの設定
 * 注: CRONマネージャーから呼び出されるため、独自のスケジュール設定は不要
 */
function anke_auto_commenter_setup_schedule() {
    // CRONマネージャーが管理するため、ここでは何もしない
    // 既存のスケジュールがあれば削除
    $timestamp = wp_next_scheduled('anke_auto_commenter_cron');
    if ($timestamp) {
        wp_unschedule_event($timestamp, 'anke_auto_commenter_cron');
    }
}
add_action('init', 'anke_auto_commenter_setup_schedule');

/**
 * カスタムCron間隔を追加
 */
function anke_auto_commenter_cron_schedules($schedules) {
    $settings = get_option('anke_auto_commenter_settings', array());
    $interval_minutes = isset($settings['interval']) ? intval($settings['interval']) : 120; // デフォルト120分
    
    $schedules['anke_commenter_interval'] = array(
        'interval' => $interval_minutes * 60, // 分を秒に変換
        'display' => sprintf(__('%d分ごと', 'anke-auto-commenter'), $interval_minutes)
    );
    
    return $schedules;
}
add_filter('cron_schedules', 'anke_auto_commenter_cron_schedules');

/**
 * Cron実行時の処理
 */
function anke_auto_commenter_cron_execute() {
    global $wpdb;
    
    // デバッグログ：実行開始
    error_log('[Anke Auto Commenter] Cron execution started at ' . current_time('mysql'));
    
    // 設定を先に取得
    $settings = get_option('anke_auto_commenter_settings', array());
    $creator_settings = get_option('anke_auto_creator_settings', array());
    
    try {
        // OpenAI API設定を確認
        $openai_api_key = $creator_settings['openai_api_key'] ?? '';
        
        if (empty($openai_api_key)) {
            error_log('[Anke Auto Commenter] ERROR: OpenAI API Keyが設定されていません');
            return;
        }
        
        // 有効化チェック
        if (empty($settings['enabled'])) {
            error_log('[Anke Auto Commenter] Auto commenter is disabled');
            return;
        }
        
        // 実行しない時間帯チェック
        $current_time = current_time('H:i');
        $no_run_start = isset($settings['no_run_start']) ? $settings['no_run_start'] : '00:00';
        $no_run_end = isset($settings['no_run_end']) ? $settings['no_run_end'] : '06:00';
        
        if ($current_time >= $no_run_start && $current_time <= $no_run_end) {
            error_log('[Anke Auto Commenter] Skipped: blackout time (' . $no_run_start . ' - ' . $no_run_end . ')');
            return;
        }
        
        // 自動投稿の間隔チェック（手動投稿は無視）
        $interval_minutes = isset($settings['interval']) ? intval($settings['interval']) : 120;
        $interval_variance = isset($settings['interval_variance']) ? intval($settings['interval_variance']) : 30;
        
        // is_auto_generatedカラムの存在確認
        $column_exists = $wpdb->get_var("
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = '{$wpdb->prefix}anke_comments' 
            AND COLUMN_NAME = 'is_auto_generated'
        ");
        
        if (!$column_exists) {
            error_log('[Anke Auto Commenter] ERROR: is_auto_generated column does not exist. Adding column...');
            $wpdb->query("ALTER TABLE {$wpdb->prefix}anke_comments ADD COLUMN is_auto_generated TINYINT(1) DEFAULT 0");
        }
        
        // 最後の自動投稿を取得（is_auto_generated = 1のみ）
        $last_auto_comment = $wpdb->get_var("
            SELECT created_at 
            FROM {$wpdb->prefix}anke_comments 
            WHERE is_auto_generated = 1 
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        
        error_log('[Anke Auto Commenter] Last auto comment: ' . ($last_auto_comment ?: 'none'));
        
        if ($last_auto_comment) {
            // WordPressのタイムゾーンで計算
            $timezone = wp_timezone();
            $last_comment_time = new DateTime($last_auto_comment, $timezone);
            $now = new DateTime('now', $timezone);
            $elapsed_seconds = $now->getTimestamp() - $last_comment_time->getTimestamp();
            $elapsed_minutes = $elapsed_seconds / 60;
            
            // 最小間隔を計算（間隔 - ゆらぎ）
            $min_interval = $interval_minutes - $interval_variance;
            
            if ($elapsed_minutes < $min_interval) {
                error_log('[Anke Auto Commenter] Too soon since last auto comment. Elapsed: ' . round($elapsed_minutes) . ' min, Required: ' . $min_interval . ' min');
                return;
            }
            error_log('[Anke Auto Commenter] Interval check passed. Elapsed: ' . round($elapsed_minutes) . ' min');
        } else {
            error_log('[Anke Auto Commenter] No previous auto comments found. Proceeding...');
        }
    } catch (Exception $e) {
        error_log('[Anke Auto Commenter] ERROR in cron_execute: ' . $e->getMessage());
        return;
    }
    
    // 処理件数（$settingsはtry-catch内で定義済み）
    $posts_per_run = isset($settings['posts_per_run']) ? intval($settings['posts_per_run']) : 3;
    
    // コメント投稿者を取得
    $commenter_mode = isset($settings['commenter_mode']) ? $settings['commenter_mode'] : 'random';
    $fixed_commenter = isset($settings['fixed_commenter']) ? intval($settings['fixed_commenter']) : 0;
    
    // 対象記事の期間を取得
    $target_days = isset($settings['target_days']) ? intval($settings['target_days']) : 3;
    $min_votes = isset($settings['min_votes']) ? intval($settings['min_votes']) : 0;
    $target_categories = isset($settings['target_categories']) ? $settings['target_categories'] : array();
    $category_vote_ranges = isset($settings['category_vote_ranges']) ? $settings['category_vote_ranges'] : array();
    $category_target_days = isset($settings['category_target_days']) ? $settings['category_target_days'] : array();
    $category_filter_logic = isset($settings['category_filter_logic']) ? $settings['category_filter_logic'] : array();
    $prioritize_recent_posts = isset($settings['prioritize_recent_posts']) ? intval($settings['prioritize_recent_posts']) : 1;
    $priority_days = isset($settings['priority_days']) ? intval($settings['priority_days']) : 3;
    $priority_weight = isset($settings['priority_weight']) ? intval($settings['priority_weight']) : 5;
    
    // カテゴリフィルタのSQL
    $category_sql = '';
    if (!empty($target_categories)) {
        $category_ids = implode(',', array_map('intval', $target_categories));
        $category_sql = "AND p.ID IN (
            SELECT post_id FROM {$wpdb->prefix}anke_post_categories 
            WHERE category_id IN ($category_ids)
        )";
    }
    
    // 対象アンケート記事を取得（投票数範囲とカテゴリでフィルタ）
    $target_posts = $wpdb->get_results($wpdb->prepare("
        SELECT p.ID, p.post_title, p.post_content, p.post_author, p.post_date
        FROM {$wpdb->posts} p
        LEFT JOIN (
            SELECT post_id, COUNT(*) as vote_count
            FROM {$wpdb->prefix}anke_vote_history
            GROUP BY post_id
        ) vh ON p.ID = vh.post_id
        WHERE p.post_type = 'post'
        AND p.post_status = 'publish'
        AND (
            (p.post_date > DATE_SUB(NOW(), INTERVAL %d DAY))
            OR (COALESCE(vh.vote_count, 0) >= %d)
        )
        $category_sql
        ORDER BY RAND()
        LIMIT %d
    ", $target_days, $min_votes, $posts_per_run * 10)); // 多めに取得してフィルタリング
    
    error_log('[Anke Auto Commenter] Initial posts found: ' . count($target_posts));
    
    // カテゴリごとの投票数範囲と対象期間でフィルタリング
    if (!empty($category_vote_ranges) || !empty($category_target_days)) {
        $filtered_posts = array();
        foreach ($target_posts as $post) {
            // 投稿のカテゴリを取得
            $post_categories = $wpdb->get_col($wpdb->prepare("
                SELECT category_id FROM {$wpdb->prefix}anke_post_categories WHERE post_id = %d
            ", $post->ID));
            
            // 投稿の投票数を取得
            $vote_count = $wpdb->get_var($wpdb->prepare("
                SELECT COUNT(*) FROM {$wpdb->prefix}anke_vote_history WHERE post_id = %d
            ", $post->ID));
            $vote_count = $vote_count ? intval($vote_count) : 0;
            
            // 投稿日時を取得
            $post_date = strtotime($post->post_date);
            $now = current_time('timestamp');
            $days_diff = floor(($now - $post_date) / (60 * 60 * 24));
            
            // カテゴリが設定されていない場合は、全体の条件で判定
            if (empty($post_categories)) {
                if ($days_diff <= $target_days || $vote_count >= $min_votes) {
                    $filtered_posts[] = $post;
                }
                continue;
            }
            
            // いずれかのカテゴリの範囲に該当するかチェック
            $is_valid = false;
            foreach ($post_categories as $cat_id) {
                // 対象期間チェック
                $cat_target_days = isset($category_target_days[$cat_id]) ? intval($category_target_days[$cat_id]) : $target_days;
                
                // カテゴリごとのフィルタロジックを取得
                $cat_filter_logic = isset($category_filter_logic[$cat_id]) ? $category_filter_logic[$cat_id] : 'and';
                
                // 投票数範囲チェック
                if (isset($category_vote_ranges[$cat_id])) {
                    $range = $category_vote_ranges[$cat_id];
                    $cat_min = isset($range['min']) ? intval($range['min']) : 0;
                    
                    // カテゴリごとのフィルタロジックに基づいて判定
                    if ($cat_filter_logic === 'or') {
                        // OR: 期間内または投票数が最小値以上
                        if ($days_diff <= $cat_target_days || $vote_count >= $cat_min) {
                            $is_valid = true;
                            break;
                        }
                    } else {
                        // AND: 期間内かつ投票数が最小値以上
                        if ($days_diff <= $cat_target_days && $vote_count >= $cat_min) {
                            $is_valid = true;
                            break;
                        }
                    }
                } else {
                    // 範囲が設定されていないカテゴリは全体の範囲と期間を使用
                    if ($cat_filter_logic === 'or') {
                        if ($days_diff <= $cat_target_days || $vote_count >= $min_votes) {
                            $is_valid = true;
                            break;
                        }
                    } else {
                        if ($days_diff <= $cat_target_days && $vote_count >= $min_votes) {
                            $is_valid = true;
                            break;
                        }
                    }
                }
            }
            
            if ($is_valid) {
                $filtered_posts[] = $post;
            }
        }
        $target_posts = $filtered_posts;
        error_log('[Anke Auto Commenter] After category filter: ' . count($target_posts) . ' posts');
    } else {
        // カテゴリごとの範囲が設定されていない場合は全体の範囲でフィルタ
        $filtered_posts = array();
        foreach ($target_posts as $post) {
            $vote_count = $wpdb->get_var($wpdb->prepare("
                SELECT COUNT(*) FROM {$wpdb->prefix}anke_vote_history WHERE post_id = %d
            ", $post->ID));
            $vote_count = $vote_count ? intval($vote_count) : 0;
            
            if ($vote_count >= $min_votes) {
                $filtered_posts[] = $post;
            }
        }
        $target_posts = $filtered_posts;
        error_log('[Anke Auto Commenter] After vote count filter: ' . count($target_posts) . ' posts');
    }
    
    // 新しい記事優先モード（段階的重み付け選択）
    if ($prioritize_recent_posts && !empty($target_posts)) {
        $now = time();
        
        // 各記事に重みを付けた配列を作成
        $weighted_posts = array();
        $weight_distribution = array(); // デバッグ用
        
        foreach ($target_posts as $post) {
            $post_date = strtotime($post->post_date);
            $days_old = ($now - $post_date) / (24 * 60 * 60); // 経過日数
            
            // 段階的な重み付け
            if ($days_old < 1) {
                // 今日の記事: 最大重み（基準倍率 × 2）
                $weight = $priority_weight * 2;
                $weight_distribution['today'] = ($weight_distribution['today'] ?? 0) + 1;
            } elseif ($days_old < 2) {
                // 昨日の記事: 高い重み（基準倍率 × 1.5）
                $weight = intval($priority_weight * 1.5);
                $weight_distribution['yesterday'] = ($weight_distribution['yesterday'] ?? 0) + 1;
            } elseif ($days_old < $priority_days) {
                // 優先日数以内の記事: 基準重み
                $weight = $priority_weight;
                $weight_distribution['recent'] = ($weight_distribution['recent'] ?? 0) + 1;
            } else {
                // 古い記事: 通常重み
                $weight = 1;
                $weight_distribution['old'] = ($weight_distribution['old'] ?? 0) + 1;
            }
            
            // 重み分だけ配列に追加（選ばれやすくする）
            for ($i = 0; $i < $weight; $i++) {
                $weighted_posts[] = $post;
            }
        }
        
        // 重み付けされた配列からランダムに選択
        if (!empty($weighted_posts)) {
            shuffle($weighted_posts);
            $target_posts = $weighted_posts;
            error_log('[Anke Auto Commenter] 新しい記事優先モード（段階的）: 今日=' . ($weight_distribution['today'] ?? 0) . '件(×' . ($priority_weight * 2) . '), 昨日=' . ($weight_distribution['yesterday'] ?? 0) . '件(×' . intval($priority_weight * 1.5) . '), ' . $priority_days . '日以内=' . ($weight_distribution['recent'] ?? 0) . '件(×' . $priority_weight . '), 古い記事=' . ($weight_distribution['old'] ?? 0) . '件(×1)');
        }
    }
    
    if (empty($target_posts)) {
        error_log('[Anke Auto Commenter] No target posts found after filtering. Waiting for next execution.');
        return;
    }
    
    error_log('[Anke Auto Commenter] Final target posts: ' . count($target_posts));
    
    $processed_count = 0;
    
    foreach ($target_posts as $post) {
        error_log('[Anke Auto Commenter] Processing post ID: ' . $post->ID);
        
        if ($processed_count >= $posts_per_run) {
            break;
        }
        
        // 記事ごとの最大コメント数をチェック
        $max_comments = isset($settings['max_comments_per_post']) ? intval($settings['max_comments_per_post']) : 50;
        $max_variance = isset($settings['max_comments_variance']) ? intval($settings['max_comments_variance']) : 20;
        
        // この記事の上限をランダムに決定（ゆらぎを含む）
        $post_max_comments = $max_comments + rand(-$max_variance, $max_variance);
        $post_max_comments = max(10, $post_max_comments); // 最低10件
        
        // 現在のコメント数を取得
        $current_comment_count = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*)
            FROM {$wpdb->prefix}anke_comments
            WHERE post_id = %d
            AND status = 'approved'
        ", $post->ID));
        
        // 上限に達している場合はスキップ
        if ($current_comment_count >= $post_max_comments) {
            error_log('[Anke Auto Commenter] Post ' . $post->ID . ' reached max comments: ' . $current_comment_count . '/' . $post_max_comments);
            continue;
        }
        
        error_log('[Anke Auto Commenter] Post ' . $post->ID . ' comment count: ' . $current_comment_count . '/' . $post_max_comments);
        
        // コメント投稿者を決定
        if ($commenter_mode === 'fixed' && $fixed_commenter > 0) {
            $user_id = $fixed_commenter;
        } else {
            $user_id = anke_auto_commenter_get_random_user();
        }
        
        if (!$user_id) {
            error_log('[Anke Auto Commenter] Failed to get random user');
            continue;
        }
        
        error_log('[Anke Auto Commenter] Selected user ID: ' . $user_id);
        
        // ユーザーが存在するか確認
        $user_exists = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*) 
            FROM {$wpdb->prefix}anke_users 
            WHERE id = %d
        ", $user_id));
        
        if (!$user_exists) {
            error_log('[Anke Auto Commenter] User ' . $user_id . ' does not exist');
            continue;
        }
        
        try {
            // コメント投稿クラスをインスタンス化
            require_once ANKE_AUTO_COMMENTER_PLUGIN_DIR . 'includes/class-commenter.php';
            $commenter = new Anke_Auto_Commenter($user_id, $post->ID);
            
            $result = false;
            
            // 返信確率を取得
            $reply_probability = isset($settings['reply_probability']) ? intval($settings['reply_probability']) : 30;
            
            // ランダムで返信するか新規コメントするか決定
            $should_reply = (rand(1, 100) <= $reply_probability);
            
            // 返信対象のコメントがあるか確認
            if ($should_reply) {
                // ゲスト（user_id = 0）への返信確率を70%に設定
                $guest_reply_probability = 70;
                $should_reply_to_guest = (rand(1, 100) <= $guest_reply_probability);
                
                if ($should_reply_to_guest) {
                    // ゲストコメントを優先的に取得
                    $parent_comment = $wpdb->get_row($wpdb->prepare("
                        SELECT id, user_id, content
                        FROM {$wpdb->prefix}anke_comments
                        WHERE post_id = %d
                        AND parent_id = 0
                        AND status = 'approved'
                        AND user_id = 0
                        ORDER BY RAND()
                        LIMIT 1
                    ", $post->ID));
                }
                
                // ゲストコメントがない場合、または30%の確率で通常のコメントを取得
                if (!$parent_comment) {
                    $parent_comment = $wpdb->get_row($wpdb->prepare("
                        SELECT id, user_id, content
                        FROM {$wpdb->prefix}anke_comments
                        WHERE post_id = %d
                        AND parent_id = 0
                        AND status = 'approved'
                        ORDER BY RAND()
                        LIMIT 1
                    ", $post->ID));
                }
                
                // 返信対象がある場合は返信、ない場合は新規コメント
                if ($parent_comment) {
                    // 記事投稿者の返信確率を取得
                    $author_reply_probability = isset($settings['author_reply_probability']) ? intval($settings['author_reply_probability']) : 70;
                    $post_author_id = intval($post->post_author);
                    
                    // 投稿者がstatus=2（編集者）かチェック
                    $author_status = $wpdb->get_var($wpdb->prepare(
                        "SELECT status FROM {$wpdb->prefix}anke_users WHERE id = %d",
                        $post_author_id
                    ));
                    
                    // 記事投稿者を優先的に返信者として選択
                    if ($author_status == 2 && rand(1, 100) <= $author_reply_probability) {
                        // 記事投稿者が返信
                        $commenter = new Anke_Auto_Commenter($post_author_id, $post->ID);
                    }
                    
                    $result = $commenter->execute_reply($parent_comment);
                } else {
                    $result = $commenter->execute();
                }
            } else {
                // 新規コメント（投票付き）
                $result = $commenter->execute();
            }
            
            if ($result) {
                $processed_count++;
                error_log('[Anke Auto Commenter] Comment posted successfully. Post ID: ' . $post->ID . ', User ID: ' . $user_id . ', Processed count: ' . $processed_count);
                
                // 記事へのいいね機能
                $settings = get_option('anke_auto_commenter_settings', array());
                $post_like_probability = isset($settings['post_like_probability']) ? intval($settings['post_like_probability']) : 50;
                
                if (rand(1, 100) <= $post_like_probability && class_exists('Anke_Like')) {
                    // 記事にいいねを追加
                    Anke_Like::add($user_id, 'post', $post->ID, $post->ID);
                    error_log('[Anke Auto Commenter] Post like added. Post ID: ' . $post->ID . ', User ID: ' . $user_id);
                }
                
                // コメントへのいいね機能
                $like_probability = isset($settings['like_probability']) ? intval($settings['like_probability']) : 40;
                $random_value = rand(1, 100);
                
                if ($random_value <= $like_probability) {
                    // いいね数が少ないコメントを優先的に選択（自分のコメント以外）
                    $target_comment = $wpdb->get_row($wpdb->prepare("
                        SELECT c.id
                        FROM {$wpdb->prefix}anke_comments c
                        LEFT JOIN (
                            SELECT target_id, COUNT(*) as like_count
                            FROM {$wpdb->prefix}anke_likes
                            WHERE like_type = 'comment'
                            GROUP BY target_id
                        ) l ON l.target_id = c.id
                        WHERE c.post_id = %d
                        AND c.user_id != %d
                        AND c.status = 'approved'
                        ORDER BY COALESCE(l.like_count, 0) ASC, RAND()
                        LIMIT 1
                    ", $post->ID, $user_id));
                    
                    if ($target_comment && class_exists('Anke_Like')) {
                        // コメントにいいねを追加
                        Anke_Like::add($user_id, 'comment', $target_comment->id, $post->ID);
                        error_log('[Anke Auto Commenter] Comment like added. Comment ID: ' . $target_comment->id . ', User ID: ' . $user_id);
                    }
                }
            }
        } catch (Exception $e) {
            continue;
        }
        
        // サーバー負荷軽減のため待機
        sleep(rand(5, 15));
    }
    
    // 次回実行は wp_schedule_event で自動的にスケジュールされる
}
add_action('anke_auto_commenter_cron', 'anke_auto_commenter_cron_execute');

/**
 * ランダムにstatus=2（編集者）またはstatus=6（AI会員）のユーザーを取得
 * AI会員の使用確率に基づいて選択
 */
function anke_auto_commenter_get_random_user() {
    global $wpdb;
    
    // 設定からAI会員の使用確率を取得（デフォルト70%）
    $settings = get_option('anke_auto_commenter_settings', array());
    $ai_member_probability = isset($settings['ai_member_probability']) ? intval($settings['ai_member_probability']) : 70;
    
    // 確率でAI会員か編集者かを決定
    $use_ai_member = rand(1, 100) <= $ai_member_probability;
    $status = $use_ai_member ? 6 : 2;
    
    $user = $wpdb->get_row($wpdb->prepare("
        SELECT id
        FROM {$wpdb->prefix}anke_users
        WHERE status = %d
        ORDER BY RAND()
        LIMIT 1
    ", $status));
    
    return $user ? $user->id : 0;
}

/**
 * AJAX: 開始/停止トグル
 */
function anke_auto_commenter_toggle() {
    check_ajax_referer('anke_commenter_toggle', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
        return;
    }
    
    $enabled = isset($_POST['enabled']) && $_POST['enabled'] === '1';
    
    // 設定を取得
    $settings = get_option('anke_auto_commenter_settings', array());
    $settings['enabled'] = $enabled;
    
    // 設定を保存
    update_option('anke_auto_commenter_settings', $settings);
    
    // 既存のスケジュールを削除（CRONマネージャーが管理するため不要）
    $timestamp = wp_next_scheduled('anke_auto_commenter_cron');
    if ($timestamp) {
        wp_unschedule_event($timestamp, 'anke_auto_commenter_cron');
    }
    
    wp_send_json_success($enabled ? '自動コメント投稿を開始しました（CRONマネージャーから実行されます）' : '自動コメント投稿を停止しました');
}
add_action('wp_ajax_anke_commenter_toggle', 'anke_auto_commenter_toggle');

/**
 * AJAX: テストコメント生成
 */
function anke_auto_commenter_test_comment() {
    check_ajax_referer('anke_commenter_test', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
        return;
    }
    
    $user_id = intval($_POST['user_id'] ?? 0);
    $post_id = intval($_POST['post_id'] ?? 0);
    
    if (!$user_id || !$post_id) {
        wp_send_json_error('ユーザーIDまたは記事IDが指定されていません');
        return;
    }
    
    set_time_limit(120);
    
    try {
        global $wpdb;
        require_once ANKE_AUTO_COMMENTER_PLUGIN_DIR . 'includes/class-commenter.php';
        $commenter = new Anke_Auto_Commenter($user_id, $post_id);
        
        // 実際に投票とコメントを投稿
        $result = $commenter->execute();
        
        if ($result) {
            $message = 'コメントを投稿しました';
            
            // いいね機能のテスト
            $settings = get_option('anke_auto_commenter_settings', array());
            $like_probability = isset($settings['like_probability']) ? intval($settings['like_probability']) : 40;
            
            if (rand(1, 100) <= $like_probability) {
                // いいね数が少ないコメントを優先的に選択（自分のコメント以外）
                $target_comment = $wpdb->get_row($wpdb->prepare("
                    SELECT c.id
                    FROM {$wpdb->prefix}anke_comments c
                    LEFT JOIN (
                        SELECT target_id, COUNT(*) as like_count
                        FROM {$wpdb->prefix}anke_likes
                        WHERE like_type = 'comment'
                        GROUP BY target_id
                    ) l ON l.target_id = c.id
                    WHERE c.post_id = %d
                    AND c.user_id != %d
                    AND c.status = 'approved'
                    ORDER BY COALESCE(l.like_count, 0) ASC, RAND()
                    LIMIT 1
                ", $post_id, $user_id));
                
                if ($target_comment && class_exists('Anke_Like')) {
                    Anke_Like::add($user_id, 'comment', $target_comment->id, $post_id);
                    $message .= '（いいねも実行しました）';
                }
            }
            
            wp_send_json_success(array(
                'message' => $message
            ));
        } else {
            wp_send_json_error('コメントの投稿に失敗しました');
        }
    } catch (Exception $e) {
        wp_send_json_error('エラーが発生しました: ' . $e->getMessage());
    }
}
add_action('wp_ajax_anke_commenter_test_comment', 'anke_auto_commenter_test_comment');

/**
 * AJAX: テスト返信コメント生成
 */
function anke_auto_commenter_test_reply() {
    check_ajax_referer('anke_commenter_test', 'nonce');
    
    if (!current_user_can('manage_options')) {
        wp_send_json_error('権限がありません');
        return;
    }
    
    $user_id = intval($_POST['user_id'] ?? 0);
    $post_id = intval($_POST['post_id'] ?? 0);
    
    if (!$user_id || !$post_id) {
        wp_send_json_error('ユーザーIDまたは記事IDが指定されていません');
        return;
    }
    
    set_time_limit(120);
    
    try {
        global $wpdb;
        
        // 記事のコメント数を確認
        $total_comments = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*)
            FROM {$wpdb->prefix}anke_comments
            WHERE post_id = %d
        ", $post_id));
        
        $approved_parent_comments = $wpdb->get_var($wpdb->prepare("
            SELECT COUNT(*)
            FROM {$wpdb->prefix}anke_comments
            WHERE post_id = %d
            AND parent_id = 0
            AND status = 'approved'
        ", $post_id));
        
        // 記事のコメントをランダムに1件取得（parent_id = 0のみ）
        $parent_comment = $wpdb->get_row($wpdb->prepare("
            SELECT id, user_id, content
            FROM {$wpdb->prefix}anke_comments
            WHERE post_id = %d
            AND parent_id = 0
            AND status = 'approved'
            ORDER BY RAND()
            LIMIT 1
        ", $post_id));
        
        if (!$parent_comment) {
            $error_msg = "返信対象のコメントが見つかりません。";
            $error_msg .= "（記事ID: {$post_id}、全コメント数: {$total_comments}件、承認済み親コメント: {$approved_parent_comments}件）";
            wp_send_json_error($error_msg);
            return;
        }
        
        require_once ANKE_AUTO_COMMENTER_PLUGIN_DIR . 'includes/class-commenter.php';
        $commenter = new Anke_Auto_Commenter($user_id, $post_id);
        
        // 返信コメントを生成して投稿
        $result = $commenter->execute_reply($parent_comment);
        
        if ($result) {
            $message = '返信コメントを投稿しました';
            
            // いいね機能のテスト
            $settings = get_option('anke_auto_commenter_settings', array());
            $like_probability = isset($settings['like_probability']) ? intval($settings['like_probability']) : 40;
            
            if (rand(1, 100) <= $like_probability) {
                // いいね数が少ないコメントを優先的に選択（自分のコメント以外）
                $target_comment = $wpdb->get_row($wpdb->prepare("
                    SELECT c.id
                    FROM {$wpdb->prefix}anke_comments c
                    LEFT JOIN (
                        SELECT target_id, COUNT(*) as like_count
                        FROM {$wpdb->prefix}anke_likes
                        WHERE like_type = 'comment'
                        GROUP BY target_id
                    ) l ON l.target_id = c.id
                    WHERE c.post_id = %d
                    AND c.user_id != %d
                    AND c.status = 'approved'
                    ORDER BY COALESCE(l.like_count, 0) ASC, RAND()
                    LIMIT 1
                ", $post_id, $user_id));
                
                if ($target_comment && class_exists('Anke_Like')) {
                    Anke_Like::add($user_id, 'comment', $target_comment->id, $post_id);
                    $message .= '（いいねも実行しました）';
                }
            }
            
            wp_send_json_success(array(
                'message' => $message
            ));
        } else {
            wp_send_json_error('返信コメントの投稿に失敗しました');
        }
    } catch (Exception $e) {
        wp_send_json_error('エラーが発生しました: ' . $e->getMessage());
    }
}
add_action('wp_ajax_anke_commenter_test_reply', 'anke_auto_commenter_test_reply');

/**
 * 次回実行時刻を取得（CRONマネージャー用）
 */
function anke_auto_commenter_get_next_run_time() {
    global $wpdb;
    
    $settings = get_option('anke_auto_commenter_settings', array());
    $interval = isset($settings['interval']) ? intval($settings['interval']) : 120;
    $variance = isset($settings['interval_variance']) ? intval($settings['interval_variance']) : 30;
    
    // 最後の自動投稿を取得
    $last_auto_comment = $wpdb->get_var("
        SELECT created_at 
        FROM {$wpdb->prefix}anke_comments 
        WHERE is_auto_generated = 1 
        ORDER BY created_at DESC 
        LIMIT 1
    ");
    
    if (!$last_auto_comment) {
        return 0; // 未実行
    }
    
    // WordPressのタイムゾーンで計算
    $timezone = wp_timezone();
    $last_time = new DateTime($last_auto_comment, $timezone);
    
    // ゆらぎを考慮した間隔を計算
    $max_interval_seconds = ($interval + $variance) * 60;
    $min_interval_seconds = ($interval - $variance) * 60;
    
    // 次回実行時刻を計算（最大間隔を使用）
    $next_run_time = clone $last_time;
    $next_run_time->modify('+' . $max_interval_seconds . ' seconds');
    
    // 次回実行時刻が過去の場合は、現在時刻から最小間隔後に設定
    $now = new DateTime('now', $timezone);
    if ($next_run_time < $now) {
        $next_run_time = clone $now;
        $next_run_time->modify('+' . $min_interval_seconds . ' seconds');
    }
    
    return $next_run_time->getTimestamp();
}
