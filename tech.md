# 使用する技術スタック

## 厳守すること

必ず最新のバージョンを調べて、最新バージョンで使用してください。

## 言語

typescript

## ライブラリ

- hono
- react
- zustand
- swr
- tailwind
- vite

## インフラ

cloudflare（https://developers.cloudflare.com/workers/）

# 設計方針

問題集WEBアプリケーションを作成します。メインのデバイスはスマホで使用することを前提とします。
cloudflare（https://developers.cloudflare.com/workers/）を前提とした仕組みにすること。
syuryou.md に記載されている問題を使用します。
問題に表示が必要な画像はプロジェクト内に配置します。
指定のライブラリは過剰かもしれませんが、学習も含めているため、使いたいです。

## 必要な機能

1. 全問題を毎回シャッフルして出題する機能
2. 問題をお気に入りに登録して、お気に入りの全量で問題を出題する機能
3. 採点機能
4. 採点結果の履歴確認機能
5. ログイン機能
