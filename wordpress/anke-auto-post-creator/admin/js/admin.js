jQuery(document).ready(function($) {
    // 手動実行ボタン
    $('#manual-run-btn').on('click', function() {
        var $btn = $(this);
        var $result = $('#manual-run-result');
        
        $btn.prop('disabled', true).text('実行中...');
        $result.html('<span style="color: #999;">処理中です。しばらくお待ちください...</span>');
        
        $.ajax({
            url: ankeAutoCreator.ajax_url,
            type: 'POST',
            data: {
                action: 'anke_auto_creator_manual_run',
                nonce: ankeAutoCreator.nonce
            },
            success: function(response) {
                if (response.success) {
                    var data = response.data;
                    var message = '<span style="color: green;">✓ ' + data.message + '</span>';
                    
                    if (data.post_url) {
                        message += '<br><a href="' + data.post_url + '" target="_blank">作成されたアンケートを見る</a>';
                    }
                    
                    if (data.article_url) {
                        message += '<br><small>参照元: <a href="' + data.article_url + '" target="_blank">' + data.article_url + '</a></small>';
                    }
                    
                    $result.html(message);
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
                $btn.prop('disabled', false).text('今すぐ実行');
            }
        });
    });

    // 個別ニュースごとの「このニュースで実行」ボタン
    $(document).on('click', '.run-single-news', function() {
        var $btn    = $(this);
        var $item   = $btn.closest('.rss-item');
        var $result = $('#manual-run-result');

        var articleTitle   = $item.data('article-title') || '';
        var articleUrl     = $item.data('article-url') || '';
        var articleContent = $item.data('article-content') || '';
        var articleImage   = $item.data('article-image') || '';

        if (!articleUrl || !articleTitle) {
            alert('記事情報が取得できませんでした');
            return;
        }

        $btn.prop('disabled', true).text('実行中...');
        $result.html('<span style="color: #999;">このニュースからアンケートを作成中です...</span>');

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

                    if (data.article_url) {
                        message += '<br><small>参照元: <a href="' + data.article_url + '" target="_blank">' + data.article_url + '</a></small>';
                    }

                    $result.html(message);
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
});
