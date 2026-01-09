<?php
/**
 * Yahoo!リアルタイム検索 トレンド設定画面
 */

if (!defined('ABSPATH')) {
    exit;
}

// 設定を保存
if (isset($_POST['anke_yahoo_trend_save']) && check_admin_referer('anke_yahoo_trend_settings', 'anke_yahoo_trend_nonce')) {
    update_option('anke_yahoo_trend_enabled', isset($_POST['enabled']) ? 1 : 0);
    update_option('anke_yahoo_trend_interval', intval($_POST['interval']));
    update_option('anke_yahoo_trend_limit', intval($_POST['limit']));
    update_option('anke_yahoo_trend_auto_post_count', intval($_POST['auto_post_count']));
    update_option('anke_yahoo_trend_post_status', sanitize_text_field($_POST['post_status']));
    update_option('anke_yahoo_trend_category', intval($_POST['category']));
    
    echo '<div class="notice notice-success"><p>設定を保存しました。</p></div>';
}

// 現在の設定を取得
$enabled = get_option('anke_yahoo_trend_enabled', 0);
$interval = get_option('anke_yahoo_trend_interval', 24);
$limit = get_option('anke_yahoo_trend_limit', 5);
$auto_post_count = get_option('anke_yahoo_trend_auto_post_count', 3);
$post_status = get_option('anke_yahoo_trend_post_status', 'draft');
$category = get_option('anke_yahoo_trend_category', 0);
?>

<style>
#wpfooter {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    overflow: hidden !important;
    position: absolute !important;
    left: -9999px !important;
}
</style>

<div class="wrap">
    <h2>Yahoo!リアルタイム検索 トレンド設定</h2>
    
    <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 12px 15px; margin: 15px 0; display: flex; align-items: center; gap: 25px; flex-wrap: wrap; font-size: 13px;">
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #28a745; font-size: 16px;">●</span>
            <strong>Yahoo!トレンド自動取得</strong>
        </div>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px; display: flex; align-items: center; gap: 10px;">
            <strong>自動取得:</strong> 
            <?php if ($enabled): ?>
                <span style="color: #28a745;">✓ 有効</span>
                <button type="button" id="stop-yahoo-trend-btn" class="button" style="background: #dc3545; color: white; border-color: #dc3545; padding: 2px 10px; height: auto; line-height: 1.4; font-size: 12px;">
                    ⏸ 停止
                </button>
            <?php else: ?>
                <span style="color: #dc3545;">✗ 無効</span>
                <button type="button" id="start-yahoo-trend-btn" class="button" style="background: #28a745; color: white; border-color: #28a745; padding: 2px 10px; height: auto; line-height: 1.4; font-size: 12px;">
                    ▶ 開始
                </button>
            <?php endif; ?>
        </div>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px;">
            <strong>間隔:</strong> <?php echo esc_html($interval * 60); ?>分
        </div>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px;">
            <strong>記事数:</strong> <?php echo esc_html($auto_post_count); ?>件/回
        </div>
        <?php 
        $next_run = wp_next_scheduled('anke_yahoo_trend_cron');
        if ($next_run && $enabled): 
        ?>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px;">
            <strong>次回:</strong> <?php echo esc_html(wp_date('m/d H:i', $next_run)); ?>
        </div>
        <?php endif; ?>
    </div>
    
    <div style="background: #fff3cd; border-left: 3px solid #ffc107; padding: 8px 12px; margin: 10px 0; font-size: 12px; color: #856404;">
        ⚠️ トレンド取得失敗時はアンケート記事を作成しません
    </div>
    
    <form id="anke-yahoo-trend-settings-form" method="post" action="">
        <?php wp_nonce_field('anke_yahoo_trend_settings', 'anke_yahoo_trend_nonce'); ?>
        <input type="hidden" id="enabled-input" name="enabled" value="<?php echo $enabled ? '1' : '0'; ?>">
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="interval">取得間隔</label>
                </th>
                <td>
                    <input type="number" 
                           id="interval" 
                           name="interval" 
                           value="<?php echo esc_attr($interval); ?>" 
                           min="1" 
                           max="168"
                           class="small-text"> 時間ごと
                    <p class="description">
                        トレンドを取得する間隔を時間単位で指定してください。（推奨: 24時間）
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="limit">取得件数</label>
                </th>
                <td>
                    <input type="number" 
                           id="limit" 
                           name="limit" 
                           value="<?php echo esc_attr($limit); ?>" 
                           min="1" 
                           max="50"
                           class="small-text"> 件
                    <p class="description">
                        1回あたりの取得件数を指定してください。（推奨: 5件）
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="auto_post_count">自動投稿件数</label>
                </th>
                <td>
                    <input type="number" 
                           id="auto_post_count" 
                           name="auto_post_count" 
                           value="<?php echo esc_attr($auto_post_count); ?>" 
                           min="1" 
                           max="<?php echo esc_attr($limit); ?>"
                           class="small-text"> 件
                    <p class="description">
                        取得したトレンドのうち、何件を自動投稿するか指定してください。（推奨: 3件）<br>
                        例: 取得件数5件、自動投稿件数3件 → 上位3件のトレンドから自動で記事を作成
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="post_status">投稿ステータス</label>
                </th>
                <td>
                    <select id="post_status" name="post_status">
                        <option value="draft" <?php selected($post_status, 'draft'); ?>>下書き</option>
                        <option value="publish" <?php selected($post_status, 'publish'); ?>>公開</option>
                        <option value="pending" <?php selected($post_status, 'pending'); ?>>レビュー待ち</option>
                    </select>
                    <p class="description">
                        作成された記事の初期ステータスを選択してください。
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="category">投稿カテゴリー</label>
                </th>
                <td>
                    <?php
                    wp_dropdown_categories(array(
                        'name' => 'category',
                        'id' => 'category',
                        'selected' => $category,
                        'show_option_none' => 'カテゴリーなし',
                        'option_none_value' => 0,
                        'hide_empty' => 0,
                    ));
                    ?>
                    <p class="description">
                        作成された記事に設定するカテゴリーを選択してください。
                    </p>
                </td>
            </tr>
        </table>
        
        <p class="submit">
            <input type="submit" 
                   name="anke_yahoo_trend_save" 
                   class="button button-primary" 
                   value="設定を保存">
        </p>
    </form>
    
    <hr>
    
    <h3>現在のトレンド</h3>
    <p>Yahoo!リアルタイム検索から取得した最新のトレンドワードです。個別に記事を作成できます。</p>
    
    <div id="anke-yahoo-trends-list" style="margin-top: 20px;">
        <p>トレンドを読み込んでいます...</p>
    </div>
</div>

<style>
.anke-trend-item {
    background: #fff;
    border: 1px solid #ddd;
    border-radius: 4px;
    padding: 15px;
    margin-bottom: 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.anke-trend-info {
    flex: 1;
}
.anke-trend-info h4 {
    margin: 0 0 5px 0;
    color: #1d9bf0;
    font-size: 16px;
}
.anke-trend-info .trend-url {
    color: #666;
    font-size: 12px;
    text-decoration: none;
}
.anke-trend-actions {
    display: flex;
    gap: 10px;
}
.anke-trend-status {
    padding: 5px 10px;
    border-radius: 3px;
    font-size: 12px;
    font-weight: bold;
}
.status-processing {
    background: #fff3cd;
    color: #856404;
}
.status-success {
    background: #d4edda;
    color: #155724;
}
.status-error {
    background: #f8d7da;
    color: #721c24;
}
</style>

<script>
jQuery(document).ready(function($) {
    // 開始ボタン
    $(document).on('click', '#start-yahoo-trend-btn', function() {
        console.log('開始ボタンがクリックされました');
        var $button = $(this);
        $button.prop('disabled', true).text('開始中...');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'anke_yahoo_trend_toggle',
                enabled: '1',
                nonce: '<?php echo wp_create_nonce('anke_yahoo_trend_toggle'); ?>'
            },
            success: function(response) {
                console.log('開始成功:', response);
                location.reload();
            },
            error: function(xhr, status, error) {
                console.log('開始エラー:', error);
                alert('開始に失敗しました: ' + (xhr.responseText || error));
                $button.prop('disabled', false).text('▶ 開始');
            }
        });
    });
    
    // 停止ボタン
    $(document).on('click', '#stop-yahoo-trend-btn', function() {
        console.log('停止ボタンがクリックされました');
        var $button = $(this);
        $button.prop('disabled', true).text('停止中...');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'anke_yahoo_trend_toggle',
                enabled: '0',
                nonce: '<?php echo wp_create_nonce('anke_yahoo_trend_toggle'); ?>'
            },
            success: function(response) {
                console.log('停止成功:', response);
                location.reload();
            },
            error: function(xhr, status, error) {
                console.log('停止エラー:', error);
                alert('停止に失敗しました: ' + (xhr.responseText || error));
                $button.prop('disabled', false).text('⏸ 停止');
            }
        });
    });
    
    // ページ読み込み時にトレンドを取得
    loadTrends();
    
    function loadTrends() {
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'anke_yahoo_fetch_trends_manual',
                nonce: '<?php echo wp_create_nonce('anke_yahoo_manual'); ?>'
            },
            success: function(response) {
                if (response.success) {
                    displayTrends(response.data.trends);
                } else {
                    $('#anke-yahoo-trends-list').html('<p style="color: red;">エラー: ' + response.data + '</p>');
                }
            },
            error: function() {
                $('#anke-yahoo-trends-list').html('<p style="color: red;">トレンドの取得に失敗しました</p>');
            }
        });
    }
    
    function displayTrends(trends) {
        if (trends.length === 0) {
            $('#anke-yahoo-trends-list').html('<p>トレンドが見つかりませんでした</p>');
            return;
        }
        
        var html = '';
        trends.forEach(function(trend, index) {
            var trendUrl = 'https://search.yahoo.co.jp/realtime/search?p=' + encodeURIComponent(trend.name);
            html += '<div class="anke-trend-item" data-trend-name="' + trend.name + '">';
            html += '<div class="anke-trend-info">';
            html += '<h4>#' + trend.name + '</h4>';
            html += '<a href="' + trendUrl + '" target="_blank" class="trend-url">Yahoo!で見る →</a>';
            html += '</div>';
            html += '<div class="anke-trend-actions">';
            html += '<button class="button button-primary anke-run-trend" data-trend-name="' + trend.name + '">このトレンドで記事作成</button>';
            html += '</div>';
            html += '</div>';
        });
        
        $('#anke-yahoo-trends-list').html(html);
    }
    
    // 個別トレンドで記事作成
    $(document).on('click', '.anke-run-trend', function() {
        var $button = $(this);
        var $item = $button.closest('.anke-trend-item');
        var trendName = $button.data('trend-name');
        
        // 既に処理中の場合は何もしない
        if ($button.prop('disabled')) {
            return false;
        }
        
        $button.prop('disabled', true).text('作成中...');
        $item.find('.anke-trend-status').remove();
        $item.append('<div class="anke-trend-status status-processing">記事を作成しています...</div>');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'anke_yahoo_create_single',
                nonce: '<?php echo wp_create_nonce('anke_yahoo_manual'); ?>',
                trend_name: trendName
            },
            success: function(response) {
                $item.find('.anke-trend-status').remove();
                if (response.success) {
                    $item.append('<div class="anke-trend-status status-success">✓ 記事を作成しました (ID: ' + response.data.post_id + ')</div>');
                    $button.text('作成完了');
                } else {
                    $item.append('<div class="anke-trend-status status-error">✗ エラー: ' + response.data + '</div>');
                    $button.prop('disabled', false).text('このトレンドで記事作成');
                }
            },
            error: function() {
                $item.find('.anke-trend-status').remove();
                $item.append('<div class="anke-trend-status status-error">✗ 通信エラーが発生しました</div>');
                $button.prop('disabled', false).text('このトレンドで記事作成');
            }
        });
    });
});
</script>
