#!/bin/bash

# 管理画面ページのタイトルタグを一括設定するスクリプト

# ユーザーページ
echo "ユーザーページのタイトルタグを設定中..."

# myprofile
if ! grep -q "metadata\|generateMetadata" src/app/\(user\)/myprofile/page.tsx; then
  echo "myprofile にタイトルタグを追加"
fi

# point-exchange
if ! grep -q "metadata\|generateMetadata" src/app/\(user\)/point-exchange/page.tsx; then
  echo "point-exchange にタイトルタグを追加"
fi

# profile
if ! grep -q "metadata\|generateMetadata" src/app/\(user\)/profile/page.tsx; then
  echo "profile にタイトルタグを追加"
fi

# phistory
if ! grep -q "metadata\|generateMetadata" src/app/\(user\)/phistory/page.tsx; then
  echo "phistory にタイトルタグを追加"
fi

# report
if ! grep -q "metadata\|generateMetadata" src/app/\(user\)/report/page.tsx; then
  echo "report にタイトルタグを追加"
fi

echo "完了しました"
