<?php
/**
 * Admin Metabox Class
 * 投稿編集画面のメタボックス
 */

class Anke_AI_Tagger_Admin_Metabox {
    
    public function __construct() {
        add_action('add_meta_boxes', array($this, 'add_metabox'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_scripts'));
    }
    
    /**
     * メタボックスを追加
     */
    public function add_metabox() {
        add_meta_box(
            'anke-ai-tagger-metabox',
            'AI自動タグ付け',
            array($this, 'render_metabox'),
            'post',
            'side',
            'high'
        );
    }
    
    /**
     * メタボックスをレンダリング
     */
    public function render_metabox($post) {
        global $wpdb;
        
        // wp_anke_postsからAI情報を取得
        $anke_post = $wpdb->get_row($wpdb->prepare(
            "SELECT ai_tagged, ai_tagged_date, ai_tagger_result FROM wp_anke_posts WHERE post_id = %d",
            $post->ID
        ));
        
        $already_tagged = $anke_post ? $anke_post->ai_tagged : false;
        $tagged_date = $anke_post ? $anke_post->ai_tagged_date : '';
        $result = $anke_post && !empty($anke_post->ai_tagger_result) ? unserialize($anke_post->ai_tagger_result) : array();
        
        ?>
        <div class="anke-ai-tagger-metabox">
            <?php if ($already_tagged): ?>
                <p><strong>状態:</strong> タグ付け済み</p>
                <?php if ($tagged_date): ?>
                    <p><strong>日時:</strong> <?php echo esc_html($tagged_date); ?></p>
                <?php endif; ?>
                
                <?php if ($result): ?>
                    <div class="anke-ai-tagger-result">
                        <?php if (!empty($result['categories'])): ?>
                            <p><strong>カテゴリ:</strong></p>
                            <ul>
                                <?php foreach ($result['categories'] as $cat): ?>
                                    <li><?php echo esc_html($cat['name']); ?> (信頼度: <?php echo round($cat['confidence'] * 100); ?>%)</li>
                                <?php endforeach; ?>
                            </ul>
                        <?php endif; ?>
                        
                        <?php if (!empty($result['keywords'])): ?>
                            <p><strong>キーワード:</strong></p>
                            <ul>
                                <?php foreach ($result['keywords'] as $kw): ?>
                                    <li><?php echo esc_html($kw['keyword']); ?> (関連度: <?php echo round($kw['relevance'] * 100); ?>%)</li>
                                <?php endforeach; ?>
                            </ul>
                        <?php endif; ?>
                    </div>
                <?php endif; ?>
                
                <button type="button" class="button button-secondary anke-ai-retag-btn" data-post-id="<?php echo esc_attr($post->ID); ?>">
                    再タグ付け
                </button>
            <?php else: ?>
                <p>この投稿はまだAIタグ付けされていません。</p>
                <button type="button" class="button button-primary anke-ai-tag-btn" data-post-id="<?php echo esc_attr($post->ID); ?>">
                    Ankeカテゴリとタグ付けを実行
                </button>
            <?php endif; ?>
            
            <div class="anke-ai-tagger-status" style="margin-top:10px; display:none;">
                <p class="anke-ai-tagger-message"></p>
            </div>
        </div>
        
        <style>
            .anke-ai-tagger-result ul {
                margin: 5px 0;
                padding-left: 20px;
            }
            .anke-ai-tagger-result li {
                font-size: 12px;
                margin: 3px 0;
            }
            .anke-ai-tagger-status.success {
                color: #46b450;
            }
            .anke-ai-tagger-status.error {
                color: #dc3232;
            }
        </style>
        <?php
    }
    
    /**
     * スクリプトを読み込み
     */
    public function enqueue_scripts($hook) {
        if ($hook !== 'post.php' && $hook !== 'post-new.php') {
            return;
        }
        
        wp_enqueue_script(
            'anke-ai-tagger-metabox',
            ANKE_AI_TAGGER_PLUGIN_URL . 'assets/js/metabox.js',
            array('jquery'),
            ANKE_AI_TAGGER_VERSION,
            true
        );
        
        wp_localize_script('anke-ai-tagger-metabox', 'ankeAiTagger', array(
            'restUrl' => rest_url('anke-ai-tagger/v1'),
            'nonce' => wp_create_nonce('wp_rest')
        ));
    }
}
