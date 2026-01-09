<?php
/**
 * 投票処理クラス
 * 
 * アンケート記事に対して投票を実行します
 */

if (!defined('ABSPATH')) {
    exit;
}

class Anke_Auto_Voter {
    
    private $user_id;
    private $post_id;
    private $profile;
    private $openai_api_key;
    private $openai_model;
    private $use_ai_selection;
    
    /**
     * コンストラクタ
     * 
     * @param int $user_id ユーザーID（wp_anke_users.id）
     * @param int $post_id 記事ID
     */
    public function __construct($user_id, $post_id) {
        $this->user_id = $user_id;
        $this->post_id = $post_id;
        
        // OpenAI API設定を取得
        $creator_settings = get_option('anke_auto_creator_settings', array());
        $this->openai_api_key = $creator_settings['openai_api_key'] ?? '';
        $this->openai_model = $creator_settings['openai_model'] ?? 'gpt-4o-mini';
        
        // AI選択を使用するかどうか（設定から取得、デフォルトはtrue）
        $commenter_settings = get_option('anke_auto_commenter_settings', array());
        $this->use_ai_selection = $commenter_settings['use_ai_vote_selection'] ?? true;
    }
    
    /**
     * ユーザープロフィールを設定
     * 
     * @param array $profile プロフィール情報
     */
    public function set_profile($profile) {
        $this->profile = $profile;
    }
    
    /**
     * 投票を実行
     * 
     * @return array 投票結果 ['success' => bool, 'vote_value' => int, 'vote_label' => string]
     */
    public function execute() {
        global $wpdb;
        
        // 設定から投票数とゆらぎを取得
        $commenter_settings = get_option('anke_auto_commenter_settings', array());
        $votes_per_run = isset($commenter_settings['votes_per_run']) ? intval($commenter_settings['votes_per_run']) : 1;
        $votes_variance = isset($commenter_settings['votes_variance']) ? intval($commenter_settings['votes_variance']) : 0;
        
        // ゆらぎを適用
        $actual_votes = $votes_per_run + rand(-$votes_variance, $votes_variance);
        $actual_votes = max(1, $actual_votes); // 最低1票
        
        // wp_anke_vote_choicesテーブルから投票選択肢を取得
        $vote_choices = $wpdb->get_results($wpdb->prepare("
            SELECT id, choice
            FROM {$wpdb->prefix}anke_vote_choices
            WHERE post_id = %d
            ORDER BY id
        ", $this->post_id));
        
        if (empty($vote_choices)) {
            throw new Exception('投票選択肢が見つかりません');
        }
        
        // 配列形式に変換
        $vote_items = array();
        foreach ($vote_choices as $choice) {
            $vote_items[$choice->id] = $choice->choice;
        }
        
        // プロフィールに基づいて投票を選択
        $selected_vote = $this->select_vote($vote_items);
        
        if (!$selected_vote) {
            throw new Exception('投票選択に失敗しました');
        }
        
        // 既に投票済みかチェック（wp_anke_vote_history）
        $existing_vote = $wpdb->get_var($wpdb->prepare("
            SELECT id
            FROM {$wpdb->prefix}anke_vote_history
            WHERE post_id = %d
            AND user_id = %d
        ", $this->post_id, $this->user_id));
        
        if ($existing_vote) {
            throw new Exception('既に投票済みです');
        }
        
        // 複数回投票を実行
        for ($i = 0; $i < $actual_votes; $i++) {
            // セッションIDを生成（ランダム）
            $session_id = 'auto_' . md5($this->user_id . $this->post_id . time() . $i);
            
            // タイムスタンプにランダムな遅延を加算
            $random_delay = rand(0, 30); // 0〜30秒のランダムな遅延
            $timestamp = date('Y-m-d H:i:s', strtotime(current_time('mysql')) + $random_delay);
            
            // 投票を保存（wp_anke_vote_history）
            $result = $wpdb->insert(
                $wpdb->prefix . 'anke_vote_history',
                array(
                    'post_id' => $this->post_id,
                    'datetime' => $timestamp,
                    'ip' => $this->get_random_ip(),
                    'select_id' => $selected_vote['value'],
                    'sessionid' => $session_id,
                    'user_id' => $this->user_id,
                ),
                array('%d', '%s', '%s', '%d', '%s', '%d')
            );
            
            if ($result === false) {
                throw new Exception('投票の保存に失敗しました');
            }
            
            // wp_anke_vote_choicesのcountを更新
            $wpdb->query($wpdb->prepare("
                UPDATE {$wpdb->prefix}anke_vote_choices
                SET count = count + 1
                WHERE id = %d
            ", $selected_vote['value']));
            
            // 短い待機時間を追加（同一タイムスタンプを避ける）
            if ($i < $actual_votes - 1) {
                usleep(100000); // 0.1秒待機
            }
        }
        
        // 投票カウントを更新
        $this->update_vote_count($selected_vote['value']);
        
        return array(
            'success' => true,
            'vote_value' => $selected_vote['value'],
            'vote_label' => $selected_vote['label']
        );
    }
    
    /**
     * プロフィールに基づいて投票を選択
     * 
     * @param array $vote_items 投票選択肢
     * @return array|null 選択された投票
     */
    private function select_vote($vote_items) {
        if (empty($vote_items)) {
            return null;
        }
        
        // AI選択を使用する場合
        if ($this->use_ai_selection && !empty($this->openai_api_key)) {
            try {
                $ai_selection = $this->select_vote_with_ai($vote_items);
                if ($ai_selection) {
                    return $ai_selection;
                }
            } catch (Exception $e) {
                // AI選択に失敗した場合は従来の方法にフォールバック
            }
        }
        
        // 従来の方法：プロフィール情報に基づいて傾向を決定
        $weights = array();
        
        foreach ($vote_items as $index => $item) {
            // 基本的には均等な重み
            $weight = 1.0;
            
            // プロフィールに基づいた重み調整
            if ($this->profile) {
                $weight = $this->calculate_vote_weight($item, $this->profile);
            }
            
            $weights[$index] = $weight;
        }
        
        // 重み付きランダム選択
        $selected_index = $this->weighted_random($weights);
        
        if (!isset($vote_items[$selected_index])) {
            // フォールバック: ランダム選択
            $selected_index = array_rand($vote_items);
        }
        
        return array(
            'value' => $selected_index,
            'label' => $vote_items[$selected_index]
        );
    }
    
    /**
     * AIを使用して投票選択肢を選ぶ
     * 
     * @param array $vote_items 投票選択肢
     * @return array|null 選択された投票
     */
    private function select_vote_with_ai($vote_items) {
        // 記事情報を取得
        $post = get_post($this->post_id);
        if (!$post) {
            return null;
        }
        
        $post_title = $post->post_title;
        $post_content = wp_strip_all_tags($post->post_content);
        $post_content = mb_substr($post_content, 0, 500);
        
        // プロフィール情報を取得
        $persona = '';
        if ($this->profile) {
            $age = !empty($this->profile['birth_year']) ? (date('Y') - intval($this->profile['birth_year'])) . '歳' : '年齢不明';
            $sex = !empty($this->profile['sex']) ? ($this->profile['sex'] === 'male' ? '男性' : '女性') : '性別不明';
            $job = !empty($this->profile['job']) ? $this->profile['job'] : '職業不明';
            $persona = "{$age}の{$sex}、職業: {$job}";
        }
        
        // 選択肢をリスト化
        $choices_list = '';
        foreach ($vote_items as $id => $label) {
            $choices_list .= "ID:{$id} - {$label}\n";
        }
        
        // プロンプトを構築
        $prompt = <<<EOT
あなたは以下のプロフィールを持つユーザーです：
{$persona}

以下のアンケート記事を読んで、最も適切な投票選択肢を1つ選んでください：

【記事タイトル】
{$post_title}

【記事内容】
{$post_content}

【投票選択肢】
{$choices_list}

あなたのプロフィール（年齢、性別、職業など）を考慮して、最も自然に選びそうな選択肢のIDを1つだけ数字で答えてください。
説明は不要です。IDの数字のみを出力してください。

選択したID:
EOT;
        
        // OpenAI APIを呼び出し
        $api_url = 'https://api.openai.com/v1/chat/completions';
        
        $data = array(
            'model' => $this->openai_model,
            'messages' => array(
                array(
                    'role' => 'system',
                    'content' => 'あなたは投票選択を行うアシスタントです。ユーザーのプロフィールと記事内容に基づいて、最も適切な選択肢のIDを数字のみで返してください。'
                ),
                array(
                    'role' => 'user',
                    'content' => $prompt
                )
            ),
            'temperature' => 0.7,
            'max_tokens' => 10,
        );
        
        $response = wp_remote_post($api_url, array(
            'headers' => array(
                'Content-Type' => 'application/json',
                'Authorization' => 'Bearer ' . $this->openai_api_key,
            ),
            'body' => json_encode($data),
            'timeout' => 30,
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
        
        $selected_id = intval(trim($body['choices'][0]['message']['content']));
        
        // 選択されたIDが有効か確認
        if (isset($vote_items[$selected_id])) {
            return array(
                'value' => $selected_id,
                'label' => $vote_items[$selected_id]
            );
        }
        
        // 無効なIDの場合はnullを返す（フォールバック処理へ）
        return null;
    }
    
    /**
     * プロフィールに基づいて投票の重みを計算
     * 
     * @param string $vote_label 投票選択肢のラベル
     * @param array $profile プロフィール情報
     * @return float 重み（0.5〜2.0）
     */
    private function calculate_vote_weight($vote_label, $profile) {
        $weight = 1.0;
        
        // 年齢による傾向
        if (!empty($profile['birth_year'])) {
            $age = date('Y') - intval($profile['birth_year']);
            
            // 若い世代は新しいもの・トレンドに敏感
            if ($age < 30 && (stripos($vote_label, '新しい') !== false || stripos($vote_label, 'トレンド') !== false)) {
                $weight *= 1.3;
            }
            
            // 高齢世代は伝統的・安定的なものを好む
            if ($age >= 50 && (stripos($vote_label, '伝統') !== false || stripos($vote_label, '安定') !== false)) {
                $weight *= 1.3;
            }
        }
        
        // 性別による傾向
        if (!empty($profile['sex'])) {
            // 女性は美容・健康・家族関連に関心
            if ($profile['sex'] === 'female') {
                if (stripos($vote_label, '美容') !== false || 
                    stripos($vote_label, '健康') !== false || 
                    stripos($vote_label, '家族') !== false) {
                    $weight *= 1.2;
                }
            }
            
            // 男性はテクノロジー・スポーツに関心
            if ($profile['sex'] === 'male') {
                if (stripos($vote_label, 'テクノロジー') !== false || 
                    stripos($vote_label, 'スポーツ') !== false) {
                    $weight *= 1.2;
                }
            }
        }
        
        // 結婚状況による傾向
        if (!empty($profile['marriage'])) {
            if ($profile['marriage'] === 'married' && stripos($vote_label, '家族') !== false) {
                $weight *= 1.2;
            }
        }
        
        // 職業による傾向
        if (!empty($profile['job'])) {
            if ($profile['job'] === '会社員' && stripos($vote_label, 'ビジネス') !== false) {
                $weight *= 1.2;
            }
            if ($profile['job'] === '主婦' && (stripos($vote_label, '家事') !== false || stripos($vote_label, '節約') !== false)) {
                $weight *= 1.2;
            }
        }
        
        // ランダム要素を追加（0.8〜1.2倍）
        $weight *= (0.8 + (mt_rand() / mt_getrandmax()) * 0.4);
        
        // 重みの範囲を制限
        return max(0.5, min(2.0, $weight));
    }
    
    /**
     * 重み付きランダム選択
     * 
     * @param array $weights 重み配列
     * @return int 選択されたインデックス
     */
    private function weighted_random($weights) {
        $total_weight = array_sum($weights);
        $random = mt_rand() / mt_getrandmax() * $total_weight;
        
        $cumulative = 0;
        foreach ($weights as $index => $weight) {
            $cumulative += $weight;
            if ($random <= $cumulative) {
                return $index;
            }
        }
        
        // フォールバック
        return array_key_first($weights);
    }
    
    /**
     * 投票カウントを更新
     * 
     * @param int $vote_value 投票値
     */
    private function update_vote_count($vote_value) {
        global $wpdb;
        
        // wp_anke_postsから投票数を取得
        $anke_post = $wpdb->get_row($wpdb->prepare(
            "SELECT vote_counts FROM wp_anke_posts WHERE post_id = %d",
            $this->post_id
        ));
        
        $vote_counts = array();
        if ($anke_post && !empty($anke_post->vote_counts)) {
            $vote_counts = unserialize($anke_post->vote_counts);
        }
        
        if (!is_array($vote_counts)) {
            $vote_counts = array();
        }
        
        if (!isset($vote_counts[$vote_value])) {
            $vote_counts[$vote_value] = 0;
        }
        
        $vote_counts[$vote_value]++;
        
        // wp_anke_postsテーブルを更新
        global $wpdb;
        $wpdb->update(
            'wp_anke_posts',
            array(
                'vote_counts' => serialize($vote_counts),
                'total_votes' => $wpdb->get_var($wpdb->prepare(
                    "SELECT total_votes FROM wp_anke_posts WHERE post_id = %d",
                    $this->post_id
                )) + 1
            ),
            array('post_id' => $this->post_id),
            array('%s', '%d'),
            array('%d')
        );
    }
    
    /**
     * ランダムなIPアドレスを生成
     * 
     * @return string IPアドレス
     */
    private function get_random_ip() {
        return rand(1, 255) . '.' . rand(0, 255) . '.' . rand(0, 255) . '.' . rand(1, 255);
    }
}
