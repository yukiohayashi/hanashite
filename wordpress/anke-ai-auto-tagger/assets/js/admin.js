jQuery(document).ready(function($) {
    // 一括タグ付けボタン
    $('#anke-bulk-tag-btn').on('click', function() {
        if (!confirm('すべての投稿に対してAIタグ付けを実行しますか？\nこの処理には時間がかかる場合があります。')) {
            return;
        }
        
        var $btn = $(this);
        var $progress = $('#anke-bulk-tag-progress');
        var $result = $('#anke-bulk-tag-result');
        var $bar = $('#anke-bulk-tag-bar');
        var $current = $('#anke-bulk-tag-current');
        var $total = $('#anke-bulk-tag-total');
        
        $btn.prop('disabled', true);
        $progress.show();
        $result.html('');
        
        // まず投稿IDのリストを取得
        $.ajax({
            url: ajaxurl,
            method: 'POST',
            data: {
                action: 'anke_ai_get_post_ids',
                nonce: ankeAiTagger.nonce
            },
            success: function(response) {
                if (response.success && response.data.post_ids) {
                    var postIds = response.data.post_ids;
                    var total = postIds.length;
                    var current = 0;
                    var results = [];
                    
                    $total.text(total);
                    
                    // 順番に処理
                    function processNext() {
                        if (current >= total) {
                            // 完了
                            $btn.prop('disabled', false);
                            $result.html('<p style="color:green;">完了しました！ ' + results.length + '件の投稿を処理しました。</p>');
                            return;
                        }
                        
                        var postId = postIds[current];
                        
                        $.ajax({
                            url: ankeAiTagger.restUrl + '/tag-post/' + postId,
                            method: 'POST',
                            beforeSend: function(xhr) {
                                xhr.setRequestHeader('X-WP-Nonce', ankeAiTagger.nonce);
                            },
                            success: function(response) {
                                current++;
                                $current.text(current);
                                $bar.val((current / total) * 100);
                                results.push({id: postId, success: true});
                                processNext();
                            },
                            error: function() {
                                current++;
                                $current.text(current);
                                $bar.val((current / total) * 100);
                                results.push({id: postId, success: false});
                                processNext();
                            }
                        });
                    }
                    
                    processNext();
                } else {
                    $btn.prop('disabled', false);
                    $result.html('<p style="color:red;">エラー: 投稿の取得に失敗しました</p>');
                }
            },
            error: function() {
                $btn.prop('disabled', false);
                $result.html('<p style="color:red;">エラー: 投稿の取得に失敗しました</p>');
            }
        });
    });
});

// 投稿IDを取得するAJAXハンドラー（PHP側で実装が必要）
