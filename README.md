# ByeBye System

中古メディア（VINYL/CD）を効率的に管理・出品するための業務用Webアプリ。将来的に BOOK へ拡張可能な設計（共通OS + 商品別モジュール）。Next.js(App Router) + TypeScript + Supabase(Postgres/Storage) + Drizzle ORM + Tailwind CSS を採用。

## 必要な環境変数
`.env.local`（ローカル）/ Vercel の Project Settings に設定します。
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`（サーバのみ・公開禁止）
- `DATABASE_URL`（Supabase Postgres への接続文字列）

雛形: `config/.env.example`

## Supabase セットアップ
1. Supabase プロジェクトを作成し、URL/Keys を取得。
2. Storage にバケット `captures` を作成（Public: Off 推奨、RLSは匿名読み取りルールを用途に応じて設定）。
3. `DATABASE_URL` を取得し、ローカル/Vercel に設定。
4. Drizzle でスキーマを反映:
   - 差分生成: `npx drizzle-kit generate`
   - 反映: `npx drizzle-kit push`

## ローカル起動
- 依存導入: `npm ci`
- 開発: `npm run dev`
- Lint/Format/Build: `npm run lint` / `npm run format` / `npm run build`
- テスト: `npm test`（必要に応じ `--coverage`）

## 画面/機能（Phase1）
- `/dashboard/items`: 一覧・検索（status, sku, title, artist）・新規追加
- `/dashboard/items/new`: SKU 自動生成（`BB-YYYYMMDD-XXXX`）・item_type 選択（VINYL/CD）
- `/dashboard/items/[id]`: 基本情報編集、status 更新、画像アップロード（複数、命名: `SKU_kind.jpg`）/ captures 一覧

## Vercel デプロイ
1. GitHub リポジトリを Vercel に連携。
2. 環境変数（上記）を Vercel に設定。
3. `main` へマージで本番デプロイ、PR はプレビュー自動作成。

## このフェーズでやらないこと
- Discogs API, OCR, 価格計算, 出品API, BOOK 実装（将来対応）

## ライセンス
プロジェクト所有者の方針に従います。
