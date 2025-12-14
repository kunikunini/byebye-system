# デプロイ手順（Vercel 連携）

## 前提
- GitHub リポジトリ: `kunikunini/byebye-system`
- Vercel アカウントにログイン済み
- Supabase プロジェクト作成済み（URL/Keys 取得済み、Storage バケット `captures` 作成済み）

## 手順（Vercel ダッシュボード）
1. New Project → Import Git Repository → `byebye-system` を選択。
2. Framework: Next.js（自動検出）。Build/Install は既定値（`npm run build` / `npm ci`）。
3. Environment Variables を追加:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`（Server Only）
   - `DATABASE_URL`
4. Deploy を実行（`main` は本番、PR はプレビュー自動作成）。

## ローカルとVercelの同期
- ローカル `.env.local` は `config/.env.example` を参考に作成。
- 変更があれば Vercel の環境変数も更新し、再デプロイ。

## Drizzle マイグレーション
- 差分生成: `npx drizzle-kit generate`
- 反映: `npx drizzle-kit push`

## トラブルシュート
- 500系: 環境変数漏れ（特に `DATABASE_URL` / Supabase Keys）を確認。
- 画像アップロード不可: Vercel 環境で `SUPABASE_SERVICE_ROLE_KEY` 未設定/権限不足を確認。
- DB スキーマ不整合: Drizzle の生成物（`drizzle/`）をコミットし、環境反映を再実行。

