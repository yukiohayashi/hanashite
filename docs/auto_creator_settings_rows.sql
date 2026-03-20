INSERT INTO "public"."auto_creator_settings" ("id", "is_active", "interval_minutes", "prompt_template", "category_id", "user_id", "created_at", "updated_at", "category_queue", "queue_index", "category_weights", "yahoo_chiebukuro_url", "title_prompt", "content_prompt", "max_scraping_items") VALUES ('1', 'true', '45', null, null, null, '2026-03-18 03:24:05.920592+00', '2026-03-20 11:04:10.923+00', '[{"category_id": 8, "category_name": "レス"}, {"category_id": null, "category_name": "不倫"}, {"category_id": 11, "category_name": "同棲"}, {"category_id": 11, "category_name": "同棲"}, {"category_id": 11, "category_name": "同棲"}, {"category_id": 5, "category_name": "夫婦"}, {"category_id": 2, "category_name": "婚活"}, {"category_id": 2, "category_name": "婚活"}, {"category_id": 3, "category_name": "復縁"}, {"category_id": 3, "category_name": "復縁"}, {"category_id": 3, "category_name": "復縁"}, {"category_id": 3, "category_name": "復縁"}, {"category_id": 6, "category_name": "浮気"}, {"category_id": 6, "category_name": "浮気"}, {"category_id": 6, "category_name": "浮気"}, {"category_id": 6, "category_name": "浮気"}, {"category_id": 6, "category_name": "浮気"}, {"category_id": 13, "category_name": "離婚"}, {"category_id": 13, "category_name": "離婚"}, {"category_id": 14, "category_name": "その他"}, {"category_id": 7, "category_name": "デート"}, {"category_id": 7, "category_name": "デート"}, {"category_id": 9, "category_name": "価値観"}, {"category_id": 9, "category_name": "価値観"}, {"category_id": 4, "category_name": "出会い"}, {"category_id": 4, "category_name": "出会い"}, {"category_id": 19, "category_name": "片思い"}, {"category_id": 19, "category_name": "片思い"}, {"category_id": 19, "category_name": "片思い"}, {"category_id": 19, "category_name": "片思い"}, {"category_id": 19, "category_name": "片思い"}, {"category_id": 18, "category_name": "夜の悩み"}, {"category_id": 10, "category_name": "職場恋愛"}, {"category_id": 10, "category_name": "職場恋愛"}, {"category_id": 10, "category_name": "職場恋愛"}, {"category_id": 16, "category_name": "遠距離恋愛"}, {"category_id": 16, "category_name": "遠距離恋愛"}, {"category_id": 20, "category_name": "別れ話・失恋"}, {"category_id": 20, "category_name": "別れ話・失恋"}, {"category_id": 20, "category_name": "別れ話・失恋"}, {"category_id": 20, "category_name": "別れ話・失恋"}, {"category_id": 17, "category_name": "マンネリ・倦怠期"}, {"category_id": 17, "category_name": "マンネリ・倦怠期"}, {"category_id": 17, "category_name": "マンネリ・倦怠期"}, {"category_id": 12, "category_name": "告白・プロポーズ"}, {"category_id": 12, "category_name": "告白・プロポーズ"}, {"category_id": 12, "category_name": "告白・プロポーズ"}, {"category_id": 21, "category_name": "コミュニケーション"}, {"category_id": 21, "category_name": "コミュニケーション"}, {"category_id": 21, "category_name": "コミュニケーション"}, {"category_id": 21, "category_name": "コミュニケーション"}]', '0', '{"浮気": 5, "その他": 1, "デート": 1, "職場恋愛": 3}', 'https://chiebukuro.yahoo.co.jp/category/2078297875/question/list', 'カテゴリ: {{category_name}}
テーマ: {{source_title}}

上記のテーマをもとに、26歳の一人暮らし女性が実際に抱えそうな恋愛の悩みを、
相談掲示板への投稿タイトルとして自然な日本語で生成してください。

要件:
- 30文字以内
- 疑問形または悩み形式
- 具体的で共感しやすい内容
- 「〜について」「〜はどうすればいい？」などの形式

出力形式: タイトルのみを1行で出力', 'カテゴリ: {{category_name}}
タイトル: {{generated_title}}
テーマ: {{source_title}}

上記のタイトルに合った相談本文を生成してください。

要件:
- 200〜400文字
- 26歳の一人暮らし女性の視点
- 具体的なエピソードを含める
- 自然な日本語の口語体
- 最後に「みなさんはどう思いますか？」などの問いかけで締める

出力形式: 本文のみを出力', '20');