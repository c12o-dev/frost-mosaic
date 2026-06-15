/** モザイク生成のための純粋計算。実際の Canvas 描画は app 側が担う。 */

/** エフェクトモード。 */
export type Mode = 'mosaic' | 'frost'

/**
 * 作業解像度 (w×h) を blockPx 粗さでモザイク化するときの、
 * 縮小先 Canvas の分割数 (sw×sh) を返す。
 * 縮小→拡大(imageSmoothingEnabled=false)でブロック化する手法の分割数。
 * 最低 1px は保証する。
 */
export function mosaicDims(w: number, h: number, blockPx: number): { sw: number; sh: number } {
  if (blockPx <= 0) throw new RangeError('blockPx must be > 0')
  return {
    sw: Math.max(1, Math.round(w / blockPx)),
    sh: Math.max(1, Math.round(h / blockPx)),
  }
}
