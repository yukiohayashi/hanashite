<?php
/**
 * URLスクレイピングクラス
 */

if (!defined('ABSPATH')) {
    exit;
}

class Anke_Auto_Creator_URL_Scraper {
    
    /**
     * URLから記事を取得
     */
    public function fetch_articles($url, $limit = 10) {
        $articles = array();
        
        // RSSフィードかどうかを判定
        if (strpos($url, '.xml') !== false || strpos($url, 'rss') !== false || strpos($url, 'feed') !== false) {
            $articles = $this->fetch_rss_feed($url, $limit);
        } else {
            $articles = $this->fetch_generic_html($url, $limit);
        }
        
        return $articles;
    }
    
    /**
     * RSSフィードから記事を取得
     */
    private function fetch_rss_feed($url, $limit) {
        $articles = array();
        
        // SimplePieキャッシュを完全に無効化
        add_filter('wp_feed_cache_transient_lifetime', '__return_zero');
        
        // fetch_feed()のタイムアウトを延長（60秒）
        add_filter('http_request_timeout', function() { return 60; });
        
        // SimplePieのキャッシュディレクトリをクリア
        $cache_dir = WP_CONTENT_DIR . '/cache';
        if (is_dir($cache_dir)) {
            $files = glob($cache_dir . '/*');
            foreach ($files as $file) {
                if (is_file($file) && strpos($file, 'yahoo') !== false) {
                    @unlink($file);
                }
            }
        }
        
        $rss = fetch_feed($url);
        
        // フィルターを削除
        remove_filter('http_request_timeout', function() { return 60; });
        remove_filter('wp_feed_cache_transient_lifetime', '__return_zero');
        
        if (is_wp_error($rss)) {
            error_log('RSS fetch error for URL: ' . $url . ' - ' . $rss->get_error_message());
            return $articles;
        }
        
        $maxitems = $rss->get_item_quantity($limit);
        $rss_items = $rss->get_items(0, $maxitems);
        
        foreach ($rss_items as $item) {
            $article_url = $item->get_permalink();
            // URLからクエリパラメータを削除
            $article_url = preg_replace('/\?.*$/', '', $article_url);
            
            // 記事の詳細を取得（本文とOGP画像、OGPタイトル）
            $article_details = $this->fetch_article_content($article_url);
            
            // RSSタイトルが空の場合はOGPタイトルを使用
            $rss_title = $item->get_title();
            $title = !empty($rss_title) ? $rss_title : $article_details['title'];
            
            $article = array(
                'url' => $article_url,
                'title' => $title,
                'content' => $article_details['content'],
                'published_date' => $item->get_date('Y-m-d H:i:s'),
                'image' => $article_details['image']
            );
            
            $articles[] = $article;
        }
        
        return $articles;
    }
    
    /**
     * 汎用HTMLから記事を取得
     */
    private function fetch_generic_html($url, $limit) {
        $articles = array();
        
        $response = wp_remote_get($url, array(
            'timeout' => 30,
            'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ));
        
        if (is_wp_error($response)) {
            error_log('HTML fetch error: ' . $response->get_error_message());
            return $articles;
        }
        
        $html = wp_remote_retrieve_body($response);
        
        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        @$dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        
        $xpath = new DOMXPath($dom);
        
        // 一般的な記事リンクのパターンを検索
        $links = $xpath->query('//article//a | //h2//a | //h3//a');
        
        $count = 0;
        foreach ($links as $link) {
            if ($count >= $limit) break;
            
            $article_url = $link->getAttribute('href');
            
            // 相対URLを絶対URLに変換
            if (strpos($article_url, 'http') !== 0) {
                $parsed_url = parse_url($url);
                $base_url = $parsed_url['scheme'] . '://' . $parsed_url['host'];
                $article_url = $base_url . $article_url;
            }
            
            $article_details = $this->fetch_article_details($article_url);
            
            if (!empty($article_details)) {
                $articles[] = $article_details;
                $count++;
            }
        }
        
        return $articles;
    }
    
    /**
     * 記事の詳細を取得
     */
    private function fetch_article_details($url) {
        $response = wp_remote_get($url, array(
            'timeout' => 15,
            'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ));
        
        if (is_wp_error($response)) {
            return null;
        }
        
        $html = wp_remote_retrieve_body($response);
        
        libxml_use_internal_errors(true);
        $dom = new DOMDocument();
        @$dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
        libxml_clear_errors();
        
        $xpath = new DOMXPath($dom);
        
        // タイトルを取得
        $title_nodes = $xpath->query('//h1 | //title');
        $title = $title_nodes->length > 0 ? html_entity_decode($title_nodes->item(0)->textContent, ENT_QUOTES | ENT_HTML5, 'UTF-8') : '';
        
        // 本文を取得
        $content_nodes = $xpath->query('//article//p | //div[contains(@class, "article")]//p');
        $content = '';
        foreach ($content_nodes as $node) {
            $text = html_entity_decode(trim($node->textContent), ENT_QUOTES | ENT_HTML5, 'UTF-8');
            if (!empty($text)) {
                $content .= $text . "\n";
            }
        }
        
        // 画像を取得
        $image_nodes = $xpath->query('//article//img | //div[contains(@class, "article")]//img');
        $image = $image_nodes->length > 0 ? $image_nodes->item(0)->getAttribute('src') : '';
        
        return array(
            'url' => $url,
            'title' => trim($title),
            'content' => trim($content),
            'image' => $image,
            'published_date' => current_time('mysql')
        );
    }
    
    /**
     * 記事の本文とOGP画像を取得
     */
    public function fetch_article_content($url) {
        $response = wp_remote_get($url, array(
            'timeout' => 15,
            'user-agent' => 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        ));
        
        if (is_wp_error($response)) {
            error_log('Article fetch error: ' . $response->get_error_message());
            return array('title' => '', 'content' => '', 'image' => '');
        }
        
        $html = wp_remote_retrieve_body($response);
        
        // 文字コードを検出してUTF-8に変換
        $encoding = mb_detect_encoding($html, ['UTF-8', 'EUC-JP', 'SJIS', 'JIS', 'ASCII'], true);
        if ($encoding && $encoding !== 'UTF-8') {
            $html = mb_convert_encoding($html, 'UTF-8', $encoding);
        }
        
        // OGP画像URLを取得（ダウンロードはset_featured_imageで実施）
        $image = '';
        if (preg_match('/<meta[^>]+property=["\']og:image["\'][^>]+content=["\']([^"\']+)["\']/', $html, $matches)) {
            $image = $matches[1];
        } elseif (preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:image["\']/', $html, $matches)) {
            $image = $matches[1];
        }
        
        if (!empty($image)) {
            error_log('URL Scraper: Found OG image URL: ' . $image);
        } else {
            error_log('URL Scraper: No OG image found for URL: ' . $url);
        }
        
        // OGP titleを取得
        $title = '';
        if (preg_match('/<meta[^>]+property=["\']og:title["\'][^>]+content=["\']([^"\']+)["\']/', $html, $matches)) {
            $title = html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        } elseif (preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:title["\']/', $html, $matches)) {
            $title = html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        
        // OGP descriptionを取得（本文として使用）
        $content = '';
        if (preg_match('/<meta[^>]+property=["\']og:description["\'][^>]+content=["\']([^"\']+)["\']/', $html, $matches)) {
            $content = html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        } elseif (preg_match('/<meta[^>]+content=["\']([^"\']+)["\'][^>]+property=["\']og:description["\']/', $html, $matches)) {
            $content = html_entity_decode($matches[1], ENT_QUOTES | ENT_HTML5, 'UTF-8');
        }
        
        // OGP descriptionがない場合、記事本文を取得
        if (empty($content)) {
            libxml_use_internal_errors(true);
            $dom = new DOMDocument();
            @$dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_HTML_NOIMPLIED | LIBXML_HTML_NODEFDTD);
            libxml_clear_errors();
            
            $xpath = new DOMXPath($dom);
            
            // Yahoo!ニュースの本文を取得
            $content_nodes = $xpath->query('//div[contains(@class, "article_body")]//p | //article//p');
            foreach ($content_nodes as $node) {
                $text = html_entity_decode(trim($node->textContent), ENT_QUOTES | ENT_HTML5, 'UTF-8');
                if (!empty($text) && mb_strlen($text) > 20) {
                    $content .= $text . "\n";
                }
            }
        }
        
        return array(
            'title' => trim($title),
            'content' => trim($content),
            'image' => $image
        );
    }
}
