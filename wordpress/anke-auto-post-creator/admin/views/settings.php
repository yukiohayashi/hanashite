<?php
/**
 * 設定画面
 */

if (!defined('ABSPATH')) {
    exit;
}

$settings = get_option('anke_auto_creator_settings', array());
$next_run = Anke_Auto_Creator_Cron_Scheduler::get_next_run_time();
$active_tab = isset($_GET['tab']) ? sanitize_text_field($_GET['tab']) : 'rss';
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
    <h1>アンケ自動作成 設定</h1>
    
    <!-- ステータス表示 -->
    <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 12px 15px; margin: 15px 0; display: flex; align-items: center; gap: 25px; flex-wrap: wrap; font-size: 13px;">
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #28a745; font-size: 16px;">●</span>
            <strong>RSS自動作成</strong>
        </div>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px; display: flex; align-items: center; gap: 10px;">
            <strong>自動作成:</strong> 
            <?php if ($settings['enabled'] ?? true): ?>
                <span style="color: #28a745;">✓ 有効</span>
                <form method="post" action="" style="display: inline; margin: 0;">
                    <?php wp_nonce_field('anke_auto_creator_toggle'); ?>
                    <input type="hidden" name="action" value="toggle_enabled">
                    <input type="hidden" name="enabled" value="0">
                    <button type="submit" class="button" style="background: #dc3545; color: white; border-color: #dc3545; padding: 2px 10px; height: auto; line-height: 1.4; font-size: 12px;">
                        ⏸ 停止
                    </button>
                </form>
            <?php else: ?>
                <span style="color: #dc3545;">✗ 無効</span>
                <form method="post" action="" style="display: inline; margin: 0;">
                    <?php wp_nonce_field('anke_auto_creator_toggle'); ?>
                    <input type="hidden" name="action" value="toggle_enabled">
                    <input type="hidden" name="enabled" value="1">
                    <button type="submit" class="button" style="background: #28a745; color: white; border-color: #28a745; padding: 2px 10px; height: auto; line-height: 1.4; font-size: 12px;">
                        ▶ 開始
                    </button>
                </form>
            <?php endif; ?>
        </div>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px;">
            <?php 
            $interval_minutes = round(floatval($settings['interval_hours'] ?? 1) * 60);
            $variance = intval($settings['interval_variance'] ?? 15);
            $min_minutes = $interval_minutes - $variance;
            $max_minutes = $interval_minutes + $variance;
            
            // 時間と分に分解して表示
            $hours = floor($interval_minutes / 60);
            $minutes = $interval_minutes % 60;
            $interval_display = '';
            if ($hours > 0) {
                $interval_display .= $hours . '時間';
            }
            if ($minutes > 0 || $hours == 0) {
                $interval_display .= $minutes . '分';
            }
            ?>
            <strong>間隔:</strong> <?php echo $interval_display; ?> ± <?php echo $variance; ?>分 <span style="color: #666; font-size: 11px;">(<?php echo $min_minutes; ?>〜<?php echo $max_minutes; ?>分)</span>
        </div>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px;">
            <strong>記事数:</strong> <?php echo intval($settings['posts_per_run'] ?? 3); ?>件
        </div>
        <?php if ($settings['enabled'] ?? true): ?>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px;">
            <strong>次回:</strong> <?php echo esc_html($next_run); ?>
        </div>
        <?php endif; ?>
    </div>
    
    <h2 class="nav-tab-wrapper">
        <a href="?page=anke-auto-creator&tab=openai" class="nav-tab <?php echo $active_tab === 'openai' ? 'nav-tab-active' : ''; ?>">
            OpenAI API設定
        </a>
        <a href="?page=anke-auto-creator&tab=rss" class="nav-tab <?php echo $active_tab === 'rss' ? 'nav-tab-active' : ''; ?>">
            RSS設定
        </a>
        <a href="?page=anke-auto-creator&tab=x-api" class="nav-tab <?php echo $active_tab === 'x-api' ? 'nav-tab-active' : ''; ?>">
            Yahoo!トレンド設定
        </a>
        <a href="?page=anke-auto-creator&tab=logs" class="nav-tab <?php echo $active_tab === 'logs' ? 'nav-tab-active' : ''; ?>">
            ログ
        </a>
    </h2>
    
    <!-- 手動実行結果表示エリア（全タブ共通） -->
    <div id="manual-run-result" style="margin: 15px 0; padding: 10px; background: #f0f0f0; border-radius: 4px; display: none;"></div>
    
    <?php if ($active_tab === 'openai'): ?>
        <?php include ANKE_AUTO_CREATOR_PATH . 'admin/settings-openai.php'; ?>
    <?php elseif ($active_tab === 'x-api'): ?>
        <?php include ANKE_AUTO_CREATOR_PATH . 'admin/settings-yahoo-trend.php'; ?>
    <?php elseif ($active_tab === 'logs'): ?>
        <div class="card" style="max-width: none; margin-top: 20px;">
            <h2>実行ログ</h2>
            <p>ログ機能は今後実装予定です。</p>
        </div>
    <?php else: ?>
    
    <form method="post" action="">
        <?php wp_nonce_field('anke_auto_creator_settings'); ?>
        
        <div class="card" style="max-width: none;">
            <h2>RSS URL設定</h2>
            <p class="description">ニュース記事を取得するRSS/AtomフィードのURLを最大4つまで登録できます。</p>
            
            <?php 
            $urls = $settings['urls'] ?? array();
            // 最大4つまで
            for ($i = 0; $i < 4; $i++): 
                $index = $i + 1;
                $url = $urls[$i] ?? '';
            ?>
            <div style="margin-bottom: 15px;">
                <label for="url_<?php echo $index; ?>" style="display: inline-block; width: 80px; font-weight: bold;">RSS <?php echo $index; ?>:</label>
                <input type="url" name="url_<?php echo $index; ?>" 
                       id="url_<?php echo $index; ?>"
                       value="<?php echo esc_attr($url); ?>" 
                       class="large-text rss-url-input" 
                       placeholder="https://example.com/feed"
                       style="width: calc(100% - 280px);">
                <button type="button" class="button" onclick="loadAllRssFeeds()" style="margin-left: 10px;">
                    <span class="dashicons dashicons-update" style="vertical-align: middle;"></span> 全RSS再読み込み
                </button>
            </div>
            <?php endfor; ?>
            
            <hr style="margin: 20px 0;">
            
            <h3>RSS記事一覧</h3>
            <div id="rss_articles_table" style="margin-top: 15px;">
                <p style="color: #666;">「全RSS再読み込み」ボタンをクリックすると、全RSSの記事が表示されます。</p>
            </div>
        </div>
        
        <div class="card" style="max-width: none;">
            <h2>実行間隔設定</h2>
            <table class="form-table">
                <tr>
                    <th>基本間隔</th>
                    <td>
                        <?php
                        // 保存されている時間（時間単位）を時間と分に分解
                        $total_minutes = round(floatval($settings['interval_hours'] ?? 1) * 60);
                        $hours = floor($total_minutes / 60);
                        $minutes = $total_minutes % 60;
                        ?>
                        <input type="number" name="interval_hours" id="interval_hours"
                               value="<?php echo $hours; ?>" 
                               min="0" max="24" step="1" style="width: 80px;"> 時間
                        <input type="number" name="interval_minutes" id="interval_minutes"
                               value="<?php echo $minutes; ?>" 
                               min="0" max="59" step="1" style="width: 80px;"> 分
                        <input type="hidden" name="interval" id="interval_total" value="<?php echo $total_minutes; ?>">
                        <p class="description">アンケート作成の基本間隔（例: 2時間30分 = 150分ごと、0時間10分 = 10分ごと）</p>
                        <p class="description" style="color: #999;">※ 最小10分、最大24時間</p>
                    </td>
                </tr>
                <tr>
                    <th>ゆらぎ</th>
                    <td>
                        ± <input type="number" name="interval_variance" 
                               value="<?php echo intval($settings['interval_variance'] ?? 15); ?>" 
                               min="0" max="60" step="5"> 分
                        <p class="description">実行時刻のランダムなゆらぎ（同じ時刻に作成しないため）</p>
                    </td>
                </tr>
                <tr>
                    <th>1回の処理件数</th>
                    <td>
                        <input type="number" name="posts_per_run" 
                               value="<?php echo intval($settings['posts_per_run'] ?? 1); ?>" 
                               min="1" max="10" step="1"> 件
                        <p class="description">1回の実行で処理するアンケート記事の件数</p>
                        <p class="description" style="color: #d63638;">※ 推奨: 1件（複数件だと同時刻に複数記事が投稿され不自然になります）</p>
                    </td>
                </tr>
                <tr>
                    <th>作成しない時間帯</th>
                    <td>
                        <input type="time" name="blackout_start" 
                               value="<?php echo esc_attr($settings['blackout_start'] ?? '00:00'); ?>"> 
                        ～ 
                        <input type="time" name="blackout_end" 
                               value="<?php echo esc_attr($settings['blackout_end'] ?? '06:00'); ?>">
                        <p class="description">この時間帯はアンケートを作成しません（例: 深夜0時～6時）</p>
                        <p class="description" style="color: #666;">※ 基本間隔が30分以上の場合、この設定は無効になります</p>
                    </td>
                </tr>
            </table>
        </div>
        
        <div class="card" style="max-width: none;">
            <h2>スクレイピング設定</h2>
            <table class="form-table">
                <tr>
                    <th>待機時間</th>
                    <td>
                        <input type="number" name="scraping_delay_min" 
                               value="<?php echo intval($settings['scraping_delay_min'] ?? 30); ?>" 
                               min="10" max="300" step="10"> 秒 ～ 
                        <input type="number" name="scraping_delay_max" 
                               value="<?php echo intval($settings['scraping_delay_max'] ?? 120); ?>" 
                               min="10" max="300" step="10"> 秒
                        <p class="description">各URL間のランダムな待機時間（サーバー負荷軽減のため）</p>
                    </td>
                </tr>
            </table>
        </div>
        
        <p class="submit">
            <input type="submit" name="anke_auto_creator_save" class="button button-primary" value="設定を保存">
        </p>
    </form>
</div>

<style>
.card {
    margin-bottom: 20px;
}
.card h2 {
    margin-top: 0;
}
.rss-preview {
    background: #f5f5f5;
    padding: 6px;
    border-radius: 3px;
    max-height: 450px;
    overflow-y: auto;
}
.rss-preview > p {
    margin: 2px 0;
    font-size: 11px;
}
.rss-item {
    padding: 3px 4px;
    border-bottom: 1px solid #e0e0e0;
}
.rss-item:last-child {
    border-bottom: none;
}
.rss-item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1px;
    gap: 6px;
}
.rss-item-title {
    font-weight: bold;
    flex: 1;
    font-size: 11px;
    line-height: 1.3;
}
.rss-item-title a {
    color: #0073aa;
    text-decoration: none;
}
.rss-item-title a:hover {
    color: #005177;
    text-decoration: underline;
}
.rss-item-date {
    font-size: 9px;
    color: #666;
    white-space: nowrap;
    margin-left: 4px;
}
.rss-item-content {
    font-size: 10px;
    color: #555;
    margin-top: 1px;
    line-height: 1.3;
}
.rss-item-actions .button-small {
    padding: 2px 6px;
    font-size: 10px;
    height: auto;
    line-height: 1.2;
}
</style>

<script>
function loadRssFeed(urlNum) {
    var url = document.getElementById('url_' + urlNum).value;
    var previewDiv = document.getElementById('rss_preview_' + urlNum);
    
    if (!url) {
        alert('RSSのURLを入力してください');
        return;
    }
    
    previewDiv.innerHTML = '<p>読み込み中...</p>';
    
    jQuery.ajax({
        url: ankeAutoCreator.ajax_url,
        type: 'POST',
        data: {
            action: 'anke_auto_creator_load_rss',
            nonce: ankeAutoCreator.nonce,
            rss_url: url
        },
        success: function(response) {
            if (response.success) {
                var items = response.data.items;
                var rssTitle = response.data.title;
                
                // RSSタイトルをラベルに反映
                var titleLabel = document.getElementById('rss_title_' + urlNum);
                if (titleLabel && rssTitle) {
                    titleLabel.textContent = rssTitle;
                }
                
                var html = '<div class="rss-preview">';
                html += '<p><strong>フィード: ' + rssTitle + '</strong></p>';
                html += '<p style="font-size: 12px; color: #666;">最新' + items.length + '件の記事</p>';
                
                items.forEach(function(item) {
                    var safeTitle   = (item.title || '').replace(/"/g, '&quot;');
                    var safeUrl     = (item.url || '').replace(/"/g, '&quot;');
                    var safeContent = (item.content || '').replace(/"/g, '&quot;');
                    var safeImage   = (item.image || '').replace(/"/g, '&quot;');

                    html += '<div class="rss-item" ' +
                            'data-article-title="' + safeTitle + '" ' +
                            'data-article-url="' + safeUrl + '" ' +
                            'data-article-content="' + safeContent + '" ' +
                            'data-article-image="' + safeImage + '">';
                    html += '<div class="rss-item-header">';
                    html += '<div class="rss-item-title">';
                    html += '<a href="' + item.url + '" target="_blank" rel="noopener noreferrer">' + item.title + '</a>';
                    html += '</div>';
                    html += '<div class="rss-item-date">' + item.date + '</div>';
                    if (item.image) {
                        html += '<div class="rss-item-thumb"><img src="' + item.image + '" alt="" style="max-width:60px;height:auto;border-radius:2px;" /></div>';
                    }
                    html += '<div class="rss-item-actions">';
                    html += '<button type="button" class="button button-small run-single-news">このニュースで実行</button>';
                    html += '</div>';
                    html += '</div>';
                    if (item.content) {
                        html += '<div class="rss-item-content">' + item.content + '</div>';
                    }
                    html += '</div>';
                });
                
                html += '</div>';
                previewDiv.innerHTML = html;
            } else {
                previewDiv.innerHTML = '<p style="color: red;">エラー: ' + response.data + '</p>';
            }
        },
        error: function() {
            previewDiv.innerHTML = '<p style="color: red;">読み込みエラーが発生しました</p>';
        }
    });
}

// RSS URLを追加
function addRssUrl() {
    var table = document.getElementById('rss-url-table');
    var rows = table.querySelectorAll('.rss-url-row');
    var newIndex = rows.length + 1;
    
    var newRow = document.createElement('tr');
    newRow.className = 'rss-url-row';
    newRow.setAttribute('data-index', newIndex);
    
    newRow.innerHTML = '<th><span class="rss-title-label" id="rss_title_' + newIndex + '">RSS URL ' + newIndex + '</span></th>' +
        '<td>' +
        '<input type="url" name="url_' + newIndex + '" id="url_' + newIndex + '" value="" class="large-text rss-url-input" placeholder="https://example.com/feed" onchange="loadRssFeed(' + newIndex + ')">' +
        '<button type="button" class="button" onclick="loadRssFeed(' + newIndex + ')">RSS再読み込み</button>' +
        '<button type="button" class="button button-link-delete" onclick="removeRssUrl(' + newIndex + ')" style="color: #b32d2e;">削除</button>' +
        '<div id="rss_preview_' + newIndex + '" style="margin-top: 10px;"></div>' +
        '</td>';
    
    table.appendChild(newRow);
}

// RSS URLを削除
function removeRssUrl(urlNum) {
    if (!confirm('このRSS URLを削除しますか？')) {
        return;
    }
    
    var row = document.querySelector('.rss-url-row[data-index="' + urlNum + '"]');
    if (row) {
        row.remove();
        
        // インデックスを振り直す
        var rows = document.querySelectorAll('.rss-url-row');
        rows.forEach(function(r, i) {
            var newIndex = i + 1;
            r.setAttribute('data-index', newIndex);
            
            // ラベル更新
            var label = r.querySelector('.rss-title-label');
            if (label) {
                var currentText = label.textContent;
                // RSSタイトルが設定されていない場合のみ番号を更新
                if (currentText.match(/^RSS URL \d+$/)) {
                    label.textContent = 'RSS URL ' + newIndex;
                }
                label.id = 'rss_title_' + newIndex;
            }
            
            // input要素のname/id更新
            var input = r.querySelector('.rss-url-input');
            if (input) {
                input.name = 'url_' + newIndex;
                input.id = 'url_' + newIndex;
                input.setAttribute('onchange', 'loadRssFeed(' + newIndex + ')');
            }
            
            // ボタン更新
            var loadBtn = r.querySelector('.button:not(.button-link-delete)');
            if (loadBtn) {
                loadBtn.setAttribute('onclick', 'loadRssFeed(' + newIndex + ')');
            }
            
            var delBtn = r.querySelector('.button-link-delete');
            if (delBtn) {
                delBtn.setAttribute('onclick', 'removeRssUrl(' + newIndex + ')');
            }
            
            // プレビューdiv更新
            var preview = r.querySelector('[id^="rss_preview_"]');
            if (preview) {
                preview.id = 'rss_preview_' + newIndex;
            }
        });
    }
}

// 全RSSを読み込んでテーブル表示
function loadAllRssFeeds() {
    var $tableDiv = jQuery('#rss_articles_table');
    $tableDiv.html('<p style="color: #999;">読み込み中...</p>');
    
    var allArticles = [];
    var urlsToLoad = [];
    
    // 空でないURLを収集
    for (var i = 1; i <= 3; i++) {
        var url = jQuery('#url_' + i).val();
        if (url) {
            urlsToLoad.push({index: i, url: url});
        }
    }
    
    if (urlsToLoad.length === 0) {
        $tableDiv.html('<p style="color: #d63638;">RSS URLが設定されていません。</p>');
        return;
    }
    
    var loadedCount = 0;
    var errors = [];
    
    // タイムアウト設定（30秒）
    var timeout = setTimeout(function() {
        if (loadedCount < urlsToLoad.length) {
            console.error('RSS読み込みがタイムアウトしました');
            displayArticlesTable(allArticles);
        }
    }, 30000);
    
    urlsToLoad.forEach(function(item) {
        jQuery.ajax({
            url: ankeAutoCreator.ajax_url,
            type: 'POST',
            timeout: 10000, // 10秒タイムアウト
            data: {
                action: 'anke_auto_creator_fetch_rss',
                nonce: ankeAutoCreator.nonce,
                url: item.url
            },
            success: function(response) {
                console.log('RSS ' + item.index + ' 取得成功:', response);
                if (response.success && response.data.articles) {
                    response.data.articles.forEach(function(article) {
                        article.feed_name = response.data.feed_title || 'RSS ' + item.index;
                        allArticles.push(article);
                    });
                } else {
                    errors.push('RSS ' + item.index + ': ' + (response.data || '取得失敗'));
                }
                loadedCount++;
                
                if (loadedCount === urlsToLoad.length) {
                    clearTimeout(timeout);
                    displayArticlesTable(allArticles, errors);
                }
            },
            error: function(xhr, status, error) {
                console.error('RSS ' + item.index + ' エラー:', status, error);
                errors.push('RSS ' + item.index + ': ' + status);
                loadedCount++;
                
                if (loadedCount === urlsToLoad.length) {
                    clearTimeout(timeout);
                    displayArticlesTable(allArticles, errors);
                }
            }
        });
    });
}

// 記事をテーブル表示
function displayArticlesTable(articles, errors) {
    var $tableDiv = jQuery('#rss_articles_table');
    
    // エラーメッセージ表示
    if (errors && errors.length > 0) {
        var errorHtml = '<div style="background: #fff3cd; border-left: 3px solid #ffc107; padding: 10px; margin-bottom: 15px;">';
        errorHtml += '<strong>⚠️ 一部のRSSで取得エラーが発生しました:</strong><ul style="margin: 5px 0 0 20px;">';
        errors.forEach(function(error) {
            errorHtml += '<li>' + error + '</li>';
        });
        errorHtml += '</ul></div>';
        $tableDiv.html(errorHtml);
    }
    
    if (articles.length === 0) {
        $tableDiv.append('<p style="color: #d63638;">記事が取得できませんでした。ブラウザのコンソールでエラーを確認してください。</p>');
        return;
    }
    
    // タイトル順にソート（昇順）
    articles.sort(function(a, b) {
        return a.title.localeCompare(b.title, 'ja');
    });
    
    var html = '<table class="wp-list-table fixed widefat striped" id="rss-articles-table">';
    html += '<thead><tr>';
    html += '<th style="width: 15%; cursor: pointer;" onclick="sortArticlesTable(0)">フィード名 <span class="dashicons dashicons-sort"></span></th>';
    html += '<th style="width: 35%; cursor: pointer;" onclick="sortArticlesTable(1)">タイトル <span class="dashicons dashicons-sort"></span></th>';
    html += '<th style="width: 15%; cursor: pointer;" onclick="sortArticlesTable(2)">日付 <span class="dashicons dashicons-sort"></span></th>';
    html += '<th style="width: 20%;">WordPress記事</th>';
    html += '<th style="width: 15%;">操作</th>';
    html += '</tr></thead><tbody>';
    
    var articleIndex = 0;
    articles.forEach(function(article) {
        articleIndex++;
        var cellId = 'wp_post_' + articleIndex;
        
        html += '<tr>';
        html += '<td>' + article.feed_name + '</td>';
        html += '<td><a href="' + article.url + '" target="_blank">' + article.title + '</a></td>';
        html += '<td>' + article.date + '</td>';
        html += '<td id="' + cellId + '" data-url="' + article.url + '" data-title="' + article.title.replace(/"/g, '&quot;') + '">確認中...</td>';
        html += '<td><button type="button" class="button button-primary button-small run-single-news" ' +
                'data-article-url="' + article.url + '" ' +
                'data-article-title="' + article.title.replace(/"/g, '&quot;') + '" ' +
                'data-article-content="' + (article.content || '').replace(/"/g, '&quot;') + '" ' +
                'data-article-image="' + (article.image || '').replace(/"/g, '&quot;') + '">' +
                'このニュースで実行</button></td>';
        html += '</tr>';
    });
    
    html += '</tbody></table>';
    
    // エラーがある場合は追加、ない場合は置き換え
    if (errors && errors.length > 0) {
        $tableDiv.append(html);
    } else {
        $tableDiv.html(html);
    }
    
    // WordPress記事の存在確認（順次実行）
    var cells = jQuery('td[data-url]').toArray();
    var currentIndex = 0;
    
    function checkNextPost() {
        if (currentIndex >= cells.length) {
            return; // 全て完了
        }
        
        var $cell = jQuery(cells[currentIndex]);
        var articleUrl = $cell.data('url');
        var articleTitle = $cell.data('title');
        var cellId = $cell.attr('id');
        
        checkWordPressPost(cellId, articleUrl, articleTitle, function() {
            currentIndex++;
            // 次のリクエストを200ms後に実行（サーバー負荷軽減）
            setTimeout(checkNextPost, 200);
        });
    }
    
    checkNextPost(); // 最初のリクエストを開始
}

// WordPress記事の存在確認
function checkWordPressPost(cellId, articleUrl, articleTitle, callback) {
    jQuery.ajax({
        url: ankeAutoCreator.ajax_url,
        type: 'POST',
        timeout: 10000,
        data: {
            action: 'anke_auto_creator_check_processed',
            nonce: ankeAutoCreator.nonce,
            url: articleUrl,
            title: articleTitle || ''
        },
        success: function(response) {
            var $cell = jQuery('#' + cellId);
            if (response.success && response.data.exists) {
                if (response.data.post_url) {
                    $cell.html('<a href="' + response.data.post_url + '" target="_blank" style="color: #2271b1; font-weight: bold;">既存記事を見る</a>');
                } else {
                    $cell.html('<span style="color: #46b450; font-weight: bold;">✓ 作成済み</span>');
                }
            } else {
                $cell.html('<span style="color: #999;">未作成</span>');
            }
            if (callback) callback();
        },
        error: function(xhr, status, error) {
            var $cell = jQuery('#' + cellId);
            $cell.html('<span style="color: #999;">未作成</span>');
            if (callback) callback();
        }
    });
}

// テーブルソート機能
var sortDirection = [1, 1, -1]; // 各カラムのソート方向（1: 昇順, -1: 降順）
var lastSortColumn = 1; // デフォルトはタイトル順

function sortArticlesTable(columnIndex) {
    var table = document.getElementById('rss-articles-table');
    var tbody = table.getElementsByTagName('tbody')[0];
    var rows = Array.from(tbody.getElementsByTagName('tr'));
    
    // ソート方向を切り替え
    if (lastSortColumn === columnIndex) {
        sortDirection[columnIndex] *= -1;
    } else {
        lastSortColumn = columnIndex;
    }
    
    var direction = sortDirection[columnIndex];
    
    // 行をソート
    rows.sort(function(a, b) {
        var aValue = a.getElementsByTagName('td')[columnIndex].textContent.trim();
        var bValue = b.getElementsByTagName('td')[columnIndex].textContent.trim();
        
        // 日付カラムの場合
        if (columnIndex === 2) {
            aValue = new Date(aValue).getTime();
            bValue = new Date(bValue).getTime();
        }
        
        if (aValue < bValue) return -1 * direction;
        if (aValue > bValue) return 1 * direction;
        return 0;
    });
    
    // ソート後の行を再配置
    rows.forEach(function(row) {
        tbody.appendChild(row);
    });
    
    // ソートアイコンを更新
    updateSortIcons(columnIndex, direction);
}

// ソートアイコンを更新
function updateSortIcons(activeColumn, direction) {
    var headers = document.querySelectorAll('#rss-articles-table thead th');
    headers.forEach(function(header, index) {
        var icon = header.querySelector('.dashicons');
        if (icon) {
            if (index === activeColumn) {
                icon.className = direction === 1 ? 'dashicons dashicons-arrow-up-alt2' : 'dashicons dashicons-arrow-down-alt2';
            } else {
                icon.className = 'dashicons dashicons-sort';
            }
        }
    });
}

// ページ読み込み時に全RSS読み込み
jQuery(document).ready(function($) {
    <?php 
    $urls = $settings['urls'] ?? array();
    $has_url = false;
    foreach ($urls as $url) {
        if (!empty($url)) {
            $has_url = true;
            break;
        }
    }
    if ($has_url): 
    ?>
    loadAllRssFeeds();
    <?php endif; ?>
    
    // 手動実行ボタンのクリックイベント
    $(document).on('click', '.run-single-news', function() {
        var $btn = $(this);
        var $result = $('#manual-run-result');
        
        var articleUrl = $btn.data('article-url');
        var articleTitle = $btn.data('article-title');
        var articleContent = $btn.data('article-content');
        var articleImage = $btn.data('article-image');
        
        if (!articleUrl) {
            console.error('記事URLが取得できませんでした');
            return;
        }
        
        $btn.prop('disabled', true).text('実行中...');
        $result.show().html('<span style="color: #999;">このニュースからアンケートを作成中です...</span>');
        
        $.ajax({
            url: ankeAutoCreator.ajax_url,
            type: 'POST',
            data: {
                action: 'anke_auto_creator_run_single',
                nonce: ankeAutoCreator.nonce,
                article_title: articleTitle,
                article_url: articleUrl,
                article_content: articleContent,
                article_image: articleImage
            },
            success: function(response) {
                if (response.success) {
                    var data = response.data;
                    var message = '<span style="color: green;">✓ ' + data.message + '</span>';
                    
                    if (data.post_url) {
                        message += '<br><a href="' + data.post_url + '" target="_blank">作成されたアンケートを見る</a>';
                    }
                    
                    $result.html(message);
                    
                    // 記事一覧を再読み込み
                    setTimeout(function() {
                        loadAllRssFeeds();
                    }, 2000);
                } else {
                    var errorMsg = response.data;
                    if (typeof errorMsg === 'object') {
                        errorMsg = JSON.stringify(errorMsg);
                    }
                    $result.html('<span style="color: red;">✗ ' + errorMsg + '</span>');
                }
            },
            error: function() {
                $result.html('<span style="color: red;">✗ エラーが発生しました</span>');
            },
            complete: function() {
                $btn.prop('disabled', false).text('このニュースで実行');
            }
        });
    });
    
    // 時間と分から合計分数を計算
    function updateIntervalTotal() {
        var hours = parseInt($('#interval_hours').val()) || 0;
        var minutes = parseInt($('#interval_minutes').val()) || 0;
        var totalMinutes = (hours * 60) + minutes;
        
        // 最小10分、最大1440分（24時間）
        if (totalMinutes < 10) {
            totalMinutes = 10;
            $('#interval_hours').val(0);
            $('#interval_minutes').val(10);
        } else if (totalMinutes > 1440) {
            totalMinutes = 1440;
            $('#interval_hours').val(24);
            $('#interval_minutes').val(0);
        }
        
        $('#interval_total').val(totalMinutes);
        toggleBlackoutWarning();
    }
    
    // 基本間隔が30分以上の場合、時間帯制限の警告を表示
    function toggleBlackoutWarning() {
        var intervalMinutes = parseInt($('#interval_total').val()) || 0;
        var $warning = $('input[name="blackout_start"]').closest('td').find('.description').last();
        
        if (intervalMinutes >= 30) { // 30分以上
            $warning.show();
        } else {
            $warning.hide();
        }
    }
    
    // 初期表示
    updateIntervalTotal();
    
    // 基本間隔変更時
    $('#interval_hours, #interval_minutes').on('input change', function() {
        updateIntervalTotal();
    });
});
</script>

<?php endif; // タブ分岐の終了 ?>

</div>
