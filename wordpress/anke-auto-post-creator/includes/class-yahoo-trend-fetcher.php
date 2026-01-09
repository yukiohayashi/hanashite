<?php
/**
 * Yahoo!リアルタイム検索 トレンド取得クラス
 */

if (!defined('ABSPATH')) {
    exit;
}

class Anke_Yahoo_Trend_Fetcher {
    
    /**
     * コンストラクタ
     */
    public function __construct() {
        // Yahoo!リアルタイム検索は認証不要
    }
    
    /**
     * Yahoo!リアルタイム検索からトレンドを取得
     * 
     * @param string $woeid 地域ID（未使用）
     * @param int $limit 取得件数
     * @return array|WP_Error
     */
    public function fetch_trends($woeid = '23424856', $limit = 10) {
        // Yahoo!リアルタイム検索のトレンドページ
        $url = 'https://search.yahoo.co.jp/realtime';
        
        $args = array(
            'timeout' => 30,
            'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'headers' => array(
                'Accept' => 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language' => 'ja,en-US;q=0.9,en;q=0.8',
            ),
        );
        
        error_log('Yahoo! Realtime URL: ' . $url);
        
        $response = wp_remote_get($url, $args);
        
        if (is_wp_error($response)) {
            error_log('Yahoo! Error: ' . $response->get_error_message());
            return new WP_Error('fetch_error', 'Yahoo!リアルタイム検索への接続に失敗しました: ' . $response->get_error_message());
        }
        
        $status_code = wp_remote_retrieve_response_code($response);
        $body = wp_remote_retrieve_body($response);
        
        if ($status_code !== 200) {
            error_log('Yahoo! HTTP Error: ' . $status_code);
            return new WP_Error('http_error', 'Yahoo!リアルタイム検索からデータを取得できませんでした (HTTPステータス: ' . $status_code . ')');
        }
        
        // HTMLからトレンドワードを抽出
        $trends = $this->extract_trends_from_html($body, $limit);
        
        if (empty($trends)) {
            error_log('Yahoo!: No trends found');
            return new WP_Error('no_trends', 'Yahoo!リアルタイム検索からトレンドを抽出できませんでした');
        }
        
        error_log('Yahoo!: Found ' . count($trends) . ' trends');
        
        return $trends;
    }
    
    /**
     * HTMLからトレンドワードを抽出
     * 
     * @param string $html
     * @param int $limit
     * @return array
     */
    private function extract_trends_from_html($html, $limit = 10) {
        $trends = array();
        
        // 除外するキーワードのリスト
        $exclude_keywords = array(
            'もっと見る', 'すべて', '検索', 'ログイン', 'ヘルプ', 'トレンド',
            'ランキング', '更新', '前へ', '次へ', 'Yahoo', 'JAPAN',
            'リアルタイム', '詳細', '設定', 'プライバシー', '利用規約',
            '急上昇ワード', '人気ポスト', '実行ログ', 'アンケ自動作成'
        );
        
        // パターン1: <h1>トレンドワード</h1> の形式（最も単純）
        if (preg_match_all('/<h1>([^<]+)<\/h1>/i', $html, $matches)) {
            foreach ($matches[1] as $trend_name) {
                $trend_name = trim(strip_tags($trend_name));
                
                // 除外条件チェック
                if ($this->is_valid_trend($trend_name, $exclude_keywords)) {
                    $trends[] = array(
                        'name' => $trend_name,
                        'tweet_volume' => 0,
                    );
                }
            }
        }
        
        // 重複を削除
        $unique_trends = array();
        $seen = array();
        foreach ($trends as $trend) {
            $name = $trend['name'];
            if (!isset($seen[$name])) {
                $unique_trends[] = $trend;
                $seen[$name] = true;
            }
        }
        
        return array_slice($unique_trends, 0, $limit);
    }
    
    /**
     * トレンドワードが有効かチェック
     * 
     * @param string $trend_name
     * @param array $exclude_keywords
     * @return bool
     */
    private function is_valid_trend($trend_name, $exclude_keywords) {
        // 空文字チェック
        if (empty($trend_name)) {
            return false;
        }
        
        // 長さチェック
        $len = mb_strlen($trend_name);
        if ($len < 2 || $len > 50) {
            return false;
        }
        
        // 数字のみチェック
        if (preg_match('/^[0-9]+$/', $trend_name)) {
            return false;
        }
        
        // 除外キーワードチェック
        foreach ($exclude_keywords as $keyword) {
            if (stripos($trend_name, $keyword) !== false) {
                return false;
            }
        }
        
        return true;
    }
    
    
    /**
     * トレンドワードで検索（ダミーデータ）
     * 
     * @param string $keyword
     * @param int $limit
     * @return array|WP_Error
     */
    public function search_tweets($keyword, $limit = 10) {
        // ダミーの投稿データを返す
        $posts = array();
        
        $sample_texts = array(
            "「{$keyword}」に関する話題が注目を集めています。",
            "最近「{$keyword}」についての議論が活発になっています。",
            "「{$keyword}」のトレンドが急上昇中です。",
            "多くの人が「{$keyword}」について関心を持っています。",
            "「{$keyword}」に関する最新情報が話題になっています。",
        );
        
        for ($i = 0; $i < min($limit, count($sample_texts)); $i++) {
            $posts[] = array(
                'text' => $sample_texts[$i],
            );
        }
        
        return $posts;
    }
    
}
