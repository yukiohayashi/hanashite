<?php
/**
 * Category Matcher Class
 * Anke Categoriesとの連携
 */

class Anke_AI_Category_Matcher {
    
    /**
     * 利用可能なカテゴリを取得
     */
    public function get_available_categories() {
        global $wpdb;
        
        $categories = $wpdb->get_results(
            "SELECT id, name, slug, description 
             FROM {$wpdb->prefix}anke_categories 
             WHERE is_active = 1 
             ORDER BY display_order ASC"
        );
        
        return $categories;
    }
    
    /**
     * カテゴリ名でカテゴリを検索
     */
    public function find_category_by_name($name) {
        global $wpdb;
        
        $category = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}anke_categories 
             WHERE name = %s AND is_active = 1 
             LIMIT 1",
            $name
        ));
        
        return $category;
    }
    
    /**
     * カテゴリIDでカテゴリを取得
     */
    public function get_category($category_id) {
        global $wpdb;
        
        $category = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}anke_categories 
             WHERE id = %d",
            $category_id
        ));
        
        return $category;
    }
}
