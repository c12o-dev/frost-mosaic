/** なぞりストロークの状態 reducer。取消・消去の基盤。純粋・不変。 */

import type { Point } from './geometry'

export interface Stroke {
  pts: Point[]
  /** 作業解像度でのブラシ幅(px) */
  w: number
}

export type StrokeAction =
  | { type: 'start'; point: Point; w: number }
  | { type: 'extend'; point: Point }
  | { type: 'undo' }
  | { type: 'clear' }

/**
 * ストローク配列に action を適用し、新しい配列を返す（入力は破壊しない）。
 * - start : 新しいストロークを開始
 * - extend: 直近ストロークに点を追加（ストロークが無ければ無視）
 * - undo  : 直近ストロークを削除
 * - clear : 全削除
 */
export function reduceStrokes(strokes: Stroke[], action: StrokeAction): Stroke[] {
  switch (action.type) {
    case 'start':
      return [...strokes, { pts: [action.point], w: action.w }]
    case 'extend': {
      if (strokes.length === 0) return strokes
      const last = strokes[strokes.length - 1]
      const extended: Stroke = { ...last, pts: [...last.pts, action.point] }
      return [...strokes.slice(0, -1), extended]
    }
    case 'undo':
      return strokes.length === 0 ? strokes : strokes.slice(0, -1)
    case 'clear':
      return strokes.length === 0 ? strokes : []
  }
}

/** 取消・消去ボタンが押せるか（=ストロークが1本以上あるか）。 */
export function hasStrokes(strokes: Stroke[]): boolean {
  return strokes.length > 0
}

/**
 * ソフト円ブラシのスタンプ中心点列を返す（純粋）。
 * 軌跡 pts を step = max(1, r*0.38) 間隔で補間し、連続スタンプして滑らかにする。
 * 1点なら 1 スタンプ。隣接セグメントの端点は重複しうる（描画上は overdraw で無害）。
 * 実際の放射グラデ描画は app 側（Canvas）が担う。
 */
export function stampPositions(pts: Point[], r: number): Point[] {
  if (pts.length === 0) return []
  if (pts.length === 1) return [{ ...pts[0] }]
  const step = Math.max(1, r * 0.38)
  const out: Point[] = []
  for (let s = 1; s < pts.length; s++) {
    const a = pts[s - 1]
    const b = pts[s]
    const dx = b.x - a.x
    const dy = b.y - a.y
    const dist = Math.hypot(dx, dy)
    const n = Math.max(1, Math.ceil(dist / step))
    for (let i = 0; i <= n; i++) {
      out.push({ x: a.x + (dx * i) / n, y: a.y + (dy * i) / n })
    }
  }
  return out
}
