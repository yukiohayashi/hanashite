jQuery(document).ready(function($) {
    // タグ付けボタン
    $('.anke-ai-tag-btn, .anke-ai-retag-btn').on('click', function() {
        var $btn = $(this);
        var postId = $btn.data('post-id');
        var $status = $('.anke-ai-tagger-status');
        var $message = $('.anke-ai-tagger-message');
        
        $btn.prop('disabled', true);
        $status.show().removeClass('success error');
        $message.text('処理中...');
        
        $.ajax({
            url: ankeAiTagger.restUrl + '/tag-post/' + postId,
            method: 'POST',
            beforeSend: function(xhr) {
                xhr.setRequestHeader('X-WP-Nonce', ankeAiTagger.nonce);
            },
            success: function(response) {
                $btn.prop('disabled', false);
                $status.addClass('success');
                $message.text('タグ付けが完了しました。ページをリロードして結果を確認してください。');
                
                // 3秒後にリロード
                setTimeout(function() {
                    location.reload();
                }, 3000);
            },
            error: function(xhr) {
                $btn.prop('disabled', false);
                $status.addClass('error');
                
                var errorMessage = 'エラーが発生しました';
                if (xhr.responseJSON && xhr.responseJSON.message) {
                    errorMessage = xhr.responseJSON.message;
                }
                
                $message.text(errorMessage);
            }
        });
    });
});
