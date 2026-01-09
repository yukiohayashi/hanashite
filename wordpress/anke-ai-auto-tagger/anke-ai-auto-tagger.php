<?php
/**
 * Plugin Name: Anke AI Auto Tagger
 * Plugin URI: https://anke.jp
 * Description: LLM APIを使用して投稿に自動的にAnkeカテゴリとキーワードを割り当てるプラグイン
 * Version: 1.0.0
 * Author: Anke Development Team
 * Author URI: https://anke.jp
 * License: GPL v2 or later
 * Text Domain: anke-ai-auto-tagger
 */

// 直接アクセスを防止
if (!defined('ABSPATH')) {
    exit;
}

// プラグイン定数
define('ANKE_AI_TAGGER_VERSION', '1.0.0');
define('ANKE_AI_TAGGER_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('ANKE_AI_TAGGER_PLUGIN_URL', plugin_dir_url(__FILE__));

// 必要なファイルを読み込み
require_once ANKE_AI_TAGGER_PLUGIN_DIR . 'includes/class-ai-client.php';
require_once ANKE_AI_TAGGER_PLUGIN_DIR . 'includes/class-auto-tagger.php';
require_once ANKE_AI_TAGGER_PLUGIN_DIR . 'includes/class-category-matcher.php';
require_once ANKE_AI_TAGGER_PLUGIN_DIR . 'includes/class-keyword-extractor.php';

// 管理画面のみ
if (is_admin()) {
    require_once ANKE_AI_TAGGER_PLUGIN_DIR . 'admin/class-admin-settings.php';
    require_once ANKE_AI_TAGGER_PLUGIN_DIR . 'admin/class-admin-metabox.php';
}

/**
 * プラグイン有効化時の処理
 */
function anke_ai_tagger_activate() {
    // デフォルト設定を保存
    $default_options = array(
        'api_provider' => 'openai',
        'openai_api_key' => '',
        'openai_model' => 'gpt-4-turbo-preview',
        'auto_tag_on_publish' => false,
        'confidence_threshold' => 0.7,
        'max_keywords' => 5,
        'max_categories' => 2
    );
    
    add_option('anke_ai_tagger_options', $default_options);
}
register_activation_hook(__FILE__, 'anke_ai_tagger_activate');

/**
 * プラグイン無効化時の処理
 */
function anke_ai_tagger_deactivate() {
    // 必要に応じてクリーンアップ
}
register_deactivation_hook(__FILE__, 'anke_ai_tagger_deactivate');

/**
 * プラグイン初期化
 */
function anke_ai_tagger_init() {
    // 管理画面の初期化
    if (is_admin()) {
        new Anke_AI_Tagger_Admin_Settings();
        new Anke_AI_Tagger_Admin_Metabox();
    }
    
    // 自動タグ付けの初期化
    $options = get_option('anke_ai_tagger_options');
    if (!empty($options['auto_tag_on_publish'])) {
        add_action('publish_post', 'anke_ai_tagger_auto_tag_post', 10, 2);
    }
}
add_action('plugins_loaded', 'anke_ai_tagger_init');

/**
 * 投稿公開時の自動タグ付け
 */
function anke_ai_tagger_auto_tag_post($post_id, $post) {
    // 自動保存やリビジョンをスキップ
    if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
        return;
    }
    
    // 既にタグ付けされているかチェック
    global $wpdb;
    $already_tagged = $wpdb->get_var($wpdb->prepare(
        "SELECT ai_tagged FROM wp_anke_posts WHERE post_id = %d",
        $post_id
    ));
    if ($already_tagged) {
        return;
    }
    
    // 自動タグ付けを実行
    $auto_tagger = new Anke_AI_Auto_Tagger();
    $result = $auto_tagger->tag_post($post_id);
    
    if ($result) {
        global $wpdb;
        $wpdb->update(
            'wp_anke_posts',
            array(
                'ai_tagged' => 1,
                'ai_tagged_date' => current_time('mysql')
            ),
            array('post_id' => $post_id),
            array('%d', '%s'),
            array('%d')
        );
    }
}

/**
 * アンケート作成時のAI自動タグ付け（カテゴリ選択対応）
 */
function anke_ai_auto_tag_post_with_category($post_id, $selected_category = 'auto') {
    error_log("AI Auto Tag: Starting for post {$post_id}, category: {$selected_category}");
    
    // 自動タグ付けを実行
    $auto_tagger = new Anke_AI_Auto_Tagger();
    
    // カテゴリが手動選択されている場合
    if ($selected_category !== 'auto' && is_numeric($selected_category)) {
        global $wpdb;
        
        // 既存のカテゴリを削除
        $wpdb->delete(
            $wpdb->prefix . 'anke_post_categories',
            array('post_id' => $post_id),
            array('%d')
        );
        
        // 手動選択されたカテゴリを割り当て
        $wpdb->insert(
            $wpdb->prefix . 'anke_post_categories',
            array(
                'post_id' => $post_id,
                'category_id' => intval($selected_category),
                'is_primary' => 1
            ),
            array('%d', '%d', '%d')
        );
        
        error_log("AI Auto Tag: Manually assigned category {$selected_category} to post {$post_id}");
    } else {
        // AI自動選択
        $result = $auto_tagger->tag_post($post_id);
        
        if (is_wp_error($result)) {
            error_log("AI Auto Tag ERROR: " . $result->get_error_message());
        } else {
            error_log("AI Auto Tag: Successfully tagged post {$post_id}");
        }
    }
    
    // タグ付け完了フラグを設定
    global $wpdb;
    $wpdb->update(
        'wp_anke_posts',
        array(
            'ai_tagged' => 1,
            'ai_tagged_date' => current_time('mysql')
        ),
        array('post_id' => $post_id),
        array('%d', '%s'),
        array('%d')
    );
}
add_action('anke_ai_auto_tag_post', 'anke_ai_auto_tag_post_with_category', 10, 2);

/**
 * REST APIエンドポイントの登録
 */
function anke_ai_tagger_register_rest_routes() {
    register_rest_route('anke-ai-tagger/v1', '/tag-post/(?P<id>\d+)', array(
        'methods' => 'POST',
        'callback' => 'anke_ai_tagger_rest_tag_post',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ));
    
    register_rest_route('anke-ai-tagger/v1', '/bulk-tag', array(
        'methods' => 'POST',
        'callback' => 'anke_ai_tagger_rest_bulk_tag',
        'permission_callback' => function() {
            return current_user_can('edit_posts');
        }
    ));
}
add_action('rest_api_init', 'anke_ai_tagger_register_rest_routes');

/**
 * REST API: 単一投稿のタグ付け
 */
function anke_ai_tagger_rest_tag_post($request) {
    $post_id = $request['id'];
    
    $auto_tagger = new Anke_AI_Auto_Tagger();
    $result = $auto_tagger->tag_post($post_id);
    
    if (is_wp_error($result)) {
        return new WP_Error('tagging_failed', $result->get_error_message(), array('status' => 500));
    }
    
    return rest_ensure_response(array(
        'success' => true,
        'post_id' => $post_id,
        'result' => $result
    ));
}

/**
 * REST API: 一括タグ付け
 */
function anke_ai_tagger_rest_bulk_tag($request) {
    $post_ids = $request->get_param('post_ids');
    
    if (empty($post_ids) || !is_array($post_ids)) {
        return new WP_Error('invalid_post_ids', '投稿IDが指定されていません', array('status' => 400));
    }
    
    $auto_tagger = new Anke_AI_Auto_Tagger();
    $results = array();
    
    foreach ($post_ids as $post_id) {
        $result = $auto_tagger->tag_post($post_id);
        $results[$post_id] = array(
            'success' => !is_wp_error($result),
            'data' => $result
        );
    }
    
    return rest_ensure_response(array(
        'success' => true,
        'results' => $results
    ));
}
