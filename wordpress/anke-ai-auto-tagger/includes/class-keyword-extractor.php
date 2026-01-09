<?php
/**
 * Keyword Extractor Class
 * Anke Keyword Search Systemとの連携
 */

class Anke_AI_Keyword_Extractor {
    
    /**
     * 既存のキーワードを取得
     */
    public function get_existing_keywords($limit = 1000) {
        global $wpdb;
        
        $keywords = $wpdb->get_results($wpdb->prepare(
            "SELECT id, keyword, slug, keyword_type, post_count 
             FROM {$wpdb->prefix}anke_keywords 
             ORDER BY post_count DESC 
             LIMIT %d",
            $limit
        ));
        
        return $keywords;
    }
    
    /**
     * キーワード名でキーワードを検索
     */
    public function find_keyword_by_name($keyword_name) {
        global $wpdb;
        
        $keyword = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}anke_keywords 
             WHERE keyword = %s 
             LIMIT 1",
            $keyword_name
        ));
        
        return $keyword;
    }
    
    /**
     * 投稿に関連付けられたキーワードを取得
     */
    public function get_post_keywords($post_id) {
        global $wpdb;
        
        $keywords = $wpdb->get_results($wpdb->prepare(
            "SELECT k.*, pk.relevance_score, pk.keyword_type as assignment_type
             FROM {$wpdb->prefix}anke_keywords k
             INNER JOIN {$wpdb->prefix}anke_post_keywords pk ON k.id = pk.keyword_id
             WHERE pk.post_id = %d
             ORDER BY pk.relevance_score DESC",
            $post_id
        ));
        
        return $keywords;
    }
}
