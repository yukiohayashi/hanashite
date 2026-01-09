<?php
/**
 * Auto Tagger Class
 * 投稿に自動的にカテゴリとキーワードを割り当てる
 */

class Anke_AI_Auto_Tagger {
    
    private $ai_client;
    private $category_matcher;
    private $keyword_extractor;
    private $options;
    
    public function __construct() {
        $this->ai_client = new Anke_AI_Client();
        $this->category_matcher = new Anke_AI_Category_Matcher();
        $this->keyword_extractor = new Anke_AI_Keyword_Extractor();
        $this->options = get_option('anke_ai_tagger_options');
    }
    
    /**
     * 投稿にタグを付ける
     */
    public function tag_post($post_id) {
        $post = get_post($post_id);
        
        if (!$post) {
            return new WP_Error('invalid_post', '投稿が見つかりません');
        }
        
        $result = array(
            'categories' => array(),
            'keywords' => array(),
            'errors' => array()
        );
        
        // カテゴリを割り当て
        $categories_result = $this->assign_categories($post);
        if (is_wp_error($categories_result)) {
            $result['errors'][] = $categories_result->get_error_message();
        } else {
            $result['categories'] = $categories_result;
        }
        
        // キーワードを割り当て
        $keywords_result = $this->assign_keywords($post);
        if (is_wp_error($keywords_result)) {
            $result['errors'][] = $keywords_result->get_error_message();
        } else {
            $result['keywords'] = $keywords_result;
        }
        
        // wp_anke_postsテーブルにメタデータを保存
        global $wpdb;
        $wpdb->update(
            'wp_anke_posts',
            array(
                'ai_tagger_result' => serialize($result),
                'ai_tagger_date' => current_time('mysql')
            ),
            array('post_id' => $post_id),
            array('%s', '%s'),
            array('%d')
        );
        
        return $result;
    }
    
    /**
     * カテゴリを割り当て
     */
    private function assign_categories($post) {
        global $wpdb;
        
        // Anke Keyword Search System（カテゴリ統合済み）が有効か確認
        if (!class_exists('Anke_Keyword_Search_Admin_Menu')) {
            return new WP_Error('plugin_not_found', 'Anke Keyword Search Systemプラグインが見つかりません');
        }
        
        // 利用可能なカテゴリを取得
        $available_categories = $this->category_matcher->get_available_categories();
        
        if (empty($available_categories)) {
            return new WP_Error('no_categories', 'カテゴリが見つかりません');
        }
        
        // AIでカテゴリを分析
        $suggested_categories = $this->ai_client->analyze_categories(
            $post->post_title,
            $post->post_content,
            $available_categories
        );
        
        if (is_wp_error($suggested_categories)) {
            return $suggested_categories;
        }
        
        $assigned_categories = array();
        $confidence_threshold = !empty($this->options['confidence_threshold']) ? $this->options['confidence_threshold'] : 0.7;
        
        // AI自動割り当ては1つのみ（最も信頼度の高いもの）
        foreach ($suggested_categories as $category) {
            // 信頼度が閾値以上の場合のみ割り当て
            if ($category['confidence'] >= $confidence_threshold) {
                // 既存のAI割り当てカテゴリを削除
                $wpdb->delete(
                    $wpdb->prefix . 'anke_post_categories',
                    array('post_id' => $post->ID),
                    array('%d')
                );
                
                // カテゴリを投稿に割り当て（1つのみ）
                $result = $wpdb->insert(
                    $wpdb->prefix . 'anke_post_categories',
                    array(
                        'post_id' => $post->ID,
                        'category_id' => $category['id'],
                        'is_primary' => 1
                    ),
                    array('%d', '%d', '%d')
                );
                
                if ($result !== false) {
                    $assigned_categories[] = array(
                        'id' => $category['id'],
                        'name' => $category['name'],
                        'confidence' => $category['confidence']
                    );
                }
                
                // 1つのみ割り当てたら終了
                break;
            }
        }
        
        return $assigned_categories;
    }
    
    /**
     * キーワードを割り当て
     */
    private function assign_keywords($post) {
        // Anke Keyword Search Systemプラグインが有効か確認
        if (!class_exists('Anke_Keyword_Manager')) {
            return new WP_Error('plugin_not_found', 'Anke Keyword Search Systemプラグインが見つかりません');
        }
        
        // 既存のキーワードを取得
        $existing_keywords = $this->keyword_extractor->get_existing_keywords();
        
        // AIでキーワードを抽出
        $suggested_keywords = $this->ai_client->extract_keywords(
            $post->post_title,
            $post->post_content,
            $existing_keywords
        );
        
        if (is_wp_error($suggested_keywords)) {
            return $suggested_keywords;
        }
        
        $assigned_keywords = array();
        $max_keywords = !empty($this->options['max_keywords']) ? $this->options['max_keywords'] : 5;
        
        foreach ($suggested_keywords as $keyword_data) {
            if (count($assigned_keywords) >= $max_keywords) {
                break;
            }
            
            $keyword_name = $keyword_data['keyword'];
            $relevance = $keyword_data['relevance'];
            $is_new = !empty($keyword_data['is_new']);
            
            error_log("AI KEYWORD ASSIGN: Trying to assign '{$keyword_name}' (is_new: " . ($is_new ? 'true' : 'false') . ")");
            
            // 既存のキーワードを検索
            $keyword = Anke_Keyword_Manager::get_keyword_by_name($keyword_name);
            
            // キーワードが見つからない場合は新規作成（is_newに関わらず）
            if (!$keyword) {
                error_log("AI KEYWORD ASSIGN: '{$keyword_name}' not found, creating new keyword");
                $keyword_id = Anke_Keyword_Manager::create_keyword(array(
                    'keyword' => $keyword_name,
                    'keyword_type' => 'tag'
                ));
                
                if (!is_wp_error($keyword_id)) {
                    $keyword = Anke_Keyword_Manager::get_keyword($keyword_id);
                    error_log("AI KEYWORD ASSIGN: Created keyword '{$keyword_name}' with ID: {$keyword_id}");
                } else {
                    error_log("AI KEYWORD ASSIGN ERROR: Failed to create keyword '{$keyword_name}' - " . $keyword_id->get_error_message());
                }
            } else {
                error_log("AI KEYWORD ASSIGN: Found existing keyword '{$keyword_name}' with ID: {$keyword->id}");
            }
            
            // キーワードを投稿に関連付け
            if ($keyword) {
                error_log("AI KEYWORD ASSIGN: Assigning keyword '{$keyword->keyword}' (ID: {$keyword->id}) to post {$post->ID}");
                $result = Anke_Keyword_Manager::add_keyword_to_post(
                    $post->ID,
                    $keyword->id,
                    'ai_auto',
                    $relevance
                );
                
                if (!is_wp_error($result)) {
                    $assigned_keywords[] = array(
                        'id' => $keyword->id,
                        'keyword' => $keyword->keyword,
                        'relevance' => $relevance,
                        'is_new' => $is_new
                    );
                    error_log("AI KEYWORD ASSIGN: Successfully assigned keyword '{$keyword->keyword}' to post {$post->ID}");
                } else {
                    error_log("AI KEYWORD ASSIGN ERROR: Failed to assign keyword '{$keyword->keyword}' to post {$post->ID} - " . $result->get_error_message());
                }
            } else {
                error_log("AI KEYWORD ASSIGN ERROR: Keyword object is null for '{$keyword_name}'");
            }
        }
        
        return $assigned_keywords;
    }
}
