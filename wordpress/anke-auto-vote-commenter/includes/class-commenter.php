<?php
/**
 * コメント生成・投稿クラス
 * 
 * OpenAI APIを使用してコメントを生成し、投稿します
 */

if (!defined('ABSPATH')) {
    exit;
}

class Anke_Auto_Commenter {
    
    private $user_id;
    private $post_id;
    private $profile_analyzer;
    private $voter;
    private $openai_api_key;
    private $openai_model;
    
    /**
     * コンストラクタ
     * 
     * @param int $user_id ユーザーID（wp_anke_users.id）
     * @param int $post_id 記事ID
     */
    public function __construct($user_id, $post_id) {
        $this->user_id = $user_id;
        $this->post_id = $post_id;
        
        // プロフィール分析クラスを初期化
        $this->profile_analyzer = new Anke_Profile_Analyzer($user_id);
        
        // 投票クラスを初期化
        $this->voter = new Anke_Auto_Voter($user_id, $post_id);
        $this->voter->set_profile($this->profile_analyzer->get_profile());
        
        // OpenAI API設定を取得（アンケ自動作成プラグインの設定を共有）
        $creator_settings = get_option('anke_auto_creator_settings', array());
        $this->openai_api_key = $creator_settings['openai_api_key'] ?? '';
        $this->openai_model = $creator_settings['openai_model'] ?? 'gpt-4o-mini';
        
        if (empty($this->openai_api_key)) {
            throw new Exception('OpenAI API Keyが設定されていません。アンケ自動作成プラグインで設定してください。');
        }
    }
    
    /**
     * 投票とコメントを実行
     * 
     * @return bool 成功したかどうか
     */
    public function execute() {
        // 1. 投票を実行
        $vote_result = $this->voter->execute();
        
        if (!$vote_result['success']) {
            throw new Exception('投票に失敗しました');
        }
        
        // 2. コメントを生成
        $comment_text = $this->generate_comment($vote_result);
        
        if (empty($comment_text)) {
            throw new Exception('コメントの生成に失敗しました');
        }
        
        // 3. コメントを投稿
        $comment_id = $this->post_comment($comment_text);
        
        if (!$comment_id) {
            throw new Exception('コメントの投稿に失敗しました');
        }
        
        return true;
    }
    
    /**
     * コメントのみを生成（テスト用）
     * 
     * @return string 生成されたコメント
     */
    public function generate_comment_only() {
        // ダミーの投票結果を作成
        $vote_items = get_post_meta($this->post_id, 'vote_items', true);
        
        if (empty($vote_items) || !is_array($vote_items)) {
            throw new Exception('投票選択肢が見つかりません');
        }
        
        $random_index = array_rand($vote_items);
        $vote_result = array(
            'success' => true,
            'vote_value' => $random_index,
            'vote_label' => $vote_items[$random_index]
        );
        
        return $this->generate_comment($vote_result);
    }
    
    /**
     * コメントを生成
     * 
     * @param array $vote_result 投票結果
     * @return string 生成されたコメント
     */
    private function generate_comment($vote_result) {
        global $wpdb;
        
        $settings = get_option('anke_auto_commenter_settings', array());
        $min_length = $settings['comment_min_length'] ?? 50;
        $max_length = $settings['comment_max_length'] ?? 150;
        
        // 記事情報を取得
        $post = get_post($this->post_id);
        $post_title = $post->post_title;
        $post_content = wp_strip_all_tags($post->post_content);
        $post_content = mb_substr($post_content, 0, 500); // 最初の500文字
        
        // 全ての投票選択肢を取得
        $all_choices = $wpdb->get_results($wpdb->prepare("
            SELECT id, choice
            FROM {$wpdb->prefix}anke_vote_choices
            WHERE post_id = %d
            ORDER BY id
        ", $this->post_id));
        
        $choices_list = array();
        foreach ($all_choices as $choice) {
            $choices_list[] = $choice->choice;
        }
        
        // プロフィール情報を取得
        $persona = $this->profile_analyzer->generate_persona_description();
        $tone_patterns = $this->profile_analyzer->get_tone_patterns();
        
        // プロンプトを構築
        $prompt = $this->build_prompt(
            $persona,
            $post_title,
            $post_content,
            $vote_result['vote_label'],
            $choices_list,
            $min_length,
            $max_length,
            $tone_patterns
        );
        
        // OpenAI APIを呼び出し
        $comment = $this->call_openai_api($prompt);
        
        return $comment;
    }
    
    /**
     * プロンプトを構築
     * 
     * @param string $persona ペルソナ情報
     * @param string $post_title 記事タイトル
     * @param string $post_content 記事内容
     * @param string $vote_label 投票選択肢
     * @param array $all_choices 全ての選択肢
     * @param int $min_length 最小文字数
     * @param int $max_length 最大文字数
     * @param array $tone_patterns 口調パターン
     * @return string プロンプト
     */
    private function build_prompt($persona, $post_title, $post_content, $vote_label, $all_choices, $min_length, $max_length, $tone_patterns) {
        // 文字数をランダムに決定（短文を優先）
        $rand = rand(1, 100);
        if ($rand <= 50) {
            // 50%の確率で超短文（10-30文字）
            $target_length = rand(10, 30);
        } elseif ($rand <= 80) {
            // 30%の確率で短文（30-50文字）
            $target_length = rand(30, 50);
        } else {
            // 20%の確率で通常（50-80文字）
            $target_length = rand($min_length, min($max_length, 80));
        }
        
        // 文字数に応じたスタイル指示
        $length_instruction = '';
        if ($target_length <= 20) {
            $length_instruction = '一言で（10文字前後）';
        } elseif ($target_length <= 40) {
            $length_instruction = '短く（20-40文字）';
        } elseif ($target_length <= 60) {
            $length_instruction = '簡潔に（40-60文字）';
        } else {
            $length_instruction = '適度に（60-80文字）';
        }
        
        // 設定を取得
        $settings = get_option('anke_auto_commenter_settings', array());
        $profile_weight = $settings['profile_weight'] ?? 'high';
        $content_weight = $settings['content_weight'] ?? 'high';
        
        // プロフィール考慮度による指示
        $profile_instruction = '';
        switch ($profile_weight) {
            case 'high':
                $profile_instruction = 'あなたの個性（年齢、性別、職業、家族構成など）を強く反映させ、具体的な状況を含めてください。';
                break;
            case 'medium':
                $profile_instruction = 'あなたの個性（年齢、性別、職業、家族構成など）を適度に反映させてください。';
                break;
            case 'low':
                $profile_instruction = '一般的な視点でコメントしてください。';
                break;
        }
        
        // 記事内容考慮度による指示
        $content_instruction = '';
        switch ($content_weight) {
            case 'high':
                $content_instruction = '記事のタイトル、本文、投票選択肢の内容を詳しく言及し、具体的な理由を述べてください。';
                break;
            case 'medium':
                $content_instruction = '記事の内容と投票理由を適度に説明してください。';
                break;
            case 'low':
                $content_instruction = '投票した選択肢の理由を簡潔に述べてください。';
                break;
        }
        
        // プロンプトを設定から取得（管理画面で設定）
        $comment_prompt = $settings['comment_prompt'] ?? '';
        
        // 全選択肢をリスト化
        $choices_text = implode('、', $all_choices);
        
        // 設定から確率を取得してランダムで他の選択肢にも言及するか決定
        $mention_probability = isset($settings['mention_other_choices_probability']) ? intval($settings['mention_other_choices_probability']) : 30;
        $mention_others = (rand(1, 100) <= $mention_probability);
        $diversity_instruction = $mention_others ? '※他の選択肢にも触れて多様な視点を示すこと（必須ではない）' : '';
        
        $prompt = <<<EOT
【ペルソナ】
{$persona}

【記事】{$post_title}
【全選択肢】{$choices_text}
【あなたの投票】{$vote_label}

{$length_instruction}で{$target_length}文字前後のコメントを書け。
{$diversity_instruction}

【必須ルール】
{$comment_prompt}

【口調の指示】
語尾: {$tone_patterns['ending'][0]}、{$tone_patterns['ending'][1]}
同意: {$tone_patterns['agreement'][0]}、{$tone_patterns['agreement'][1]}

【コメントの方向性】
・ネット掲示板の本音トーク風
・断定的で歯切れの良い表現
・ツッコミや皮肉も織り交ぜる
・「まあ」「正直」「普通に」「逆に」などの口語表現を使う
・個人的な感覚や直感を率直に述べる
・建前より本音、綺麗事より現実的な視点

【絶対禁止】
・絵文字、顔文字
・説明的な文章
・「確かに」「たしかに」で始まる文
・「〜と感じます」「〜と考えられます」などの丁寧語
・「〜だと思います」の連発
・教科書的な正論
・誰もが言いそうな無難なコメント

コメント:
EOT;
        
        return $prompt;
    }
    
    /**
     * OpenAI APIを呼び出し
     * 
     * @param string $prompt プロンプト
     * @return string 生成されたコメント
     */
    private function call_openai_api($prompt) {
        $api_url = 'https://api.openai.com/v1/chat/completions';
        
        $data = array(
            'model' => $this->openai_model,
            'messages' => array(
                array(
                    'role' => 'system',
                    'content' => 'あなたは日本のネット掲示板の常連ユーザーです。建前を嫌い、本音で語ります。短く歯切れよく、時に皮肉やツッコミを入れながらコメントします。無難な意見や教科書的な正論は絶対に言いません。個性的で記憶に残るコメントを心がけます。'
                ),
                array(
                    'role' => 'user',
                    'content' => $prompt
                )
            ),
            'temperature' => 0.9,
            'max_tokens' => 200,
        );
        
        $response = wp_remote_post($api_url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $this->openai_api_key,
            ),
            'body' => json_encode($data),
            'timeout' => 60,
        ));
        
        if (is_wp_error($response)) {
            throw new Exception('OpenAI API呼び出しエラー: ' . $response->get_error_message());
        }
        
        $body = json_decode(wp_remote_retrieve_body($response), true);
        
        if (isset($body['error'])) {
            throw new Exception('OpenAI APIエラー: ' . $body['error']['message']);
        }
        
        if (!isset($body['choices'][0]['message']['content'])) {
            throw new Exception('OpenAI APIから有効なレスポンスが返されませんでした');
        }
        
        $comment = trim($body['choices'][0]['message']['content']);
        
        // 余計な引用符を削除
        $comment = trim($comment, '"\'');
        
        return $comment;
    }
    
    /**
     * コメントを投稿
     * 
     * @param string $comment_text コメント内容
     * @return int|false コメントID
     */
    private function post_comment($comment_text) {
        global $wpdb;
        
        // ユーザー情報を取得
        $user = $wpdb->get_row($wpdb->prepare("
            SELECT user_email, user_nicename
            FROM {$wpdb->prefix}anke_users
            WHERE id = %d
        ", $this->user_id));
        
        if (!$user) {
            throw new Exception('ユーザー情報が見つかりません');
        }
        
        // User-Agentを生成
        $user_agents = array(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:132.0) Gecko/20100101 Firefox/132.0',
        );
        $user_agent = $user_agents[array_rand($user_agents)];
        
        // コメント挿入（タイムスタンプにランダムな遅延を加算）
        $random_delay = rand(0, 30); // 0〜30秒のランダムな遅延
        $timestamp = date('Y-m-d H:i:s', strtotime(current_time('mysql')) + $random_delay);
        
        $result = $wpdb->insert(
            $wpdb->prefix . 'anke_comments',
            array(
                'post_id' => $this->post_id,
                'user_id' => $this->user_id,
                'parent_id' => 0,
                'content' => $comment_text,
                'status' => 'approved',
                'ip_address' => $this->get_random_ip(),
                'user_agent' => $user_agent,
                'points_awarded' => 0,
                'is_auto_generated' => 1,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ),
            array('%d', '%d', '%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s')
        );
        
        if ($result === false) {
            throw new Exception('コメントの挿入に失敗しました');
        }
        
        $comment_id = $wpdb->insert_id;
        
        return $comment_id;
    }
    
    /**
     * ランダムIPアドレスを生成
     */
    private function get_random_ip() {
        return rand(1, 255) . '.' . rand(0, 255) . '.' . rand(0, 255) . '.' . rand(1, 255);
    }
    
    /**
     * 返信コメントを生成して投稿
     * 
     * @param object $parent_comment 親コメント（id, user_id, content）
     * @return bool 成功したかどうか
     */
    public function execute_reply($parent_comment) {
        global $wpdb;
        
        // 0. まだ投票していない場合は投票を実行
        $existing_vote = $wpdb->get_var($wpdb->prepare("
            SELECT id
            FROM {$wpdb->prefix}anke_vote_history
            WHERE post_id = %d
            AND user_id = %d
        ", $this->post_id, $this->user_id));
        
        if (!$existing_vote) {
            // 投票を実行
            $vote_result = $this->voter->execute();
            
            if (!$vote_result['success']) {
                throw new Exception('返信時の投票に失敗しました');
            }
        }
        
        // 1. 親コメントにいいねをつける
        if (class_exists('Anke_Like')) {
            Anke_Like::add($this->user_id, 'comment', $parent_comment->id, $this->post_id);
        }
        
        // 2. 返信コメントを生成
        $reply_text = $this->generate_reply_comment($parent_comment);
        
        if (empty($reply_text)) {
            throw new Exception('返信コメントの生成に失敗しました');
        }
        
        // 3. 返信コメントを投稿
        $comment_id = $this->post_reply_comment($reply_text, $parent_comment->id);
        
        if (!$comment_id) {
            throw new Exception('返信コメントの投稿に失敗しました');
        }
        
        return true;
    }
    
    /**
     * 返信コメントを生成
     * 
     * @param object $parent_comment 親コメント
     * @return string 生成された返信コメント
     */
    private function generate_reply_comment($parent_comment) {
        global $wpdb;
        
        // 記事情報を取得
        $post = get_post($this->post_id);
        if (!$post) {
            throw new Exception('記事が見つかりません');
        }
        
        // ユーザープロフィールを取得
        $persona = $this->profile_analyzer->generate_persona_description();
        
        // 設定を取得
        $settings = get_option('anke_auto_commenter_settings', array());
        $comment_min_length = $settings['comment_min_length'] ?? 50;
        $comment_max_length = $settings['comment_max_length'] ?? 150;
        
        // 親コメントの長さを取得
        $parent_length = mb_strlen($parent_comment->content);
        
        // 返信コメントの長さを親コメントの長さに応じて調整
        if ($parent_length <= 20) {
            // 短いコメント（20文字以下）には短く返信
            $target_length = rand(15, 40);
        } elseif ($parent_length <= 50) {
            // 中程度のコメント（21〜50文字）には適度な長さで返信
            $target_length = rand(30, 70);
        } else {
            // 長いコメント（51文字以上）には通常の長さで返信
            $target_length = rand(intval($comment_min_length * 0.7), intval($comment_max_length * 0.8));
        }
        
        // 返信プロンプトを設定から取得（管理画面で設定）
        $reply_prompt = $settings['reply_prompt'] ?? '';
        
        $prompt = <<<EOT
あなたは以下のプロフィールを持つユーザーです：

{$persona}

以下の記事「{$post->post_title}」に投稿されたコメントに対して返信します：

【元のコメント（{$parent_length}文字）】
{$parent_comment->content}

約{$target_length}文字程度の自然な返信コメントを書いてください。

【返信コメントの条件】
{$reply_prompt}

返信コメント:
EOT;
        
        return $this->call_openai_api($prompt);
    }
    
    /**
     * 返信コメントを投稿
     * 
     * @param string $comment_text コメント本文
     * @param int $parent_id 親コメントID
     * @return int|false コメントID、失敗時はfalse
     */
    private function post_reply_comment($comment_text, $parent_id) {
        global $wpdb;
        
        // ランダムなUser-Agentを生成
        $user_agents = array(
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
        );
        $user_agent = $user_agents[array_rand($user_agents)];
        
        // wp_anke_commentsテーブルに挿入（タイムスタンプにランダムな遅延を加算）
        $random_delay = rand(0, 30); // 0〜30秒のランダムな遅延
        $timestamp = date('Y-m-d H:i:s', strtotime(current_time('mysql')) + $random_delay);
        
        $result = $wpdb->insert(
            $wpdb->prefix . 'anke_comments',
            array(
                'post_id' => $this->post_id,
                'user_id' => $this->user_id,
                'parent_id' => $parent_id,
                'content' => $comment_text,
                'status' => 'approved',
                'ip_address' => $this->get_random_ip(),
                'user_agent' => $user_agent,
                'points_awarded' => 0,
                'is_auto_generated' => 1,
                'created_at' => $timestamp,
                'updated_at' => $timestamp,
            ),
            array('%d', '%d', '%d', '%s', '%s', '%s', '%s', '%d', '%d', '%s', '%s')
        );
        
        if ($result === false) {
            throw new Exception('返信コメントの挿入に失敗しました');
        }
        
        $comment_id = $wpdb->insert_id;
        
        return $comment_id;
    }
}
