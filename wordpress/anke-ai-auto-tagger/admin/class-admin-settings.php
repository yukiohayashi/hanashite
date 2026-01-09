<?php
/**
 * Admin Settings Class
 * 管理画面の設定ページ
 */

class Anke_AI_Tagger_Admin_Settings {
    
    public function __construct() {
        add_action('admin_menu', array($this, 'add_admin_menu'));
        add_action('admin_init', array($this, 'register_settings'));
        add_action('admin_enqueue_scripts', array($this, 'enqueue_admin_scripts'));
    }
    
    /**
     * 管理メニューを追加
     */
    public function add_admin_menu() {
        // トップレベルメニューを追加
        add_menu_page(
            'アンケAI自動タグ付け',                    // ページタイトル
            'アンケAI自動タグ付け',                    // メニュータイトル
            'manage_options',                    // 権限
            'anke-ai-tagger',                    // メニュースラッグ
            array($this, 'render_settings_page'), // コールバック関数
            'dashicons-admin-generic',           // アイコン
            26                                   // 位置（コメントの下）
        );
        
        // サブメニュー: 設定（最初のサブメニューは親メニューと同じページ）
        add_submenu_page(
            'anke-ai-tagger',
            'アンケAI自動タグ付け設定',
            '設定',
            'manage_options',
            'anke-ai-tagger',
            array($this, 'render_settings_page')
        );
    }
    
    /**
     * 設定を登録
     */
    public function register_settings() {
        register_setting('anke_ai_tagger_options', 'anke_ai_tagger_options', array($this, 'sanitize_options'));
        
        // API設定セクション
        add_settings_section(
            'anke_ai_tagger_api_section',
            'API設定',
            array($this, 'render_api_section'),
            'anke-ai-tagger'
        );
        
        add_settings_field(
            'openai_api_key',
            'OpenAI APIキー',
            array($this, 'render_api_key_field'),
            'anke-ai-tagger',
            'anke_ai_tagger_api_section'
        );
        
        add_settings_field(
            'openai_model',
            'OpenAI モデル',
            array($this, 'render_model_field'),
            'anke-ai-tagger',
            'anke_ai_tagger_api_section'
        );
        
        // 動作設定セクション
        add_settings_section(
            'anke_ai_tagger_behavior_section',
            '動作設定',
            array($this, 'render_behavior_section'),
            'anke-ai-tagger'
        );
        
        add_settings_field(
            'auto_tag_on_publish',
            '公開時に自動タグ付け',
            array($this, 'render_auto_tag_field'),
            'anke-ai-tagger',
            'anke_ai_tagger_behavior_section'
        );
        
        add_settings_field(
            'confidence_threshold',
            '信頼度の閾値',
            array($this, 'render_confidence_field'),
            'anke-ai-tagger',
            'anke_ai_tagger_behavior_section'
        );
        
        add_settings_field(
            'max_keywords',
            '最大キーワード数',
            array($this, 'render_max_keywords_field'),
            'anke-ai-tagger',
            'anke_ai_tagger_behavior_section'
        );
        
        add_settings_field(
            'max_categories',
            '最大カテゴリ数',
            array($this, 'render_max_categories_field'),
            'anke-ai-tagger',
            'anke_ai_tagger_behavior_section'
        );
    }
    
    /**
     * 設定ページをレンダリング
     */
    public function render_settings_page() {
        ?>
        <div class="wrap">
            <h1>AI Auto Tagger 設定</h1>
            
            <!-- 関連プラグインへのリンク -->
            <div class="notice notice-info" style="padding: 15px; margin: 20px 0;">
                <h3 style="margin-top: 0;">📋 関連プラグイン管理画面</h3>
                <p>AI Auto Taggerは以下のプラグインと連携して動作します：</p>
                <ul style="list-style: disc; margin-left: 20px;">
                    <li>
                        <strong>Anke Categories</strong> - カテゴリ管理（Anke Keyword Search Systemに統合済み）
                        <?php 
                        // Anke Keyword Search Systemに統合されているため、そちらをチェック
                        $anke_categories_active = class_exists('Anke_Keyword_Search_Admin_Menu') || is_plugin_active('anke-keyword-search-system/anke-keyword-search-system.php');
                        if ($anke_categories_active): ?>
                            <a href="<?php echo admin_url('admin.php?page=anke-categories-admin'); ?>" class="button button-small" style="margin-left: 10px;">管理画面を開く</a>
                            <span style="color: #46b450; margin-left: 10px;">✅ 利用可能</span>
                        <?php else: ?>
                            <span style="color: #dc3232; margin-left: 10px;">❌ 未インストール</span>
                        <?php endif; ?>
                    </li>
                    <li>
                        <strong>Anke Keyword Search System</strong> - キーワード管理
                        <?php 
                        $anke_keywords_active = class_exists('Anke_Keyword_Search_Admin_Menu') || is_plugin_active('anke-keyword-search-system/anke-keyword-search-system.php');
                        if ($anke_keywords_active): ?>
                            <a href="<?php echo admin_url('admin.php?page=anke-keyword-search-system'); ?>" class="button button-small" style="margin-left: 10px;">管理画面を開く</a>
                            <span style="color: #46b450; margin-left: 10px;">✅ インストール済み</span>
                        <?php else: ?>
                            <span style="color: #dc3232; margin-left: 10px;">❌ 未インストール</span>
                        <?php endif; ?>
                    </li>
                </ul>
                <?php if (!$anke_categories_active || !$anke_keywords_active): ?>
                    <p style="color: #dc3232; margin-top: 10px;">
                        <strong>⚠️ 警告:</strong> 必須プラグインがインストールされていません。AI Auto Taggerを使用するには、上記のプラグインをインストール・有効化してください。
                    </p>
                <?php endif; ?>
            </div>
            
            <form method="post" action="options.php">
                <?php
                settings_fields('anke_ai_tagger_options');
                do_settings_sections('anke-ai-tagger');
                submit_button();
                ?>
            </form>
            
            <hr>
            
            <h2>一括タグ付け</h2>
            <p>既存の投稿に対して一括でタグ付けを実行します。</p>
            <button type="button" class="button button-primary" id="anke-bulk-tag-btn">一括タグ付けを開始</button>
            <div id="anke-bulk-tag-progress" style="display:none; margin-top:20px;">
                <p>処理中: <span id="anke-bulk-tag-current">0</span> / <span id="anke-bulk-tag-total">0</span></p>
                <progress id="anke-bulk-tag-bar" value="0" max="100" style="width:100%;"></progress>
            </div>
            <div id="anke-bulk-tag-result" style="margin-top:20px;"></div>
        </div>
        <?php
    }
    
    /**
     * API設定セクション
     */
    public function render_api_section() {
        ?>
        <p>OpenAI APIの設定を行います。APIキーは<a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a>で取得できます。</p>
        
        <div class="notice notice-warning inline" style="margin: 15px 0; padding: 10px;">
            <h4 style="margin-top: 0;">💰 料金プランについて</h4>
            <p><strong>OpenAI APIは従量課金制です（無料プランはありません）</strong></p>
            <ul style="list-style: disc; margin-left: 20px;">
                <li><strong>GPT-4o Mini</strong>（推奨）: 入力 $0.15/1M tokens、出力 $0.60/1M tokens</li>
                <li><strong>GPT-4o</strong>（高性能）: 入力 $2.50/1M tokens、出力 $10/1M tokens</li>
                <li><strong>GPT-3.5 Turbo</strong>（最低コスト）: 入力 $0.50/1M tokens、出力 $1.50/1M tokens</li>
            </ul>
            <p><strong>コスト試算（GPT-4o Mini使用時）</strong>:</p>
            <ul style="list-style: disc; margin-left: 20px;">
                <li>1投稿あたり: 約$0.0001（約0.015円）</li>
                <li>月間100投稿: 約$0.01（約1.5円）</li>
                <li>月間1,000投稿: 約$0.10（約15円）</li>
                <li>月間10,000投稿: 約$1（約150円）</li>
            </ul>
            <p>
                <a href="https://platform.openai.com/usage" target="_blank" class="button button-small">使用量を確認</a>
                <a href="https://openai.com/api/pricing/" target="_blank" class="button button-small">料金詳細</a>
            </p>
        </div>
        <?php
    }
    
    /**
     * 動作設定セクション
     */
    public function render_behavior_section() {
        echo '<p>自動タグ付けの動作を設定します。</p>';
    }
    
    /**
     * APIキーフィールド
     */
    public function render_api_key_field() {
        $options = get_option('anke_ai_tagger_options');
        $value = !empty($options['openai_api_key']) ? $options['openai_api_key'] : '';
        ?>
        <input type="password" name="anke_ai_tagger_options[openai_api_key]" value="<?php echo esc_attr($value); ?>" class="regular-text" />
        <p class="description">OpenAI APIキーを入力してください（sk-で始まる文字列）</p>
        <?php
    }
    
    /**
     * モデルフィールド
     */
    public function render_model_field() {
        $options = get_option('anke_ai_tagger_options');
        $value = !empty($options['openai_model']) ? $options['openai_model'] : 'gpt-4o-mini';
        ?>
        <select name="anke_ai_tagger_options[openai_model]">
            <option value="gpt-4o-mini" <?php selected($value, 'gpt-4o-mini'); ?>>GPT-4o Mini（推奨・低コスト）</option>
            <option value="gpt-4o" <?php selected($value, 'gpt-4o'); ?>>GPT-4o（高性能）</option>
            <option value="gpt-4-turbo" <?php selected($value, 'gpt-4-turbo'); ?>>GPT-4 Turbo</option>
            <option value="gpt-3.5-turbo" <?php selected($value, 'gpt-3.5-turbo'); ?>>GPT-3.5 Turbo（最低コスト）</option>
        </select>
        <p class="description">
            <strong>推奨:</strong> GPT-4o Mini（高精度・低コスト）<br>
            <strong>コスト:</strong> GPT-4o Mini: $0.15/1M入力、GPT-4o: $2.50/1M入力
        </p>
        <?php
    }
    
    /**
     * 自動タグ付けフィールド
     */
    public function render_auto_tag_field() {
        $options = get_option('anke_ai_tagger_options');
        $checked = !empty($options['auto_tag_on_publish']);
        ?>
        <label>
            <input type="checkbox" name="anke_ai_tagger_options[auto_tag_on_publish]" value="1" <?php checked($checked); ?> />
            投稿公開時に自動的にタグ付けを実行
        </label>
        <?php
    }
    
    /**
     * 信頼度フィールド
     */
    public function render_confidence_field() {
        $options = get_option('anke_ai_tagger_options');
        $value = !empty($options['confidence_threshold']) ? $options['confidence_threshold'] : 0.7;
        ?>
        <input type="number" name="anke_ai_tagger_options[confidence_threshold]" value="<?php echo esc_attr($value); ?>" min="0" max="1" step="0.1" />
        <p class="description">AIの提案を採用する最低信頼度（0.0〜1.0）</p>
        <?php
    }
    
    /**
     * 最大キーワード数フィールド
     */
    public function render_max_keywords_field() {
        $options = get_option('anke_ai_tagger_options');
        $value = !empty($options['max_keywords']) ? $options['max_keywords'] : 5;
        ?>
        <input type="number" name="anke_ai_tagger_options[max_keywords]" value="<?php echo esc_attr($value); ?>" min="1" max="10" />
        <p class="description">1投稿あたりの最大キーワード数</p>
        <?php
    }
    
    /**
     * 最大カテゴリ数フィールド
     */
    public function render_max_categories_field() {
        ?>
        <p><strong>1つのみ</strong>（最も信頼度の高いカテゴリを自動選択）</p>
        <p class="description">
            AI自動割り当ては1つのカテゴリのみです。<br>
            複数のカテゴリを割り当てたい場合は、手動で追加してください。
        </p>
        <?php
    }
    
    /**
     * オプションのサニタイズ
     */
    public function sanitize_options($input) {
        $sanitized = array();
        
        if (isset($input['openai_api_key'])) {
            $sanitized['openai_api_key'] = sanitize_text_field($input['openai_api_key']);
        }
        
        if (isset($input['openai_model'])) {
            $sanitized['openai_model'] = sanitize_text_field($input['openai_model']);
        }
        
        $sanitized['auto_tag_on_publish'] = !empty($input['auto_tag_on_publish']);
        
        if (isset($input['confidence_threshold'])) {
            $sanitized['confidence_threshold'] = floatval($input['confidence_threshold']);
        }
        
        if (isset($input['max_keywords'])) {
            $sanitized['max_keywords'] = intval($input['max_keywords']);
        }
        
        if (isset($input['max_categories'])) {
            $sanitized['max_categories'] = intval($input['max_categories']);
        }
        
        return $sanitized;
    }
    
    /**
     * 管理画面スクリプトを読み込み
     */
    public function enqueue_admin_scripts($hook) {
        if ($hook !== 'settings_page_anke-ai-tagger') {
            return;
        }
        
        wp_enqueue_script(
            'anke-ai-tagger-admin',
            ANKE_AI_TAGGER_PLUGIN_URL . 'assets/js/admin.js',
            array('jquery'),
            ANKE_AI_TAGGER_VERSION,
            true
        );
        
        wp_localize_script('anke-ai-tagger-admin', 'ankeAiTagger', array(
            'ajaxUrl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('anke_ai_tagger_nonce')
        ));
    }
}
