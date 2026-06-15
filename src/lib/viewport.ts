/** ピンチズーム／パンの純粋計算。DOM 非依存。
 *
 * ビューは「画面座標 = s * ローカル座標 + d」という相似変換で表す。
 *   - s   : 拡大率
 *   - dx,dy: 平行移動（画面座標オフセット）
 * ローカル座標は transform 前のキャンバス左上を原点とした px。
 * 2本指の前後位置から、焦点（2指の中点）の下にある内容を固定したまま
 * 拡大・平行移動するビューを返す（回転は無視）。
 */

export interface Vec {
  x: number
  y: number
}

export interface View {
  s: number
  dx: number
  dy: number
}

/** 2本指の位置ペア。 */
export interface Pair {
  a: Vec
  b: Vec
}

const dist = (a: Vec, b: Vec): number => Math.hypot(a.x - b.x, a.y - b.y)
const mid = (a: Vec, b: Vec): Vec => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })

export const clamp = (v: number, lo: number, hi: number): number =>
  Math.min(hi, Math.max(lo, v))

/**
 * 2本指の移動 prev→cur をビューに適用する。
 * 指の中点が動けば平行移動、指間距離が変われば中点を焦点に拡大する。
 * s は [min, max] にクランプし、クランプ後の倍率変化で平行移動も整合させる。
 */
export function pinch(view: View, prev: Pair, cur: Pair, min: number, max: number): View {
  const dp = dist(prev.a, prev.b) || 1
  const dc = dist(cur.a, cur.b) || 1
  const s = clamp(view.s * (dc / dp), min, max)
  const eff = s / view.s // クランプ後の実効倍率
  const pm = mid(prev.a, prev.b)
  const qm = mid(cur.a, cur.b)
  return {
    s,
    dx: eff * view.dx + qm.x - eff * pm.x,
    dy: eff * view.dy + qm.y - eff * pm.y,
  }
}

/** 画面座標 p の下にある内容のローカル座標を返す（テスト・パン制限用）。 */
export function toLocal(view: View, p: Vec): Vec {
  return { x: (p.x - view.dx) / view.s, y: (p.y - view.dy) / view.s }
}

/** 表示領域（画面座標）。ヘッダー下端〜ドック等を避けた、画像を収めたい矩形。 */
export interface Box {
  left: number
  top: number
  right: number
  bottom: number
}

/**
 * ビューを表示領域 box に収める。
 * 画像が box より小さい軸は中央寄せ、大きい軸は box を覆うようパンを制限する
 * （= 画像の縁が box の内側に入り込まない。上端が box.top より下に下がって隙間を作らない）。
 * content は transform 前のキャンバス表示サイズ（CSS px）。
 */
export function clampView(view: View, content: { w: number; h: number }, box: Box): View {
  const iw = view.s * content.w
  const ih = view.s * content.h
  const bw = box.right - box.left
  const bh = box.bottom - box.top
  const dx = iw <= bw ? box.left + (bw - iw) / 2 : clamp(view.dx, box.right - iw, box.left)
  const dy = ih <= bh ? box.top + (bh - ih) / 2 : clamp(view.dy, box.bottom - ih, box.top)
  return { s: view.s, dx, dy }
}
