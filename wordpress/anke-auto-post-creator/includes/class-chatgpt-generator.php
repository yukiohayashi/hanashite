<?php
/**
 * ChatGPT連携クラス
 */

if (!defined('ABSPATH')) {
    exit;
}

class Anke_Auto_Creator_ChatGPT_Generator {
    
    private $api_key;
    private $model;
    
    public function __construct() {
        $settings = get_option('anke_auto_creator_settings', array());
        $this->api_key = $settings['openai_api_key'] ?? '';
        $this->model = $settings['openai_model'] ?? 'gpt-4o-mini';
    }
    
    /**
     * 記事からアンケートを生成
     */
    public function generate_anke($article) {
        if (empty($this->api_key)) {
            return array('error' => 'OpenAI API Keyが設定されていません');
        }
        
        $prompt = $this->build_prompt($article);
        
        $response = $this->call_openai_api($prompt);
        
        if (isset($response['error'])) {
            return $response;
        }
        
        return $this->parse_response($response);
    }
    
    /**
     * プロンプトを構築
     */
    private function build_prompt($article) {
        $settings = get_option('anke_auto_creator_settings', array());
        
        // UTF-8文字列をサニタイズ（不正な文字を除去）
        $article['title'] = $this->sanitize_utf8($article['title']);
        $article['content'] = $this->sanitize_utf8($article['content']);
        
        // プロンプトを取得（管理画面で設定）
        $title_prompt = $settings['title_prompt'] ?? '';
        $choices_prompt = $settings['choices_prompt'] ?? '';
        
        $prompt = "以下のニュース記事を読んで、アンケート形式の質問を作成してください。\n\n";
        $prompt .= "【記事タイトル】\n" . $article['title'] . "\n\n";
        $prompt .= "【記事本文】\n" . mb_substr($article['content'], 0, 1000) . "\n\n";
        $prompt .= "【タイトル生成の要件】\n" . $title_prompt . "\n\n";
        $prompt .= "【選択肢生成の要件】\n" . $choices_prompt . "\n\n";
        $prompt .= "【追加要件】\n";
        $prompt .= "- 適切なカテゴリを1～3個提案\n";
        $prompt .= "- 関連キーワードを最大3個抽出（固有名詞を優先、人名・地名・組織名など）\n\n";
        $prompt .= "【出力形式（JSON）】\n";
        $prompt .= "{\n";
        $prompt .= '  "question": "アンケート質問文",' . "\n";
        $prompt .= '  "choices": ["選択肢1", "選択肢2", "選択肢3"],' . "\n";
        $prompt .= '  "categories": ["カテゴリ1", "カテゴリ2"],' . "\n";
        $prompt .= '  "keywords": ["キーワード1", "キーワード2", "キーワード3"]' . "\n";
        $prompt .= "}\n\n";
        $prompt .= "※JSON形式のみで回答してください。説明文は不要です。";
        
        return $prompt;
    }
    
    /**
     * UTF-8文字列をサニタイズ（不正な文字を除去）
     */
    private function sanitize_utf8($string) {
        if (empty($string)) {
            return '';
        }
        
        // 不正なUTF-8文字を除去
        $string = mb_convert_encoding($string, 'UTF-8', 'UTF-8');
        
        // 制御文字を除去（改行・タブは保持）
        $string = preg_replace('/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/u', '', $string);
        
        return $string;
    }
    
    /**
     * OpenAI APIを呼び出し
     */
    private function call_openai_api($prompt) {
        $url = 'https://api.openai.com/v1/chat/completions';
        
        $body = array(
            'model' => $this->model,
            'messages' => array(
                array(
                    'role' => 'system',
                    'content' => 'あなたは日本のニュース記事からアンケートを作成する専門家です。'
                ),
                array(
                    'role' => 'user',
                    'content' => $prompt
                )
            ),
            'temperature' => 0.7,
            'max_tokens' => 1000
        );
        
        $json_body = json_encode($body);
        if ($json_body === false) {
            error_log('ChatGPT Generator: JSON encode failed - ' . json_last_error_msg());
            return array('error' => 'JSONエンコードに失敗しました');
        }
        
        $response = wp_remote_post($url, array(
            'timeout' => 60,
            'headers' => array(
                'Authorization' => 'Bearer ' . $this->api_key,
                'Content-Type' => 'application/json'
            ),
            'body' => $json_body
        ));
        
        if (is_wp_error($response)) {
            return array('error' => $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['error'])) {
            return array('error' => $body['error']['message']);
        }
        
        return $body;
    }
    
    /**
     * APIレスポンスをパース
     */
    private function parse_response($response) {
        if (!isset($response['choices'][0]['message']['content'])) {
            return array('error' => 'Invalid API response');
        }
        
        $content = $response['choices'][0]['message']['content'];
        
        // JSONを抽出（コードブロックで囲まれている場合に対応）
        if (preg_match('/```json\s*(.*?)\s*```/s', $content, $matches)) {
            $content = $matches[1];
        } elseif (preg_match('/```\s*(.*?)\s*```/s', $content, $matches)) {
            $content = $matches[1];
        }
        
        $data = json_decode($content, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            return array('error' => 'JSON parse error: ' . json_last_error_msg());
        }
        
        // 必須フィールドの検証
        if (empty($data['question']) || empty($data['choices'])) {
            return array('error' => 'Missing required fields');
        }
        
        // 選択肢の数を検証
        if (count($data['choices']) < 2 || count($data['choices']) > 5) {
            return array('error' => 'Invalid number of choices');
        }
        
        return array(
            'question' => $data['question'],
            'choices' => $data['choices'],
            'categories' => $data['categories'] ?? array(),
            'keywords' => $data['keywords'] ?? array()
        );
    }
}
