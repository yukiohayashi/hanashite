<?php
/**
 * 設定画面
 */

if (!defined('ABSPATH')) {
    exit;
}

// 設定を取得
$settings = get_option('anke_auto_commenter_settings', array());
$enabled = $settings['enabled'] ?? false;
$interval = isset($settings['interval']) && $settings['interval'] > 0 ? $settings['interval'] : 120; // デフォルト120分
$interval_variance = $settings['interval_variance'] ?? 30;
$no_run_start = $settings['no_run_start'] ?? '00:00';
$no_run_end = $settings['no_run_end'] ?? '06:00';
$commenter_mode = $settings['commenter_mode'] ?? 'random';
$fixed_commenter = $settings['fixed_commenter'] ?? 0;
$posts_per_run = $settings['posts_per_run'] ?? 1; // デフォルト1件に変更
$votes_per_run = $settings['votes_per_run'] ?? 3; // 1回の実行で何票入れるか
$votes_variance = $settings['votes_variance'] ?? 2; // 投票数のゆらぎ
$comment_min_length = $settings['comment_min_length'] ?? 10;
$comment_max_length = $settings['comment_max_length'] ?? 60;
$profile_weight = $settings['profile_weight'] ?? 'high';
$content_weight = $settings['content_weight'] ?? 'high';
$mention_other_choices_probability = $settings['mention_other_choices_probability'] ?? 30; // 他の選択肢に言及する確率
$min_votes = $settings['min_votes'] ?? 0; // 最小投票数
$target_categories = $settings['target_categories'] ?? array(); // 対象カテゴリ
$category_vote_ranges = $settings['category_vote_ranges'] ?? array(); // カテゴリごとの投票数範囲
$category_target_days = $settings['category_target_days'] ?? array(); // カテゴリごとの対象期間
$category_filter_logic = $settings['category_filter_logic'] ?? array(); // カテゴリごとのフィルタロジック
$prioritize_recent_posts = $settings['prioritize_recent_posts'] ?? 1; // 新しい記事優先モード
$priority_days = $settings['priority_days'] ?? 3; // 優先する日数

// Ankeカテゴリを取得
global $wpdb;
$anke_categories = $wpdb->get_results("
    SELECT c.id, c.name, c.slug, c.display_order,
           (SELECT COUNT(*) FROM {$wpdb->prefix}anke_post_categories pc WHERE pc.category_id = c.id) as post_count
    FROM {$wpdb->prefix}anke_categories c
    WHERE c.is_active = 1
    ORDER BY c.display_order ASC, c.name ASC
");
// プロンプト設定（デフォルト値）
$default_prompt = 'あなたはネット掲示板の常連ユーザーです。建前より本音、綺麗事より現実を語ります。

質問:「{$question}」

【必須ルール】
1. 具体的な固有名詞を1つ以上含める（番組名、商品名、人名、店名など実在するもの）
2. 断定的で歯切れの良い表現を使う
3. 「まあ」「正直」「普通に」「逆に」などの口語表現を自然に使う
4. 30〜60文字の本音トーク風で書く
5. 個人的な感覚や直感を率直に述べる

【コメント例】
質問: 「好きなテレビ番組は？」
→「水曜日のダウンタウンは普通に面白い」
→「マツコの知らない世界、まあ安定してるよね」
→「正直、最近のバラエティつまらんけど有吉の壁は見れる」

質問: 「好きなお笑い芸人は？」
→「霜降り明星は粗品の方が好き」
→「サンドウィッチマンは安定感あるけど飽きた」
→「逆にママタルトの田辺が気になる」

質問: 「地上波放送終了すべき長寿番組は？」
→「サザエさんはもういいでしょ」
→「笑点、正直マンネリ化してる」
→「いいとも終わったし、次はめちゃイケかな」

質問: 「好きなグルメ雑誌は？」
→「dancyuは写真だけ見てる」
→「オレンジページ、まあ主婦向けだけど使える」
→「正直、今はネットで十分」

質問: 「行きたい旅行先は？」
→「北海道の富良野、普通に行きたい」
→「沖縄は混んでるから石垣島がいい」
→「逆に近場の箱根でいいかも」

【絶対禁止】
・「〜と思います」「〜と感じます」などの丁寧すぎる表現
・教科書的な正論や無難なコメント
・誰もが言いそうな当たり前の意見

上記を参考に、本音で率直なコメントを1つ生成してください。';

$comment_prompt = $settings['comment_prompt'] ?? $default_prompt;

// 返信コメント用プロンプト（デフォルト値）
$default_reply_prompt = '【重要】元のコメントに対して自然な返信を書いてください。

■ 返信対象の優先順位
- ゲスト（非ログインユーザー）のコメントを優先的に返信対象とします（70%の確率）
- ゲストユーザーは投稿のハードルが高いため、返信することでエンゲージメントを高めます
- ログインユーザーへの返信も30%の確率で行います

■ 文字数: 20〜100文字（短めでOK、反論の場合は長めも可）

■ 必ず守ること
- 元のコメントの内容を受けて反応する
- 口語的で自然な日本語
- シンプルで直接的な表現
- 短くても問題ない

■ 返信のパターン（バリエーション重視）
1. 短い共感（30%）- 20〜40文字
   「ほんとそれ！」「わかりすぎる」「同じこと思ってた」「そうそう」
   
2. 同意＋補足（30%）- 40〜80文字
   「わかる。あと〜もあるよね」「そうなんだよね。私も〜」
   「ほんとそれ。うちの場合は〜」
   
3. 異なる視点・軽い反論（25%）- 40〜100文字
   「なるほど。でも〜」「そういう見方もあるね。ただ〜」
   「う〜ん、個人的には〜かな」
   
4. 質問・確認（15%）- 20〜50文字
   「それって〜ってこと？」「〜の場合はどう？」「マジで？」

■ 反論する場合（柔らかく）
- 相手を受け止める: 「そういう見方もあるね」「わかるけど」
- 柔らかい表現: 「個人的には〜かな」「でも〜という面もあるかも」
- 理由を簡潔に: 「なぜなら〜」「〜だから」
- 攻撃的な表現は絶対NG

■ 絶対に避けること
- 「確かに〜ですが」「確かにご指摘の通り」の多用
- 「おっしゃる」「ご意見」など丁寧すぎる表現の連発
- AI特有の堅苦しい言い回し
- 同じパターンの繰り返し
- 長すぎる返信（反論以外）

■ 良い返信例（短め）
- 「ほんとそれ！」（7文字）
- 「わかる〜」（4文字）
- 「そうなんだよね」（8文字）
- 「マジで？」（4文字）

■ 良い返信例（標準）
- 「わかる。あと〜もあるよね」（15文字〜）
- 「なるほどね。でも〜という面もあるかも」（20文字〜）
- 「そういう見方もあるね。ただ個人的には〜」（22文字〜）
- 「それって〜ってこと？だったら〜」（18文字〜）

■ 悪い返信例
- 「確かにご指摘の通りですが、別の視点から考えますと〜」（堅苦しい・長い）
- 「大変参考になりました。今後の検討材料とさせていただきます」（AI臭い）
- 「おっしゃる通りですね。おっしゃる通りだと思います」（丁寧すぎる・繰り返し）';

$reply_prompt = $settings['reply_prompt'] ?? $default_reply_prompt;
$reply_probability = $settings['reply_probability'] ?? 30;
$like_probability = $settings['like_probability'] ?? 40;
$post_like_probability = $settings['post_like_probability'] ?? 50;
$target_days = $settings['target_days'] ?? 3; // 対象記事の日数
$author_reply_probability = $settings['author_reply_probability'] ?? 70; // 記事投稿者の返信確率
$max_comments_per_post = $settings['max_comments_per_post'] ?? 50; // 記事ごとの最大コメント数
$max_comments_variance = $settings['max_comments_variance'] ?? 20; // 最大コメント数のゆらぎ

// OpenAI API設定を共有（アンケ自動作成プラグインから取得）
$creator_settings = get_option('anke_auto_creator_settings', array());
$openai_api_key = $creator_settings['openai_api_key'] ?? '';
$openai_model = $creator_settings['openai_model'] ?? 'gpt-4o-mini';

// 次回実行時刻を計算（最後の自動投稿 + 設定間隔 ± ゆらぎ）
$last_auto_comment = $wpdb->get_var("
    SELECT created_at 
    FROM {$wpdb->prefix}anke_comments 
    WHERE is_auto_generated = 1 
    ORDER BY created_at DESC 
    LIMIT 1
");

if ($last_auto_comment) {
    // WordPressのタイムゾーンで計算
    $timezone = wp_timezone();
    $last_time = new DateTime($last_auto_comment, $timezone);
    $current_time = new DateTime('now', $timezone);
    
    // 基本間隔を使用（ゆらぎは実際の実行時に適用される）
    $interval_seconds = $interval * 60;
    
    // 次回実行時刻を計算
    $next_run_time_obj = clone $last_time;
    $next_run_time_obj->modify('+' . $interval_seconds . ' seconds');
    
    // 過去の時刻になる場合は現在時刻+間隔で表示
    if ($next_run_time_obj < $current_time) {
        $next_run_time_obj = clone $current_time;
        $next_run_time_obj->modify('+' . $interval_seconds . ' seconds');
    }
    
    $next_run = $next_run_time_obj->getTimestamp();
    $next_run_time = $next_run_time_obj->format('Y-m-d H:i:s');
} else {
    $next_run = 0;
    $next_run_time = '未実行（初回は即時実行）';
}

// 編集者リストを取得（キャッシュ付き）
global $wpdb;
$editors_cache_key = 'anke_commenter_editors_list';
$editors = wp_cache_get($editors_cache_key);

if ($editors === false) {
    $editors = $wpdb->get_results("
        SELECT id, user_email, user_nicename 
        FROM {$wpdb->prefix}anke_users 
        WHERE status = 2 
        ORDER BY id ASC
        LIMIT 50
    ");
    wp_cache_set($editors_cache_key, $editors, '', 300); // 5分キャッシュ
}

// デフォルトのテストユーザーID（最初の編集者）
$test_user_id = !empty($editors) ? $editors[0]->id : 0;

// 最新のアンケート記事を取得
// wp_anke_vote_choicesテーブルに投票選択肢があるアンケート記事を探す
$latest_post = $wpdb->get_row("
    SELECT p.ID, p.post_title
    FROM {$wpdb->posts} p
    INNER JOIN {$wpdb->prefix}anke_vote_choices vc ON p.ID = vc.post_id
    WHERE p.post_type = 'post'
    AND p.post_status = 'publish'
    GROUP BY p.ID
    ORDER BY p.post_date DESC
    LIMIT 1
");

// 見つからない場合は、最新の記事を取得（フォールバック）
if (!$latest_post) {
    $latest_post = $wpdb->get_row("
        SELECT ID, post_title
        FROM {$wpdb->posts}
        WHERE post_type = 'post'
        AND post_status = 'publish'
        ORDER BY post_date DESC
        LIMIT 1
    ");
}
?>

<div class="wrap">
    <h1>アンケ自動投票・コメント設定</h1>
    <p class="description" style="font-size: 14px; margin-top: -10px; margin-bottom: 20px;">
        投票・コメント投稿・返信・いいねを自動化します
    </p>
    
    <?php settings_errors('anke_commenter_messages'); ?>
    
    <!-- ステータス表示 -->
    <div style="background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; padding: 12px 15px; margin: 15px 0; display: flex; align-items: center; gap: 25px; flex-wrap: wrap; font-size: 13px;">
        <div style="display: flex; align-items: center; gap: 8px;">
            <span style="color: #28a745; font-size: 16px;">●</span>
            <strong>アンケ自動投票・コメント</strong>
        </div>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px; display: flex; align-items: center; gap: 10px;">
            <strong>自動投稿:</strong> 
            <?php if ($enabled): ?>
                <span style="color: #28a745;">✓ 有効</span>
                <button type="button" id="stop-commenter-btn" class="button" style="background: #dc3545; color: white; border-color: #dc3545; padding: 2px 10px; height: auto; line-height: 1.4; font-size: 12px;">
                    ⏸ 停止
                </button>
            <?php else: ?>
                <span style="color: #dc3545;">✗ 無効</span>
                <button type="button" id="start-commenter-btn" class="button" style="background: #28a745; color: white; border-color: #28a745; padding: 2px 10px; height: auto; line-height: 1.4; font-size: 12px;">
                    ▶ 開始
                </button>
            <?php endif; ?>
        </div>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px;">
            <?php 
            // intervalは既に分単位で保存されている
            $interval_minutes = intval($interval);
            $min_minutes = $interval_minutes - intval($interval_variance);
            $max_minutes = $interval_minutes + intval($interval_variance);
            ?>
            <strong>間隔:</strong> <?php echo $interval_minutes; ?>分 ± <?php echo esc_html($interval_variance); ?>分 <span style="color: #666; font-size: 11px;">(<?php echo $min_minutes; ?>〜<?php echo $max_minutes; ?>分)</span>
        </div>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px;">
            <strong>記事数:</strong> <?php echo esc_html($posts_per_run); ?>件/回
        </div>
        <?php if ($enabled && $next_run): ?>
        <div style="border-left: 1px solid #dee2e6; padding-left: 20px;">
            <strong>次回:</strong> <?php echo esc_html(wp_date('m/d H:i', $next_run)); ?>
        </div>
        <?php endif; ?>
    </div>
    
    <?php if (empty($openai_api_key)): ?>
    <div style="background: #fff3cd; border-left: 3px solid #ffc107; padding: 8px 12px; margin: 10px 0; font-size: 12px; color: #856404;">
        ⚠️ OpenAI API Keyが設定されていません。<a href="<?php echo admin_url('admin.php?page=anke-auto-creator&tab=openai'); ?>">アンケ自動作成プラグイン</a>で設定してください。
    </div>
    <?php endif; ?>
    
    <!-- デバッグ情報 -->
    <div style="background: #e7f3ff; border: 1px solid #b6d4fe; border-radius: 4px; padding: 12px 15px; margin: 15px 0; font-size: 12px;">
        <strong>🔍 デバッグ情報:</strong>
        <?php
        // 最後の自動コメントを取得
        $last_auto_comment = $wpdb->get_row("
            SELECT id, post_id, user_id, created_at 
            FROM {$wpdb->prefix}anke_comments 
            WHERE is_auto_generated = 1 
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        
        // is_auto_generatedカラムの存在確認
        $column_exists = $wpdb->get_var("
            SELECT COUNT(*) 
            FROM INFORMATION_SCHEMA.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = '{$wpdb->prefix}anke_comments' 
            AND COLUMN_NAME = 'is_auto_generated'
        ");
        
        // 自動コメント総数
        $auto_comment_count = $wpdb->get_var("SELECT COUNT(*) FROM {$wpdb->prefix}anke_comments WHERE is_auto_generated = 1");
        ?>
        <ul style="margin: 8px 0 0 20px; padding: 0;">
            <li>CRONスケジュール: <?php echo $next_run ? '<span style="color:green;">✓ 登録済み (' . wp_date('Y-m-d H:i:s', $next_run) . ')</span>' : '<span style="color:red;">✗ 未登録</span>'; ?></li>
            <li>is_auto_generatedカラム: <?php echo $column_exists ? '<span style="color:green;">✓ 存在</span>' : '<span style="color:red;">✗ 不存在</span>'; ?></li>
            <li>自動コメント総数: <?php echo intval($auto_comment_count); ?>件</li>
            <li>最後の自動コメント: <?php echo $last_auto_comment ? $last_auto_comment->created_at . ' (ID: ' . $last_auto_comment->id . ')' : 'なし'; ?></li>
            <li>現在時刻: <?php echo current_time('Y-m-d H:i:s'); ?></li>
            <li>実行しない時間帯: <?php echo esc_html($no_run_start); ?> - <?php echo esc_html($no_run_end); ?></li>
        </ul>
    </div>
    
    <!-- OpenAI API設定（共有） -->
    <div class="card" style="max-width: none;">
        <h2>OpenAI API設定（共有）</h2>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label>OpenAI APIキー</label>
                </th>
                <td>
                    <?php if (!empty($openai_api_key)): ?>
                        <span style="color: green;">✓ 設定済み</span>
                        <code><?php echo esc_html(substr($openai_api_key, 0, 20)); ?>...</code>
                    <?php else: ?>
                        <span style="color: red;">✗ 未設定</span>
                    <?php endif; ?>
                    <p class="description">
                        <a href="<?php echo admin_url('admin.php?page=anke-auto-creator&tab=openai'); ?>">アンケ自動作成プラグイン</a>で設定されたAPIキーを共有使用します
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label>OpenAI モデル</label>
                </th>
                <td>
                    <?php if (!empty($openai_model)): ?>
                        <strong><?php echo esc_html($openai_model); ?></strong>
                    <?php else: ?>
                        <span style="color: red;">未設定</span>
                    <?php endif; ?>
                    <p class="description">
                        <a href="<?php echo admin_url('admin.php?page=anke-auto-creator&tab=openai'); ?>">アンケ自動作成プラグイン</a>で設定されたモデルを共有使用します
                    </p>
                </td>
            </tr>
        </table>
    </div>
    
    <form id="anke-commenter-settings-form" method="post" action="">
        <?php wp_nonce_field('anke_commenter_settings', 'anke_commenter_nonce'); ?>
        <input type="hidden" id="enabled-input" name="enabled" value="<?php echo $enabled ? '1' : '0'; ?>">
        
       
        
        <h2 style="margin-top: 15px; padding-bottom: 8px; border-bottom: 1px solid #ccc;">実行間隔設定</h2>
        <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="interval">基本間隔</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="interval" 
                               name="interval" 
                               value="<?php echo esc_attr($interval); ?>" 
                               min="1" 
                               max="1440" 
                               step="1"
                               class="small-text"> 分
                        <p class="description">
                            コメント投稿の基本間隔（推奨: 120〜240分 = 2〜4時間）
                            <strong style="color: #d63638;">※ 短すぎる間隔は不自然なコメント投稿になる可能性があります</strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="interval_variance">ゆらぎ</label>
                    </th>
                    <td>
                        ±<input type="number" 
                               id="interval_variance" 
                               name="interval_variance" 
                               value="<?php echo esc_attr($interval_variance); ?>" 
                               min="0" 
                               max="120" 
                               class="small-text"> 分　※                    
                            実行時刻のランダムなゆらぎ（同じ時刻に実行しないため）
                       
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label>実行しない時間帯</label>
                    </th>
                    <td>
                        <input type="time" 
                               name="no_run_start" 
                               value="<?php echo esc_attr($no_run_start); ?>"> 
                        ～ 
                        <input type="time" 
                               name="no_run_end" 
                               value="<?php echo esc_attr($no_run_end); ?>">
                        
                            この時間帯はコメントを投稿しません（例: 深夜0時～6時）
                       
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="posts_per_run">1回の処理件数</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="posts_per_run" 
                               name="posts_per_run" 
                               value="<?php echo esc_attr($posts_per_run); ?>" 
                               min="1" 
                               max="10" 
                               class="small-text"> 件
                        <p class="description">
                            1回の実行で処理するアンケート記事の件数（1〜10件）　
                            <strong style="color: #d63638;">※ 推奨: 1件（複数件だと同時刻に複数コメントが投稿され不自然になる可能性があります）</strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="votes_per_run">1記事あたりの投票数</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="votes_per_run" 
                               name="votes_per_run" 
                               value="<?php echo esc_attr($votes_per_run); ?>" 
                               min="1" 
                               max="20" 
                               class="small-text"> 票                        
                            1つのアンケート記事に対して何票投票するか（基準値）                            推奨: 3〜5票
                        
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="votes_variance">投票数のゆらぎ</label>
                    </th>
                    <td>
                        ± <input type="number" 
                               id="votes_variance" 
                               name="votes_variance" 
                               value="<?php echo esc_attr($votes_variance); ?>" 
                               min="0" 
                               max="10" 
                               class="small-text"> 票
                        
                            投票数のランダムなゆらぎ幅  
                            例: 基準値3票、ゆらぎ±2票 → 実際の投票数は1〜5票の間でランダム                            推奨: 1〜3票
                     
                    </td>
                </tr>
            </table>
        
        <!-- 対象記事の設定 -->
        <h2 style="margin-top: 15px; padding-bottom: 8px; border-bottom: 1px solid #ccc;">対象記事の設定</h2>
        <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="prioritize_recent_posts">新しい記事優先モード</label>
                    </th>
                    <td>
                        <label>
                            <input type="checkbox" 
                                   id="prioritize_recent_posts" 
                                   name="prioritize_recent_posts" 
                                   value="1" 
                                   <?php checked($prioritize_recent_posts, 1); ?>>
                            有効にする
                        </label>
                        <p class="description">
                            <strong>有効時：</strong> 投稿から<input type="number" 
                                   name="priority_days" 
                                   value="<?php echo esc_attr($priority_days); ?>" 
                                   min="1" 
                                   max="30"
                                   style="width: 60px;"> 日以内の記事の選択確率を 
                            <input type="number" 
                                   name="priority_weight" 
                                   value="<?php echo esc_attr($settings['priority_weight'] ?? 5); ?>" 
                                   min="1" 
                                   max="10"
                                   style="width: 50px;"> 倍にします（段階的重み付け）<br>
                            <strong>重み付けの仕組み：</strong><br>
                            • 今日の記事（24時間以内）：基準倍率 × 2<br>
                            • 昨日の記事（24-48時間）：基準倍率 × 1.5<br>
                            • 設定日数以内の記事：基準倍率<br>
                            • それ以上古い記事：×1（通常）<br>
                            <em>例：基準倍率5倍の場合、今日=×10、昨日=×7、3日以内=×5、古い記事=×1</em><br>
                            <strong style="color: #d63638;">※ 推奨：有効、3日、5倍（今日 > 昨日 > 3日前の順で優先され、古い記事にもコメントがつきます）</strong>
                        </p>
                    </td>
                </tr>
                <tr>
                    <th scope="row">
                        <label>対象カテゴリ</label>
                    </th>
                    <td>
                        <fieldset>
                            <legend class="screen-reader-text"><span>対象カテゴリ</span></legend>
                            <?php if (!empty($anke_categories)): ?>
                                    <table class="widefat" style="border-collapse: collapse;">
                                        <thead>
                                            <tr>
                                                <th style="width: 30px; padding: 8px;">選択</th>
                                                <th style="padding: 8px;">カテゴリ名</th>
                                                <th style="width: 150px; padding: 8px;">対象期間</th>
                                                <th style="width: 80px; padding: 8px;">条件</th>
                                                <th style="width: 150px; padding: 8px;">最小投票数</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <?php foreach ($anke_categories as $category): 
                                                $cat_id = $category->id;
                                                $is_checked = in_array($cat_id, $target_categories);
                                                $target_days_cat = isset($category_target_days[$cat_id]) ? $category_target_days[$cat_id] : 3;
                                                $min_votes_cat = isset($category_vote_ranges[$cat_id]['min']) ? $category_vote_ranges[$cat_id]['min'] : 0;
                                                $filter_logic_cat = isset($category_filter_logic[$cat_id]) ? $category_filter_logic[$cat_id] : 'and';
                                            ?>
                                                <tr>
                                                    <td style="padding: 6px 8px;">
                                                        <input type="checkbox" 
                                                               name="target_categories[]" 
                                                               value="<?php echo esc_attr($cat_id); ?>"
                                                               <?php echo $is_checked ? 'checked' : ''; ?>>
                                                    </td>
                                                    <td style="padding: 6px 8px;">
                                                        <strong><?php echo esc_html($category->name); ?></strong>
                                                        <span style="color: #666; font-size: 11px;">(<?php echo intval($category->post_count); ?>件)</span>
                                                    </td>
                                                    <td style="padding: 6px 8px;">
                                                        過去 <input type="number" 
                                                               name="category_target_days[<?php echo esc_attr($cat_id); ?>]" 
                                                               value="<?php echo esc_attr($target_days_cat); ?>" 
                                                               min="1" 
                                                               style="width: 60px;"> 日間
                                                    </td>
                                                    <td style="padding: 6px 8px; text-align: center;">
                                                        <select name="category_filter_logic[<?php echo esc_attr($cat_id); ?>]" style="width: 70px;">
                                                            <option value="and" <?php selected($filter_logic_cat, 'and'); ?>>AND</option>
                                                            <option value="or" <?php selected($filter_logic_cat, 'or'); ?>>OR</option>
                                                        </select>
                                                    </td>
                                                    <td style="padding: 6px 8px;">
                                                        <input type="number" 
                                                               name="category_vote_ranges[<?php echo esc_attr($cat_id); ?>][min]" 
                                                               value="<?php echo esc_attr($min_votes_cat); ?>" 
                                                               min="0" 
                                                               style="width: 70px;"> 票以上
                                                    </td>
                                                </tr>
                                            <?php endforeach; ?>
                                        </tbody>
                                    </table>
                                <p class="description">
                                    チェックしたカテゴリの記事のみコメント対象になります<br>
                                    <strong>AND:</strong> 期間内かつ最小投票数以上の記事のみ対象<br>
                                    <strong>OR:</strong> 期間内または最小投票数以上の記事を対象（古い記事でも投票数が多ければ対象）
                                </p>
                            <?php else: ?>
                                <p>カテゴリが見つかりません</p>
                            <?php endif; ?>
                        </fieldset>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="max_comments_per_post">記事ごとの最大コメント数</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="max_comments_per_post" 
                               name="max_comments_per_post" 
                               value="<?php echo esc_attr($max_comments_per_post); ?>" 
                               min="10" 
                               max="200" 
                               class="small-text"> 件
                        ± <input type="number" 
                               id="max_comments_variance" 
                               name="max_comments_variance" 
                               value="<?php echo esc_attr($max_comments_variance); ?>" 
                               min="0" 
                               max="50" 
                               class="small-text"> 件（ゆらぎ）
                        <p class="description">
                            1つの記事に投稿できる最大コメント数（推奨: 50件 ± 20件）<br>
                            ゆらぎを設定することで、記事ごとに異なるコメント数になり自然になります。<br>
                            例: 50件 ± 20件 = 30〜70件の範囲でランダムに決定<br>
                            <strong>※ この上限に達した記事は自動的にスキップされます</strong>
                        </p>
                    </td>
                </tr>
            </table>
        
        <!-- コメント投稿者設定 -->
        <h2 style="margin-top: 15px; padding-bottom: 8px; border-bottom: 1px solid #ccc;">コメント投稿者設定</h2>
            <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="ai_member_probability">AI会員の使用確率</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="ai_member_probability" 
                               name="ai_member_probability" 
                               value="<?php echo esc_attr($settings['ai_member_probability'] ?? 70); ?>" 
                               min="0" 
                               max="100" 
                               class="small-text"> %
                        <p class="description">
                            コメント投稿者としてAI会員（status=6）を使用する確率を設定します。<br>
                            残りの確率で編集者（status=2）が使用されます。<br>
                            例: 70%の場合、70%がAI会員、30%が編集者
                        </p>
                    </td>
                </tr>
            </table>
        
        <!-- コメント生成設定 -->
        <h2 style="margin-top: 15px; padding-bottom: 8px; border-bottom: 1px solid #ccc;">コメント生成設定</h2>
        <table class="form-table">
                <tr>
                    <th scope="row">
                        <label for="comment_min_length">コメント文字数</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="comment_min_length" 
                               name="comment_min_length" 
                               value="<?php echo esc_attr($comment_min_length); ?>" 
                               min="20" 
                               max="200" 
                               class="small-text"> 文字
                        ～
                        <input type="number" 
                               id="comment_max_length" 
                               name="comment_max_length" 
                               value="<?php echo esc_attr($comment_max_length); ?>" 
                               min="50" 
                               max="300" 
                               class="small-text"> 文字
                        <p class="description">
                            生成するコメントの文字数範囲（推奨: 50〜150文字）
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="profile_weight">プロフィール考慮度</label>
                    </th>
                    <td>
                        <select id="profile_weight" name="profile_weight">
                            <option value="high" <?php selected($profile_weight, 'high'); ?>>高（プロフィールを強く反映）</option>
                            <option value="medium" <?php selected($profile_weight, 'medium'); ?>>中（バランス型）</option>
                            <option value="low" <?php selected($profile_weight, 'low'); ?>>低（一般的なコメント）</option>
                        </select>
                        <p class="description">
                            ユーザーのプロフィール（年齢、性別、職業、家族構成など）をコメントにどの程度反映させるか
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="content_weight">記事内容考慮度</label>
                    </th>
                    <td>
                        <select id="content_weight" name="content_weight">
                            <option value="high" <?php selected($content_weight, 'high'); ?>>高（記事内容を詳しく言及）</option>
                            <option value="medium" <?php selected($content_weight, 'medium'); ?>>中（バランス型）</option>
                            <option value="low" <?php selected($content_weight, 'low'); ?>>低（投票理由のみ）</option>
                        </select>
                        <p class="description">
                            アンケートのタイトル、本文、選択肢をコメントにどの程度反映させるか
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="mention_other_choices_probability">コメント多様性</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="mention_other_choices_probability" 
                               name="mention_other_choices_probability" 
                               value="<?php echo esc_attr($mention_other_choices_probability); ?>" 
                               min="0" 
                               max="100" 
                               class="small-text"> %
                        <p class="description">
                            他の選択肢にも言及して多様な視点を示す確率（0-100%）<br>
                            <strong>例:</strong> 30%に設定すると、30%の確率で投票していない選択肢についても言及します<br>
                            <strong>効果:</strong> 「ママタルト」や「真空ジェシカ」だけでなく、他の選択肢についてもコメントが生成されるようになります
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="comment_prompt">コメント生成プロンプト</label>
                    </th>
                    <td>
                        <textarea id="comment_prompt" 
                                  name="comment_prompt" 
                                  rows="20" 
                                  style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea($comment_prompt); ?></textarea>
                        <p class="description">
                            OpenAI APIに送信するプロンプトを編集できます。<br>
                            このプロンプトがコメント生成の品質を決定します。<br>
                            <button type="button" id="reset-prompt-btn" class="button" style="margin-top: 5px;">デフォルトに戻す</button>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="reply_prompt">返信コメント生成プロンプト</label>
                    </th>
                    <td>
                        <textarea id="reply_prompt" 
                                  name="reply_prompt" 
                                  rows="15" 
                                  style="width: 100%; font-family: monospace; font-size: 13px;"><?php echo esc_textarea($reply_prompt); ?></textarea>
                        <p class="description">
                            返信コメント生成用のプロンプトを編集できます。<br>
                            <button type="button" id="reset-reply-prompt-btn" class="button" style="margin-top: 5px;">デフォルトに戻す</button>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="reply_probability">返信コメント確率</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="reply_probability" 
                               name="reply_probability" 
                               value="<?php echo esc_attr($reply_probability ?? 30); ?>" 
                               min="0" 
                               max="100" 
                               class="small-text"> %
                        <p class="description">
                            既存のコメントに返信する確率（0〜100%）。推奨: 20〜40%<br>
                            0%の場合は常に新規コメント、100%の場合は常に返信コメントになります。<br>
                            <strong>※ 返信する場合、誰が返信するかは「記事投稿者の返信確率」で決定されます</strong>
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="like_probability">コメントいいね確率</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="like_probability" 
                               name="like_probability" 
                               value="<?php echo esc_attr($like_probability ?? 40); ?>" 
                               min="0" 
                               max="100" 
                               step="10"
                               class="small-text"> %
                        <p class="description">
                            コメント投稿後、既存のコメントにいいねする確率（0〜100%）。推奨: 30〜50%<br>
                            0%の場合はいいねしない、100%の場合は必ずいいねします。
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="post_like_probability">記事いいね確率</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="post_like_probability" 
                               name="post_like_probability" 
                               value="<?php echo esc_attr($post_like_probability ?? 50); ?>" 
                               min="0" 
                               max="100" 
                               step="10"
                               class="small-text"> %
                        <p class="description">
                            コメント投稿後、記事にいいねする確率（0〜100%）。推奨: 40〜60%<br>
                            0%の場合はいいねしない、100%の場合は必ずいいねします。
                        </p>
                    </td>
                </tr>
                
                <tr>
                    <th scope="row">
                        <label for="author_reply_probability">記事投稿者の返信確率</label>
                    </th>
                    <td>
                        <input type="number" 
                               id="author_reply_probability" 
                               name="author_reply_probability" 
                               value="<?php echo esc_attr($author_reply_probability ?? 70); ?>" 
                               min="0" 
                               max="100" 
                               step="10"
                               class="small-text"> %
                        <p class="description">
                            <strong>【返信コメント投稿時のみ有効】</strong>返信する場合、記事の投稿者が返信する確率（0〜100%、10%刻み）。推奨: 60〜80%<br>
                            記事の投稿者が自分の記事のコメントに返信するのは自然な行動です。<br>
                            0%の場合は通常のランダム選択、100%の場合は必ず記事投稿者が返信します。<br>
                            <strong>※ 新規コメント投稿時には適用されません</strong>
                        </p>
                    </td>
                </tr>
            </table>
        
        <p class="submit">
            <input type="submit" 
                   name="anke_commenter_save" 
                   class="button button-primary" 
                   value="設定を保存">
        </p>
    </form>
</div>

<script>
jQuery(document).ready(function($) {
    // 開始ボタン
    $(document).on('click', '#start-commenter-btn', function() {
        console.log('開始ボタンがクリックされました');
        var $button = $(this);
        $button.prop('disabled', true).text('開始中...');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'anke_commenter_toggle',
                enabled: '1',
                nonce: '<?php echo wp_create_nonce('anke_commenter_toggle'); ?>'
            },
            success: function(response) {
                console.log('開始成功:', response);
                location.reload();
            },
            error: function(xhr, status, error) {
                console.log('開始エラー:', error);
                alert('開始に失敗しました: ' + error);
                $button.prop('disabled', false).text('▶ 開始');
            }
        });
    });
    
    // 停止ボタン
    $(document).on('click', '#stop-commenter-btn', function() {
        console.log('停止ボタンがクリックされました');
        var $button = $(this);
        $button.prop('disabled', true).text('停止中...');
        
        $.ajax({
            url: ajaxurl,
            type: 'POST',
            data: {
                action: 'anke_commenter_toggle',
                enabled: '0',
                nonce: '<?php echo wp_create_nonce('anke_commenter_toggle'); ?>'
            },
            success: function(response) {
                console.log('停止成功:', response);
                location.reload();
            },
            error: function(xhr, status, error) {
                console.log('停止エラー - status:', status);
                console.log('停止エラー - error:', error);
                console.log('停止エラー - xhr:', xhr);
                console.log('停止エラー - responseText:', xhr.responseText);
                alert('停止に失敗しました: ' + (xhr.responseText || error));
                $button.prop('disabled', false).text('⏸ 停止');
            }
        });
    });
    
    // プロンプトリセットボタン
    $('#reset-prompt-btn').on('click', function() {
        if (confirm('プロンプトをデフォルトに戻しますか？')) {
            const defaultPrompt = <?php echo json_encode($default_prompt); ?>;
            $('#comment_prompt').val(defaultPrompt);
        }
    });
    
    // 返信プロンプトリセットボタン
    $('#reset-reply-prompt-btn').on('click', function() {
        if (confirm('返信プロンプトをデフォルトに戻しますか？')) {
            const defaultReplyPrompt = <?php echo json_encode($default_reply_prompt); ?>;
            $('#reply_prompt').val(defaultReplyPrompt);
        }
    });
});
</script>

<style>
.card {
    background: #fff;
    border: 1px solid #ccd0d4;
    box-shadow: 0 1px 1px rgba(0,0,0,.04);
    margin: 20px 0;
    padding: 20px;
}

.card h2 {
    margin-top: 0;
    padding-bottom: 10px;
    border-bottom: 1px solid #eee;
}

.form-table th {
    width: 200px;
}
</style>
