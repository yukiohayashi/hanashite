<?php
/**
 * AI Client Class
 * OpenAI APIとの通信を管理
 */

class Anke_AI_Client {
    
    private $api_key;
    private $model;
    private $api_url = 'https://api.openai.com/v1/chat/completions';
    
    public function __construct() {
        $options = get_option('anke_ai_tagger_options');
        $this->api_key = !empty($options['openai_api_key']) ? $options['openai_api_key'] : '';
        $this->model = !empty($options['openai_model']) ? $options['openai_model'] : 'gpt-4o-mini';
    }
    
    /**
     * OpenAI APIにリクエストを送信
     */
    public function send_request($messages, $response_format = null) {
        if (empty($this->api_key)) {
            return new WP_Error('no_api_key', 'OpenAI APIキーが設定されていません');
        }
        
        $body = array(
            'model' => $this->model,
            'messages' => $messages,
            'temperature' => 0.3,
            'max_tokens' => 1000
        );
        
        // JSON modeを使用する場合
        if ($response_format === 'json') {
            $body['response_format'] = array('type' => 'json_object');
        }
        
        $response = wp_remote_post($this->api_url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $this->api_key
            ),
            'body' => json_encode($body),
            'timeout' => 30
        ));
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $response_code = wp_remote_retrieve_response_code($response);
        $response_body = wp_remote_retrieve_body($response);
        
        if ($response_code !== 200) {
            error_log('OpenAI API Error: ' . $response_body);
            return new WP_Error('api_error', 'OpenAI APIエラー: ' . $response_code);
        }
        
        $data = json_decode($response_body, true);
        
        if (empty($data['choices'][0]['message']['content'])) {
            return new WP_Error('empty_response', 'APIからの応答が空です');
        }
        
        return $data['choices'][0]['message']['content'];
    }
    
    /**
     * カテゴリを分析
     */
    public function analyze_categories($post_title, $post_content, $available_categories) {
        $categories_list = array();
        foreach ($available_categories as $cat) {
            $categories_list[] = array(
                'id' => $cat->id,
                'name' => $cat->name,
                'description' => $cat->description
            );
        }
        
        $prompt = "以下の投稿に最も適切なカテゴリを選択してください。\n\n";
        $prompt .= "投稿タイトル: {$post_title}\n\n";
        $prompt .= "投稿内容: " . mb_substr(strip_tags($post_content), 0, 1000) . "\n\n";
        $prompt .= "利用可能なカテゴリ:\n" . json_encode($categories_list, JSON_UNESCAPED_UNICODE) . "\n\n";
        $prompt .= "最も適切なカテゴリを最大2つ選び、以下のJSON形式で返してください:\n";
        $prompt .= '{"categories": [{"id": 1, "name": "カテゴリ名", "confidence": 0.95}]}';
        
        $messages = array(
            array(
                'role' => 'system',
                'content' => 'あなたは投稿を分析してカテゴリを割り当てる専門家です。JSON形式で応答してください。'
            ),
            array(
                'role' => 'user',
                'content' => $prompt
            )
        );
        
        $response = $this->send_request($messages, 'json');
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        $result = json_decode($response, true);
        
        if (empty($result['categories'])) {
            return new WP_Error('parse_error', 'カテゴリの解析に失敗しました');
        }
        
        return $result['categories'];
    }
    
    /**
     * キーワードを抽出
     */
    public function extract_keywords($post_title, $post_content, $existing_keywords = array()) {
        $keywords_list = array();
        foreach ($existing_keywords as $keyword) {
            $keywords_list[] = $keyword->keyword;
        }
        
        $prompt = "以下の投稿から重要なキーワードを抽出してください。\n\n";
        $prompt .= "【投稿タイトル】\n{$post_title}\n\n";
        $prompt .= "【投稿内容】\n" . mb_substr(strip_tags($post_content), 0, 1000) . "\n\n";
        
        $prompt .= "【最重要ルール】\n";
        $prompt .= "1. タイトルと本文に登場する人名（芸能人、政治家、スポーツ選手、著名人など）を必ず最初に抽出してください\n";
        $prompt .= "2. 人名は必ずフルネーム（姓+名）で抽出してください\n";
        $prompt .= "   ✅ 正しい例: 「田中圭」「高市早苗」「大谷翔平」「石破茂」\n";
        $prompt .= "   ❌ 間違い例: 「田中」「圭」「高市」「早苗」\n";
        $prompt .= "3. 人名が複数いる場合は、すべて抽出してください\n";
        $prompt .= "4. 人名の後に、その他の重要なキーワード（イベント名、場所、トピックなど）を抽出してください\n\n";
        
        if (!empty($keywords_list)) {
            $prompt .= "既存のキーワード（これらから選択することを優先）:\n";
            $prompt .= implode(', ', array_slice($keywords_list, 0, 50)) . "\n\n";
        }
        
        $prompt .= "最も重要なキーワードを最大5つ抽出し、以下のJSON形式で返してください:\n";
        $prompt .= '{"keywords": [{"keyword": "キーワード", "relevance": 0.95, "is_new": false}]}';
        $prompt .= "\n\nis_newは既存キーワードにない場合にtrueにしてください。";
        
        $messages = array(
            array(
                'role' => 'system',
                'content' => 'あなたは投稿からキーワードを抽出する専門家です。特に人名（芸能人、政治家、スポーツ選手など）の抽出を最優先してください。人名は必ずフルネーム（姓+名）で抽出してください。JSON形式で応答してください。'
            ),
            array(
                'role' => 'user',
                'content' => $prompt
            )
        );
        
        $response = $this->send_request($messages, 'json');
        
        if (is_wp_error($response)) {
            return $response;
        }
        
        // デバッグ: AIのレスポンスをログに出力
        error_log("AI KEYWORD RESPONSE: " . $response);
        
        $result = json_decode($response, true);
        
        if (empty($result['keywords'])) {
            error_log("AI KEYWORD ERROR: キーワードの解析に失敗 - " . print_r($result, true));
            return new WP_Error('parse_error', 'キーワードの解析に失敗しました');
        }
        
        error_log("AI EXTRACTED KEYWORDS: " . print_r($result['keywords'], true));
        
        return $result['keywords'];
    }
}
