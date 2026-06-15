/**
 * 保存方式の選択（純粋ロジック）。
 * 実際の navigator 読み取りは detectSaveCaps()（DOM 依存・component test 対象）が担い、
 * 分岐の本質はここで決める。
 *
 * 方針（SPEC §7・2026-06-15 修正）:
 * Share は **iOS の download 不安定対策に限定**する。Android/Desktop は download が
 * 確実かつ摩擦が少ないので、ファイル共有できても download にする（共有シートを出さない）。
 *  - iOS かつ共有可 → Web Share API Level 2
 *  - iOS かつ共有不可 → 新規タブ長押し保存（確実な退路）
 *  - それ以外（Android/Desktop）→ <a download>
 */

import type { Mode } from './mosaic'

export interface SaveCaps {
  /** navigator.canShare({ files:[probeFile] }) が true か */
  canShareFiles: boolean
  isIOS: boolean
  isStandalone: boolean
}

export type SaveStrategy = 'share' | 'newtab' | 'download'

export function pickSaveStrategy(caps: SaveCaps): SaveStrategy {
  if (caps.isIOS) return caps.canShareFiles ? 'share' : 'newtab'
  return 'download'
}

/** 元ファイル名から拡張子とパスを除いたベース名。取れなければ ''。 */
function baseName(name: string | null | undefined): string {
  if (!name) return ''
  const justName = name.split(/[\\/]/).pop() ?? ''
  return justName.replace(/\.[^.]+$/, '').trim()
}

/**
 * 保存ファイル名（純粋）。出力は常に PNG。
 * サフィックス形式: `<元画像名>_<mode>.png`。元名が取れなければ `<mode>.png`。
 * 例: ("IMG_1234.jpg","frost") → "IMG_1234_frost.png" / (null,"mosaic") → "mosaic.png"
 */
export function outputFileName(originalName: string | null | undefined, mode: Mode): string {
  const base = baseName(originalName)
  return base ? `${base}_${mode}.png` : `${mode}.png`
}
