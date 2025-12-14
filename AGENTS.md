# Repository Guidelines

## プロジェクト構成とモジュール
- `app/`: Next.js App Router ルート/画面（`/dashboard/items/*`）。
- `src/`: 共通ロジック（`lib/`, `components/`, `styles/`）。
- `db/`: Drizzle スキーマ・クエリ（`schema.ts`, `client.ts`）。
- `drizzle/`: 生成されたマイグレーション。
- `tests/`: 単体/結合テスト（`*.test.ts`）。
- `public/`: 静的アセット。
- `scripts/`: 自動化、メンテナンス。
- `config/`: `.env.example` など設定テンプレート。
- `docs/`: 仕様・運用ノート。

## ビルド・テスト・開発コマンド
- `npm ci`: 依存をクリーンインストール。
- `npm run dev`: 開発サーバ（App Router）。
- `npm test`: Vitest 実行（`--coverage` で計測）。
- `npm run lint` / `npm run format`: ESLint / Prettier。
- `npm run build` / `npm start`: 本番ビルド/起動。
- DB: `npx drizzle-kit generate`（差分生成）、`npx drizzle-kit push`（Supabase に反映）。

## コーディング規約と命名
- TypeScript（strict）必須。インデント 2 スペース。
- 命名: `camelCase`（変数/関数）、`PascalCase`（コンポーネント/クラス）、`kebab-case`（ファイル/ルート）。
- Tailwind CSS 使用。可能なら `prettier-plugin-tailwindcss` を適用。
- Prettier + ESLint（`next/core-web-vitals`）。警告ゼロを維持。

## テスト方針
- フレームワーク: Vitest。
- 配置/命名: `tests/**/*.test.ts` または `src/**/__tests__/*.test.ts`。
- カバレッジ: 80% 以上を目安。
- Supabase など外部依存はモック。I/O は最小化。

## コミット/PR ガイドライン
- Conventional Commits（`feat:`, `fix:`, `docs:`, `refactor:`, `chore:`）。
- 例: `feat(items): add status filter`。
- PR: 説明、関連 Issue（`Closes #123`）、UI 変更はスクリーンショット、移行手順/影響範囲。
- マージ条件: CI 緑（lint/test/build）、必要なドキュメント更新。

## CI/CD（GitHub・Vercel・Supabase）
- Actions: Node 18+ で `npm ci` → `npm run lint` → `npm test` → `npm run build`。
- Vercel: `main` を本番、PR はプレビュー自動デプロイ。
- 環境変数: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` を Vercel とローカルで同期。Service Role はコミット禁止。
- マイグレーションはメンテナが実行し、結果を `drizzle/` にコミット。

## セキュリティと設定
- `.env` は Git 管理外。`config/.env.example` を更新し共有。
- 依存は定期更新（`npm audit`）。鍵・トークンは Vercel/Supabase 側で管理。

## ドメイン固有規約（ByeBye System）
- item_type: `VINYL`/`CD`（将来 `BOOK` 追加）。
- status: `UNPROCESSED` → `IDENTIFIED` → `READY` → `LISTED` → `SOLD`。
- SKU 生成: `BB-YYYYMMDD-XXXX`（例: `BB-20251214-0001`）。
- 画像命名: `SKU_kind.jpg`（例: `BB-20251214-0001_front.jpg`）。`kind` は `front|back|spine|label|other`。

## 再開のためのメモ
- 中断前: 進捗を Issue/PR に要約し、次の TODO を箇条書きで残す（Phase1 範囲を明記）。
- 再開手順: `git pull` → `npm ci` → `npm run dev`。
- 前提: Node.js 18+、Vercel CLI 任意（`npm i -g vercel`）。
