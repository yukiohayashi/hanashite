-- キーワードをkeywordsテーブルに挿入
-- slug: キーワードをローマ字化したもの
-- keyword_type: 'tag'
-- post_count, search_count, view_countは0で初期化（VPS側で集計）

INSERT INTO keywords (keyword, slug, keyword_type, post_count, search_count, view_count) VALUES
('浮気防止', 'uwaki-boushi', 'tag', 0, 0, 0),
('実家暮らし', 'jikka-gurashi', 'tag', 0, 0, 0),
('性格の不一致', 'seikaku-no-fuicchi', 'tag', 0, 0, 0),
('友達が不倫', 'tomodachi-ga-furin', 'tag', 0, 0, 0),
('夫婦の会話', 'fufu-no-kaiwa', 'tag', 0, 0, 0),
('バレる確率', 'bareru-kakuritsu', 'tag', 0, 0, 0),
('童貞', 'doutei', 'tag', 0, 0, 0),
('チャラ男', 'chara-otoko', 'tag', 0, 0, 0),
('男性の筋肉', 'dansei-no-kinniku', 'tag', 0, 0, 0),
('逆プロポーズ', 'gyaku-propose', 'tag', 0, 0, 0),
('過去の恋愛', 'kako-no-renai', 'tag', 0, 0, 0),
('一人暮らし', 'hitori-gurashi', 'tag', 0, 0, 0),
('半同棲', 'han-dousei', 'tag', 0, 0, 0),
('不機嫌ハラスメント', 'fukigen-harassment', 'tag', 0, 0, 0),
('元彼', 'motokare', 'tag', 0, 0, 0),
('マリッジブルー', 'marriage-blue', 'tag', 0, 0, 0),
('イケメン', 'ikemen', 'tag', 0, 0, 0),
('お泊りデート', 'otomari-date', 'tag', 0, 0, 0),
('結婚願望', 'kekkon-ganbou', 'tag', 0, 0, 0),
('最低の年収', 'saitei-no-nenshu', 'tag', 0, 0, 0),
('相手の年収', 'aite-no-nenshu', 'tag', 0, 0, 0),
('DV', 'dv', 'tag', 0, 0, 0),
('モラハラ', 'morahara', 'tag', 0, 0, 0),
('遠距離恋愛', 'enkyori-renai', 'tag', 0, 0, 0),
('10歳差', 'jussai-sa', 'tag', 0, 0, 0),
('略奪愛', 'ryakudatsu-ai', 'tag', 0, 0, 0),
('ダブル不倫', 'double-furin', 'tag', 0, 0, 0),
('セックスレス', 'sexless', 'tag', 0, 0, 0),
('下の毛', 'shita-no-ke', 'tag', 0, 0, 0),
('チビ', 'chibi', 'tag', 0, 0, 0),
('デブ', 'debu', 'tag', 0, 0, 0),
('ハゲ', 'hage', 'tag', 0, 0, 0)
ON CONFLICT (keyword) DO UPDATE SET
  slug = EXCLUDED.slug,
  keyword_type = EXCLUDED.keyword_type,
  updated_at = CURRENT_TIMESTAMP;
