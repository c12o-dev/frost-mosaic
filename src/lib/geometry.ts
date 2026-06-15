/** 画面/Canvas 座標とスケールの純粋計算。DOM 非依存。 */

export interface Size {
  w: number
  h: number
}

export interface Point {
  x: number
  y: number
}

/** 矩形（getBoundingClientRect の必要部分だけ）。 */
export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

/**
 * 長辺が max に収まるよう縮小したサイズと倍率を返す。
 * 既に収まっている場合は s = 1（拡大はしない）。
 */
export function fitScale(w: number, h: number, max: number): { w: number; h: number; s: number } {
  const longSide = Math.max(w, h)
  const s = longSide > max ? max / longSide : 1
  return { w: Math.round(w * s), h: Math.round(h * s), s }
}

/** 画面座標 (clientX/Y) を Canvas 内部解像度の座標へ変換。 */
export function toCanvasPoint(
  clientX: number,
  clientY: number,
  rect: Rect,
  canvasW: number,
  canvasH: number,
): Point {
  return {
    x: (clientX - rect.left) * (canvasW / rect.width),
    y: (clientY - rect.top) * (canvasH / rect.height),
  }
}

/** 画面 px のブラシ幅を Canvas 内部解像度の px へ換算。 */
export function toCanvasBrush(screenPx: number, rectWidth: number, canvasW: number): number {
  return screenPx * (canvasW / rectWidth)
}

/**
 * 画像アスペクト比を保って box に収める最大矩形（object-fit: contain 相当）。
 * 縦長・横長いずれも全体が収まり、トリミングしない。box より小さい画像は拡大する
 * （表示領域を埋めるため。scale > 1 を許容）。
 */
export function containFit(
  boxW: number,
  boxH: number,
  imgW: number,
  imgH: number,
): { w: number; h: number; scale: number } {
  const scale = Math.min(boxW / imgW, boxH / imgH)
  return { w: imgW * scale, h: imgH * scale, scale }
}

/**
 * box を埋める cover 配置（object-fit: cover 相当）。はみ出し分は中央寄せでトリミング。
 * 固定霜レイヤー（全面に結晶があるので中央トリミングしても破綻しない）の配置に使う。
 */
export function coverFit(
  boxW: number,
  boxH: number,
  imgW: number,
  imgH: number,
): { dx: number; dy: number; dw: number; dh: number } {
  const scale = Math.max(boxW / imgW, boxH / imgH)
  const dw = imgW * scale
  const dh = imgH * scale
  return { dx: (boxW - dw) / 2, dy: (boxH - dh) / 2, dw, dh }
}
