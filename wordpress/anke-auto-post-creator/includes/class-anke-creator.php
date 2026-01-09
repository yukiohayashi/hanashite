<?php
/**
 * アンケート作成クラス
 */

if (!defined('ABSPATH')) {
    exit;
}

class Anke_Auto_Creator_Anke_Creator {
    
    /**
     * アンケートを作成
     */
    public function create_anke($anke_data, $article, $questioner_id) {
        global $wpdb;
        
        // デバッグ: 受け取ったquestioner_idをログ出力
        error_log('=== ANKE AUTO CREATOR DEBUG ===');
        error_log('Received questioner_id: ' . $questioner_id);
        
        // questioner_idの妥当性チェック
        if (empty($questioner_id) || $questioner_id <= 0) {
            error_log('ERROR: Invalid questioner_id: ' . $questioner_id);
            return array('error' => '無効な質問者IDです');
        }
        
        // 重複タイトルチェック
        $existing_post = $wpdb->get_var($wpdb->prepare(
            "SELECT ID FROM {$wpdb->posts} WHERE post_title = %s AND post_status = 'publish' AND post_type = 'post'",
            $anke_data['question']
        ));
        
        if ($existing_post) {
            error_log('Anke Auto Creator: Duplicate title detected - "' . $anke_data['question'] . '" (Post ID: ' . $existing_post . ')');
            return array('error' => '同じタイトルの記事が既に存在します: ' . $anke_data['question']);
        }
        
        // 質問者を取得（status=2の編集者、またはstatus=6のAI会員のみ）
        $questioner = $wpdb->get_row($wpdb->prepare(
            "SELECT * FROM {$wpdb->prefix}anke_users WHERE id = %d AND status IN (2, 6)",
            $questioner_id
        ));
        
        // デバッグ: 取得したユーザー情報をログ出力
        if ($questioner) {
            error_log('Found user: id=' . $questioner->id . ', nicename=' . $questioner->user_nicename . ', status=' . $questioner->status);
        } else {
            error_log('User not found with id=' . $questioner_id);
            // 実際に存在するか確認
            $any_user = $wpdb->get_row($wpdb->prepare(
                "SELECT id, user_nicename, status FROM {$wpdb->prefix}anke_users WHERE id = %d",
                $questioner_id
            ));
            if ($any_user) {
                error_log('ERROR: User exists but status=' . $any_user->status . ' (not 2 or 6). Cannot post with this user.');
                return array('error' => '質問者のステータスが不正です（status=' . $any_user->status . '）。編集者（status=2）またはAI会員（status=6）のみ投稿可能です。');
            } else {
                error_log('ERROR: User ID=' . $questioner_id . ' does not exist in wp_anke_users');
            }
        }
        
        if (!$questioner) {
            return array('error' => '質問者が見つかりません（編集者またはAI会員のみ投稿可能）。questioner_id=' . $questioner_id);
        }
        
        // 二重チェック: status=3（運営者）での投稿を絶対に防止
        if ($questioner->status == 3) {
            error_log('ERROR: Attempted to post with admin account (status=3). This should never happen!');
            return array('error' => '運営者アカウント（status=3）では投稿できません');
        }
        
        // 念のため、status=2または6以外は拒否
        if (!in_array($questioner->status, [2, 6])) {
            error_log('ERROR: Invalid status=' . $questioner->status . ' for posting');
            return array('error' => '不正なユーザーステータスです（status=' . $questioner->status . '）');
        }
        
        // 投稿を作成
        // post_authorには実際の質問者ID（wp_anke_users.id）を使用
        // wp_anke_postsテーブルにも同じquestioner_idを保存
        error_log('Using questioner_id: ' . $questioner_id . ' for wp_posts.post_author');
        
        $post_data = array(
            'post_title' => $anke_data['question'],
            'post_content' => $this->build_post_content($article),
            'post_status' => 'publish',
            'post_author' => $questioner_id, // wp_anke_users.id
            'post_type' => 'post'
        );
        
        $post_id = wp_insert_post($post_data);
        
        if (!is_wp_error($post_id)) {
            // wp_anke_postsテーブルにメタ情報を保存
            $wpdb->insert(
                'wp_anke_posts',
                array(
                    'post_id' => $post_id,
                    'questioner_id' => $questioner_id,
                    'questioner_name' => $questioner->user_nicename,
                    'source_url' => $article['url'],
                    'auto_created' => 1
                ),
                array('%d', '%d', '%s', '%s', '%d')
            );
        }
        
        if (is_wp_error($post_id)) {
            return array('error' => $post_id->get_error_message());
        }
        
        // 投票オプションを作成
        $this->create_vote_options($post_id, $anke_data['choices']);
        
        // カテゴリを設定
        $this->assign_categories($post_id, $anke_data['categories']);
        
        // キーワードを設定
        $this->assign_keywords($post_id, $anke_data['keywords']);
        
        // AI Auto Taggerでカテゴリとキーワードを自動割り当て（既存の割り当てがない場合）
        if (function_exists('anke_ai_auto_tag_post_with_category')) {
            do_action('anke_ai_auto_tag_post', $post_id, 'auto');
        }
        
        // 画像を設定
        $local_image_url = '';
        error_log('Anke Auto Creator: Article image check - ' . (!empty($article['image']) ? $article['image'] : '(empty)'));
        
        if (!empty($article['image'])) {
            // Yahoo!トレンドの固定画像の場合は、URLをそのまま設定（ダウンロード不要）
            if (strpos($article['image'], 'yahoo-thumbnail.jpg') !== false) {
                error_log('Anke Auto Creator: Using Yahoo fixed thumbnail (no download)');
                update_post_meta($post_id, 'og_image', $article['image']);
                $local_image_url = $article['image'];
            } else {
                error_log('Anke Auto Creator: Attempting to download image: ' . $article['image']);
                // 画像をダウンロードしてメディアライブラリに保存し、アイキャッチに設定
                $local_image_url = $this->set_featured_image($post_id, $article['image']);

                // og_imageカスタムフィールドにはローカルURLを優先して保存
                if (!empty($local_image_url)) {
                    error_log('Anke Auto Creator: Successfully saved image to media library: ' . $local_image_url);
                    update_post_meta($post_id, 'og_image', $local_image_url);
                } else {
                    error_log('Anke Auto Creator: Failed to save to media library, using original URL as fallback');
                    // フォールバックとして元の画像URLを保存
                    update_post_meta($post_id, 'og_image', $article['image']);
                }
            }
        } else {
            error_log('Anke Auto Creator: No image URL provided in article data');
        }
        
        // OGPキャッシュに保存（ローカルURLがあればそれを優先）
        $article['post_id'] = $post_id;
        $this->save_ogp_cache($article, $local_image_url);
        
        // 処理済みURLとして記録
        $this->record_processed_url($article['url'], $article['title'], $post_id);
        
        return array(
            'success' => true,
            'post_id' => $post_id,
            'post_url' => get_permalink($post_id)
        );
    }
    
    /**
     * 投稿本文を構築
     */
    private function build_post_content($article) {
        $content = '';
        
        // 参照元URL
        if (!empty($article['url'])) {
            $content .= esc_url($article['url']) . "\n";
        }
        
        // 記事本文（OGP description）
        if (!empty($article['content'])) {
            $content .= esc_html($article['content']);
        }
        
        return $content;
    }
    
    /**
     * 投票オプションを作成
     */
    private function create_vote_options($post_id, $choices) {
        global $wpdb;
        
        // 投票設定を作成
        $wpdb->insert(
            $wpdb->prefix . 'anke_vote_options',
            array(
                'post_id' => $post_id,
                'random' => 0,
                'closedate' => date('Y-m-d', strtotime('+30 days')),
                'closetime' => '23:59:59',
                'open' => 1,
                'rand' => '',
                'multi' => 0
            )
        );
        
        // 選択肢を作成
        foreach ($choices as $index => $choice) {
            $wpdb->insert(
                $wpdb->prefix . 'anke_vote_choices',
                array(
                    'post_id' => $post_id,
                    'choice' => $choice,
                    'count' => 0,
                    'url' => '',
                    'create_date' => current_time('mysql')
                )
            );
        }
    }
    
    /**
     * カテゴリを割り当て
     */
    private function assign_categories($post_id, $categories) {
        global $wpdb;
        
        // 最大カテゴリ数を取得
        $settings = get_option('anke_auto_creator_settings', array());
        $max_categories = intval($settings['max_categories'] ?? 2);
        
        $assigned_count = 0;
        foreach ($categories as $category_name) {
            if ($assigned_count >= $max_categories) {
                break;
            }
            // 既存のカテゴリから検索（完全一致または部分一致）
            $category = $wpdb->get_row($wpdb->prepare(
                "SELECT id FROM {$wpdb->prefix}anke_categories WHERE name = %s AND is_active = 1",
                $category_name
            ));
            
            // 完全一致がない場合、部分一致で検索
            if (!$category) {
                $category = $wpdb->get_row($wpdb->prepare(
                    "SELECT id FROM {$wpdb->prefix}anke_categories WHERE name LIKE %s AND is_active = 1 ORDER BY id ASC LIMIT 1",
                    '%' . $wpdb->esc_like($category_name) . '%'
                ));
            }
            
            // それでも見つからない場合、類似カテゴリを検索
            if (!$category) {
                // カテゴリ名の最初の単語で検索
                $first_word = preg_split('/[\s・、,]+/u', $category_name)[0];
                if (!empty($first_word)) {
                    $category = $wpdb->get_row($wpdb->prepare(
                        "SELECT id FROM {$wpdb->prefix}anke_categories WHERE name LIKE %s AND is_active = 1 ORDER BY id ASC LIMIT 1",
                        '%' . $wpdb->esc_like($first_word) . '%'
                    ));
                }
            }
            
            // 既存のカテゴリが見つかった場合のみ関連付け
            if ($category) {
                // 投稿とカテゴリを関連付け
                $wpdb->insert(
                    $wpdb->prefix . 'anke_post_categories',
                    array(
                        'post_id' => $post_id,
                        'category_id' => $category->id
                    ),
                    array('%d', '%d')
                );
                $assigned_count++;
            } else {
                error_log('Anke Auto Creator: カテゴリが見つかりません: ' . $category_name);
            }
        }
    }
    
    /**
     * キーワードを割り当て
     */
    private function assign_keywords($post_id, $keywords) {
        global $wpdb;
        
        // 自動キーワードは最大3個に制限
        $max_auto_keywords = 3;
        
        $assigned_count = 0;
        foreach ($keywords as $keyword_text) {
            if ($assigned_count >= $max_auto_keywords) {
                break;
            }
            // キーワードを検索または作成
            $keyword = $wpdb->get_row($wpdb->prepare(
                "SELECT id FROM {$wpdb->prefix}anke_keywords WHERE keyword = %s",
                $keyword_text
            ));
            
            if (!$keyword) {
                // 新規キーワードを作成
                $wpdb->insert(
                    $wpdb->prefix . 'anke_keywords',
                    array(
                        'keyword' => $keyword_text,
                        'slug' => sanitize_title($keyword_text),
                        'keyword_type' => 'tag',
                        'post_count' => 1,
                        'created_at' => current_time('mysql')
                    )
                );
                $keyword_id = $wpdb->insert_id;
            } else {
                $keyword_id = $keyword->id;
                // 投稿数を更新
                $wpdb->query($wpdb->prepare(
                    "UPDATE {$wpdb->prefix}anke_keywords SET post_count = post_count + 1 WHERE id = %d",
                    $keyword_id
                ));
            }
            
            // 既に関連付けられているかチェック
            $existing = $wpdb->get_var($wpdb->prepare(
                "SELECT COUNT(*) FROM {$wpdb->prefix}anke_post_keywords 
                WHERE post_id = %d AND keyword_id = %d",
                $post_id,
                $keyword_id
            ));
            
            // 重複していない場合のみ関連付け
            if (!$existing) {
                $wpdb->insert(
                    $wpdb->prefix . 'anke_post_keywords',
                    array(
                        'post_id' => $post_id,
                        'keyword_id' => $keyword_id,
                        'keyword_type' => 'auto',
                        'relevance_score' => 1.0
                    ),
                    array('%d', '%d', '%s', '%f')
                );
                $assigned_count++;
            }
        }
    }
    
    /**
     * アイキャッチ画像を設定
     */
    private function set_featured_image($post_id, $image_url) {
        if (empty($image_url)) {
            return '';
        }
        
        // Yahoo!トレンドの固定画像の場合は、何もしない（URLだけ使用）
        if (strpos($image_url, 'yahoo-thumbnail.jpg') !== false) {
            // 画像のダウンロードや添付ファイルの作成は不要
            // og_imageにURLが設定されていればOK
            return $image_url;
        }
        
        require_once(ABSPATH . 'wp-admin/includes/media.php');
        require_once(ABSPATH . 'wp-admin/includes/file.php');
        require_once(ABSPATH . 'wp-admin/includes/image.php');
        
        // 画像サイズの自動生成を一時的に無効化
        add_filter('intermediate_image_sizes_advanced', '__return_empty_array');
        
        $image_id = media_sideload_image($image_url, $post_id, null, 'id');
        
        // フィルターを解除
        remove_filter('intermediate_image_sizes_advanced', '__return_empty_array');
        
        if (!is_wp_error($image_id)) {
            // アイキャッチに設定
            set_post_thumbnail($post_id, $image_id);
            
            // 画像ファイルを投稿IDベースにリネーム
            $this->rename_attachment_to_post_id($image_id, $post_id);
            
            // 添付ファイルの実際のURLを返す（メディアライブラリに保存されたローカルURL）
            $local_url = wp_get_attachment_url($image_id);
            return $local_url ? $local_url : '';
        } else {
            error_log('Anke Auto Creator: 画像取得エラー: ' . $image_id->get_error_message() . ' URL: ' . $image_url);
            return '';
        }
    }
    
    /**
     * 添付ファイルを投稿IDベースにリネーム
     */
    private function rename_attachment_to_post_id($attachment_id, $post_id) {
        $file_path = get_attached_file($attachment_id);
        if (!$file_path || !file_exists($file_path)) {
            return false;
        }
        
        $file_info = pathinfo($file_path);
        $extension = $file_info['extension'];
        $upload_dir = wp_upload_dir();
        
        // 新しいファイル名: {post_id}.{拡張子}
        $new_filename = $post_id . '.' . $extension;
        $new_file_path = $file_info['dirname'] . '/' . $new_filename;
        
        // ファイルをリネーム
        if (rename($file_path, $new_file_path)) {
            // データベースの添付ファイルパスを更新（相対パスで保存）
            $relative_path = str_replace($upload_dir['basedir'] . '/', '', $new_file_path);
            update_attached_file($attachment_id, $relative_path);
            
            // メタデータを更新
            $metadata = wp_get_attachment_metadata($attachment_id);
            if ($metadata && isset($metadata['file'])) {
                $metadata['file'] = $relative_path;
                wp_update_attachment_metadata($attachment_id, $metadata);
            }
            
            // GUIDも更新（画像URL）
            global $wpdb;
            $new_url = $upload_dir['baseurl'] . '/' . $new_filename;
            $wpdb->update(
                $wpdb->posts,
                array('guid' => $new_url),
                array('ID' => $attachment_id),
                array('%s'),
                array('%d')
            );
            
            // WebPファイルもリネーム
            $webp_file = preg_replace('/\.(jpg|jpeg|png)$/i', '.webp', $file_path);
            if (file_exists($webp_file)) {
                $new_webp_file = $file_info['dirname'] . '/' . $post_id . '.webp';
                if (rename($webp_file, $new_webp_file)) {
                    error_log('Anke Auto Creator: Renamed WebP to: ' . $post_id . '.webp');
                }
            }
            
            // サイズ別のWebPファイルもリネーム
            if ($metadata && isset($metadata['sizes']) && is_array($metadata['sizes'])) {
                foreach ($metadata['sizes'] as $size => $size_data) {
                    $size_file = $file_info['dirname'] . '/' . $size_data['file'];
                    $size_webp = preg_replace('/\.(jpg|jpeg|png)$/i', '.webp', $size_file);
                    
                    if (file_exists($size_webp)) {
                        // サイズ情報を抽出（例: 300x300）
                        if (preg_match('/-(\d+x\d+)\.(jpg|jpeg|png)$/i', $size_data['file'], $matches)) {
                            $size_suffix = $matches[1];
                            $new_size_webp = $file_info['dirname'] . '/' . $post_id . '-' . $size_suffix . '.webp';
                            if (rename($size_webp, $new_size_webp)) {
                                error_log('Anke Auto Creator: Renamed size WebP to: ' . $post_id . '-' . $size_suffix . '.webp');
                            }
                        }
                    }
                }
            }
            
            error_log('Anke Auto Creator: Renamed image to: ' . $new_filename);
            return true;
        }
        
        return false;
    }
    
    /**
     * 処理済みURLを記録
     */
    private function record_processed_url($article_url, $article_title, $post_id) {
        global $wpdb;
        
        $settings = get_option('anke_auto_creator_settings', array());
        $source_url = $settings['current_source_url'] ?? '';
        
        $wpdb->insert(
            $wpdb->prefix . 'anke_auto_creator_processed',
            array(
                'source_url' => $source_url,
                'article_url' => $article_url,
                'article_title' => $article_title,
                'post_id' => $post_id,
                'created_at' => current_time('mysql')
            )
        );
    }
    
    /**
     * OGPキャッシュに保存（統合版）
     */
    private function save_ogp_cache($article, $local_image_url = '') {
        if (empty($article['url']) || empty($article['post_id'])) {
            return;
        }
        
        // 統合版: wp_anke_postsにOGP情報を保存
        anke_save_ogp_cache(
            $article['url'],
            array(
                'title' => $article['title'] ?? '',
                'image' => !empty($local_image_url) ? $local_image_url : ($article['image'] ?? ''),
                'description' => mb_substr($article['content'] ?? '', 0, 200),
                'site_name' => $this->extract_site_name($article['url'])
            )
        );
    }
    
    /**
     * サイト名を抽出
     */
    private function extract_site_name($url) {
        $parsed = parse_url($url);
        $host = $parsed['host'] ?? '';
        
        if (strpos($host, 'news.yahoo.co.jp') !== false) {
            return 'Yahoo!ニュース';
        }
        
        return $host;
    }
    
    /**
     * URLが処理済みかチェック
     */
    public function is_url_processed($url) {
        global $wpdb;
        
        $count = $wpdb->get_var($wpdb->prepare(
            "SELECT COUNT(*) FROM {$wpdb->prefix}anke_auto_creator_processed WHERE article_url = %s",
            $url
        ));
        
        return $count > 0;
    }
}
