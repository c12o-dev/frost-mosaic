/** UI の活性状態を決める純関数（DOM 非依存）。 */

import type { Mode } from './mosaic'

/** 取消・消去はストローク有無、保存は画像読込済みで活性。 */
export function controlState(
  hasStrokes: boolean,
  ready: boolean,
): { undoDisabled: boolean; resetDisabled: boolean; saveDisabled: boolean } {
  return {
    undoDisabled: !hasStrokes,
    resetDisabled: !hasStrokes,
    saveDisabled: !ready,
  }
}

/** モザイクモードでは ぼかし・氷霜 を無効化。 */
export function modeGating(mode: Mode): { blurDisabled: boolean; texDisabled: boolean } {
  const frost = mode === 'frost'
  return { blurDisabled: !frost, texDisabled: !frost }
}
