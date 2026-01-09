<?php
/**
 * プロフィール分析クラス
 * 
 * wp_anke_usersのプロフィール情報を分析し、コメント生成に活用します
 */

if (!defined('ABSPATH')) {
    exit;
}

class Anke_Profile_Analyzer {
    
    private $user_id;
    private $profile;
    
    /**
     * コンストラクタ
     * 
     * @param int $user_id ユーザーID（wp_anke_users.id）
     */
    public function __construct($user_id) {
        $this->user_id = $user_id;
        $this->load_profile();
    }
    
    /**
     * プロフィール情報を読み込み
     */
    private function load_profile() {
        global $wpdb;
        
        $this->profile = $wpdb->get_row($wpdb->prepare("
            SELECT 
                id,
                user_email,
                user_nicename,
                user_description,
                sei,
                mei,
                kana_sei,
                kana_mei,
                birth_year,
                sex,
                marriage,
                child_count,
                job,
                prefecture,
                interest_categories,
                status
            FROM {$wpdb->prefix}anke_users
            WHERE id = %d
        ", $this->user_id), ARRAY_A);
        
        if (!$this->profile) {
            throw new Exception("ユーザーID {$this->user_id} が見つかりません");
        }
    }
    
    /**
     * プロフィール情報を取得
     * 
     * @return array プロフィール情報
     */
    public function get_profile() {
        return $this->profile;
    }
    
    /**
     * 年齢を計算
     * 
     * @return int|null 年齢
     */
    public function get_age() {
        if (empty($this->profile['birth_year'])) {
            return null;
        }
        
        return date('Y') - intval($this->profile['birth_year']);
    }
    
    /**
     * 年齢層を取得
     * 
     * @return string 年齢層（10代、20代、30代、40代、50代以上）
     */
    public function get_age_group() {
        $age = $this->get_age();
        
        if ($age === null) {
            return '年齢不明';
        }
        
        if ($age < 20) return '10代';
        if ($age < 30) return '20代';
        if ($age < 40) return '30代';
        if ($age < 50) return '40代';
        return '50代以上';
    }
    
    /**
     * 性別を取得（日本語）
     * 
     * @return string 性別
     */
    public function get_sex_label() {
        $sex = $this->profile['sex'] ?? 'not_specified';
        
        switch ($sex) {
            case 'male':
                return '男性';
            case 'female':
                return '女性';
            default:
                return '性別不明';
        }
    }
    
    /**
     * 結婚状況を取得（日本語）
     * 
     * @return string 結婚状況
     */
    public function get_marriage_label() {
        $marriage = $this->profile['marriage'] ?? 'not_specified';
        
        switch ($marriage) {
            case 'single':
                return '独身';
            case 'married':
                return '既婚';
            default:
                return '未回答';
        }
    }
    
    /**
     * 子供の有無を取得
     * 
     * @return string 子供の有無
     */
    public function get_child_status() {
        $child_count = intval($this->profile['child_count'] ?? 0);
        
        if ($child_count === 0) {
            return '子供なし';
        } elseif ($child_count === 1) {
            return '子供1人';
        } else {
            return "子供{$child_count}人";
        }
    }
    
    /**
     * ペルソナ説明文を生成
     * 
     * @return string ペルソナ説明
     */
    public function generate_persona_description() {
        $parts = array();
        
        // ニックネーム
        $nickname = $this->profile['user_nicename'] ?? '匿名';
        $parts[] = "ニックネーム: {$nickname}";
        
        // 年齢と性別
        $age_group = $this->get_age_group();
        $sex = $this->get_sex_label();
        if ($age_group !== '年齢不明' || $sex !== '性別不明') {
            $parts[] = "{$age_group}の{$sex}";
        }
        
        // 結婚状況と子供
        $marriage = $this->get_marriage_label();
        $child_status = $this->get_child_status();
        if ($marriage !== '未回答') {
            $parts[] = "{$marriage}（{$child_status}）";
        }
        
        // 職業
        if (!empty($this->profile['job'])) {
            $parts[] = "職業: {$this->profile['job']}";
        }
        
        // 居住地
        if (!empty($this->profile['prefecture'])) {
            $parts[] = "居住地: {$this->profile['prefecture']}";
        }
        
        // 自己紹介
        if (!empty($this->profile['user_description'])) {
            $parts[] = "自己紹介: {$this->profile['user_description']}";
        }
        
        // 興味カテゴリー
        if (!empty($this->profile['interest_categories'])) {
            $interests = json_decode($this->profile['interest_categories'], true);
            if (is_array($interests) && !empty($interests)) {
                $interest_labels = $this->get_interest_labels($interests);
                $parts[] = "興味: " . implode('、', $interest_labels);
            }
        }
        
        return implode("\n", $parts);
    }
    
    /**
     * 興味カテゴリーのラベルを取得
     * 
     * @param array $interests 興味カテゴリーの配列
     * @return array ラベルの配列
     */
    private function get_interest_labels($interests) {
        $labels_map = array(
            'news' => 'ニュース',
            'entertainment' => 'エンタメ',
            'sports' => 'スポーツ',
            'technology' => 'テクノロジー',
            'lifestyle' => 'ライフスタイル',
            'health' => '健康',
            'food' => '食べ物',
            'travel' => '旅行',
            'fashion' => 'ファッション',
            'beauty' => '美容',
        );
        
        $labels = array();
        foreach ($interests as $interest) {
            if (isset($labels_map[$interest])) {
                $labels[] = $labels_map[$interest];
            }
        }
        
        return $labels;
    }
    
    /**
     * コメントの口調を決定
     * 
     * @return string 口調（polite, casual, friendly）
     */
    public function get_comment_tone() {
        $age = $this->get_age();
        
        // 年齢に基づいて口調を決定
        if ($age === null) {
            return 'friendly';
        }
        
        if ($age < 25) {
            // 若い世代: カジュアル
            return 'casual';
        } elseif ($age < 45) {
            // 中年世代: フレンドリー
            return 'friendly';
        } else {
            // 高齢世代: 丁寧
            return 'polite';
        }
    }
    
    /**
     * コメントの口調に応じた語尾を取得
     * 
     * @return array 語尾のパターン
     */
    public function get_tone_patterns() {
        $tone = $this->get_comment_tone();
        
        switch ($tone) {
            case 'casual':
                return array(
                    'ending' => array('〜だね', '〜だよ', '〜かな', '〜だと思う'),
                    'question' => array('〜かな？', '〜だろうか？'),
                    'agreement' => array('そうだね', 'わかる', 'いいね'),
                );
            
            case 'polite':
                return array(
                    'ending' => array('〜ですね', '〜です', '〜でしょうか', '〜と思います'),
                    'question' => array('〜でしょうか？', '〜ですか？'),
                    'agreement' => array('そうですね', '同感です', '良いですね'),
                );
            
            case 'friendly':
            default:
                return array(
                    'ending' => array('〜ですね', '〜だと思います', '〜かもしれません'),
                    'question' => array('〜でしょうか？', '〜かな？'),
                    'agreement' => array('そうですね', 'いいですね', '同感です'),
                );
        }
    }
}
