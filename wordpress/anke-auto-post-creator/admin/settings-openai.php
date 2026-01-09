<?php
/**
 * OpenAI API設定画面
 */

if (!defined('ABSPATH')) {
    exit;
}

// 設定を取得
$settings = get_option('anke_auto_creator_settings', array());
$openai_api_key = $settings['openai_api_key'] ?? '';
$openai_model = $settings['openai_model'] ?? 'gpt-4o-mini';
$max_keywords = $settings['max_keywords'] ?? 5;
$max_categories = $settings['max_categories'] ?? 3;

// デフォルトプロンプト
$default_title_prompt = '記事の内容に基づいた簡潔なアンケート質問を1つ作成してください。

【絶対禁止ワード】
以下の表現は絶対に使用しないでください：
❌ 「どう思いますか」
❌ 「どのように感じますか」
❌ 「どう感じますか」
❌ 「どのように思いますか」
❌ 「どう考えますか」

【必須条件】
- 30文字以内の簡潔な質問
- 記事の核心を捉えた質問
- 具体的な固有名詞や場所、出来事を含める
- 「この事件」「この問題」など曖昧な指示語は使わない
- 下記の質問形式から1つ選択

【絶対禁止ワード（これらを含む質問は不合格）】
❌ 「どう思いますか」「どう感じますか」「どのように思いますか」「どのように感じますか」
❌ 「どうですか」「いかがですか」「どう考えますか」
→ これらの表現は絶対に使用禁止。必ず下記の推奨形式を使用すること。

【推奨質問形式（記事内容に応じて選択）】
■ 賛否を問う
「〜に賛成ですか？」「〜を支持しますか？」「〜は必要ですか？」

■ 評価を問う
「〜を評価しますか？」「〜は適切ですか？」「〜は妥当ですか？」

■ 意向を問う
「〜に参加したいですか？」「〜を利用したいですか？」「〜に興味がありますか？」

■ 期待を問う
「〜に期待しますか？」「〜を期待していますか？」

■ 経験を問う
「〜を知っていますか？」「〜を観たことがありますか？」「〜を経験しましたか？」

■ 見解を問う
「〜をどう見ますか？」「〜をどう受け止めますか？」

【良い例】
✅ 「川口春奈のCM起用を評価しますか？」（簡潔・評価）
✅ 「NiziUへの誹謗中傷対策は必要ですか？」（簡潔・賛否）
✅ 「爆笑問題の漫才を観たことがありますか？」（簡潔・経験）

【悪い例】
❌ 「川口春奈のCM起用についてどう思いますか？」（禁止ワード）
❌ 「NiziUへの誹謗中傷についてどのように感じますか？」（禁止ワード）
❌ 「この事件について、どのように感じましたか？」（曖昧な指示語）
❌ 「この問題をどう見ますか？」（曖昧な指示語）
❌ 「このニュースに驚きましたか？」（曖昧な指示語）

【出力】
質問文のみを出力。説明不要。';

$default_choices_prompt = '質問に対する選択肢を2〜4個作成してください。

【要件】
- シンプルで明確な選択肢
- 回りくどい表現は避ける
- バランスの取れた選択肢（賛成/反対/中立など）
- 各選択肢は20文字以内

【トピック別の選択肢ガイドライン】

■ タレント・芸能人の結婚・恋愛・離婚関連
記事がタレント、芸能人、有名人の結婚、再婚、恋愛、交際、離婚に関する場合：
- 必ず「祝福する」「応援する」などの肯定的選択肢を含める
- 必ず「複雑な気持ち」「驚いた」などの中立的選択肢も含める
- ファンの多様な感情を反映する
- 強い否定表現（「反対」「残念」「批判的」など）は避ける

【良い例】
- 「祝福する」「複雑な気持ち」「驚いた」
- 「応援したい」「少し驚いた」「どちらでもない」
- 「おめでとう」「特に感想はない」「興味ない」

■ 一般的なトピック
- 「賛成」「反対」「どちらでもない」
- 「期待している」「不安がある」「興味がない」
- 「改善すべき」「現状維持」「わからない」

【悪い例】
- 「非常に素晴らしいと思う」（大げさ）
- 「慎重な対応が求められると考える」（回りくどい）
- 「複雑な問題なので一概には言えない」（長すぎる）
- 結婚・恋愛関連で肯定的選択肢のみ（バランスが悪い）';

$title_prompt = $settings['title_prompt'] ?? $default_title_prompt;
$choices_prompt = $settings['choices_prompt'] ?? $default_choices_prompt;
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
    <h2>OpenAI API設定</h2>
    
    <div style="background: #e7f3ff; border-left: 4px solid #0073aa; padding: 12px 15px; margin: 15px 0; font-size: 13px;">
        <strong>📌 この設定は、RSS設定とYahoo!トレンド設定の両方で共有されます。</strong>
    </div>
    
    <form method="post" action="">
        <?php wp_nonce_field('anke_openai_settings', 'anke_openai_nonce'); ?>
        
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="openai_api_key">API Key</label>
                </th>
                <td>
                    <input type="password" 
                           id="openai_api_key"
                           name="openai_api_key" 
                           value="<?php echo esc_attr($openai_api_key); ?>" 
                           class="regular-text" 
                           placeholder="sk-...">
                    <p class="description">
                        ChatGPT APIキーを入力してください（<a href="https://platform.openai.com/api-keys" target="_blank">取得はこちら</a>）
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="openai_model">OpenAI モデル</label>
                </th>
                <td>
                    <select id="openai_model" name="openai_model">
                        <option value="gpt-4o-mini" <?php selected($openai_model, 'gpt-4o-mini'); ?>>GPT-4o Mini（推奨・低コスト）</option>
                        <option value="gpt-4o" <?php selected($openai_model, 'gpt-4o'); ?>>GPT-4o（高性能）</option>
                        <option value="gpt-4-turbo" <?php selected($openai_model, 'gpt-4-turbo'); ?>>GPT-4 Turbo</option>
                        <option value="gpt-3.5-turbo" <?php selected($openai_model, 'gpt-3.5-turbo'); ?>>GPT-3.5 Turbo（最低コスト）</option>
                    </select>
                    <p class="description">
                        推奨: GPT-4o Mini（高精度・低コスト）<br>
                        コスト: GPT-4o Mini: $0.15/1M入力トークン、GPT-4o: $2.50/1M入力トークン、GPT-4 Turbo: $10/1M入力トークン、GPT-3.5 Turbo: $0.50/1M入力トークン
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="max_keywords">最大キーワード数</label>
                </th>
                <td>
                    <input type="number" 
                           id="max_keywords"
                           name="max_keywords" 
                           value="<?php echo esc_attr($max_keywords); ?>" 
                           min="1" 
                           max="20"
                           class="small-text"> 個
                    <p class="description">
                        1投稿あたりの最大キーワード数（手動投稿と同じルール）
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="max_categories">最大カテゴリ数</label>
                </th>
                <td>
                    <input type="number" 
                           id="max_categories"
                           name="max_categories" 
                           value="<?php echo esc_attr($max_categories); ?>" 
                           min="1" 
                           max="10"
                           class="small-text"> 個
                    <p class="description">
                        1投稿あたりの最大カテゴリ数
                    </p>
                </td>
            </tr>
        </table>
        
        <h3>質問者設定</h3>
        <table class="form-table">
            <tr>
                <th scope="row">
                    <label for="ai_member_probability">AI会員の使用確率</label>
                </th>
                <td>
                    <input type="hidden" name="questioner_mode" value="random">
                    <input type="number" 
                           id="ai_member_probability" 
                           name="ai_member_probability" 
                           value="<?php echo esc_attr($settings['ai_member_probability'] ?? 70); ?>" 
                           min="0" 
                           max="100" 
                           class="small-text"> %
                    <p class="description">
                        質問者としてAI会員（status=6）を使用する確率を設定します。<br>
                        残りの確率で編集者（status=2）が使用されます。<br>
                        例: 70%の場合、70%がAI会員、30%が編集者<br>
                        <strong>※ 自動投稿はstatus=2（編集者）またはstatus=6（AI会員）のみ使用されます</strong>
                    </p>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="title_prompt">タイトル生成プロンプト</label>
                </th>
                <td>
                    <textarea id="title_prompt" 
                              name="title_prompt" 
                              rows="8" 
                              class="large-text code"><?php echo esc_textarea($title_prompt); ?></textarea>
                    <p class="description">
                        記事からアンケートタイトル（質問文）を生成する際のプロンプト
                    </p>
                    <button type="button" class="button" onclick="resetTitlePrompt()">デフォルトに戻す</button>
                </td>
            </tr>
            
            <tr>
                <th scope="row">
                    <label for="choices_prompt">選択肢生成プロンプト</label>
                </th>
                <td>
                    <textarea id="choices_prompt" 
                              name="choices_prompt" 
                              rows="15" 
                              class="large-text code"><?php echo esc_textarea($choices_prompt); ?></textarea>
                    <p class="description">
                        アンケートの選択肢を生成する際のプロンプト
                    </p>
                    <button type="button" class="button" onclick="resetChoicesPrompt()">デフォルトに戻す</button>
                </td>
            </tr>
        </table>
        
        <p class="submit">
            <input type="submit" 
                   name="anke_openai_save" 
                   class="button button-primary" 
                   value="設定を保存">
        </p>
    </form>
</div>

<script>
// プロンプトリセット機能
function resetTitlePrompt() {
    if (confirm('タイトル生成プロンプトをデフォルトに戻しますか？')) {
        document.getElementById('title_prompt').value = <?php echo json_encode($default_title_prompt); ?>;
    }
}

function resetChoicesPrompt() {
    if (confirm('選択肢生成プロンプトをデフォルトに戻しますか？')) {
        document.getElementById('choices_prompt').value = <?php echo json_encode($default_choices_prompt); ?>;
    }
}
</script>
