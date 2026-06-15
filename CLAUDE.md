# CLAUDE.md — frost-mosaic

画像の一部を指でなぞってモザイク／氷霜ガラスで隠す PWA。**全処理が端末内で完結し、画像は外部に送信しない**。ランタイム依存ライブラリはゼロ（素の TypeScript + Canvas 2D）。

- スタック: TypeScript + Vite。テストは Vitest。Service Worker / manifest は vite-plugin-pwa（generateSW）。
- デプロイ: 静的サイトとして Cloudflare Pages（`frost.c12o.net`）。
- ライセンス: MIT（© Seu）。霜テクスチャ `assets/frost_layer.webp` は AI 生成画像。

## 設計方針

- **ランタイム依存ゼロを維持**（Vite / Vitest / vite-plugin-pwa / happy-dom は devDependency のみ）。
- **純粋ロジックは `src/lib/` に副作用なしで隔離し、test-first**。Canvas / DOM / navigator への依存は `src/lib` に持ち込まず、`src/app.ts`（配線）と `src/env.ts`（環境検出）に閉じる。
- 画像は SW にキャッシュしない・ネットワークに出さない（precache はアプリシェルのみ）。
- 保存方式は環境で分岐（`src/lib/save.ts`）: **iOS は Web Share API、それ以外（Android / デスクトップ）は直接ダウンロード**。iOS の standalone PWA では `<a download>` が不安定なため Share を使う。

## ディレクトリ

```
index.html         エントリ（Vite）
src/app.ts         配線（純関数を呼ぶだけ・Canvas/DOM はここ）
src/env.ts         環境検出（navigator 境界・detectSaveCaps）
src/styles.css     スタイル
src/lib/           純粋ロジック（テスト対象・DOM 非依存）
  geometry.ts      座標/スケール変換・containFit/coverFit
  mosaic.ts        モザイク分割計算・Mode 型
  strokes.ts       ストローク reducer・stampPositions
  frost.ts         氷霜 tex → 各レイヤーの不透明度
  save.ts          保存方式の選択・出力ファイル名
  uiState.ts       ボタン活性・モード gating
assets/            frost_layer.webp（固定霜レイヤー）
public/icons/      PWA アイコン
```

## コマンド（pnpm）

```sh
pnpm install
pnpm dev          # 開発サーバ
pnpm test         # Vitest（watch）
pnpm test:run     # Vitest（CI）
pnpm typecheck    # tsc --noEmit
pnpm build        # 型チェック + 本番ビルド（dist/）
```

## テストの考え方

- 純関数（`src/lib`）はユニットで網羅。Canvas のピクセル検証は E2E（Playwright の in-page `getImageData`）で行い、生の画像 snapshot 比較は最小限にする（クロスプラットフォームで flaky になるため）。
- バグは再現テストを先に書いてから直す。

## 避けるパターン

- 純粋ロジックを event handler / Canvas コードに埋め込む（テスト不能になる）。
- `<a download>` を iOS standalone の主保存経路にする（信頼できない）。
- なぞっている最中にエフェクト面（`eff`）を再生成する（重い）。
- ランタイム依存ライブラリを増やす。
