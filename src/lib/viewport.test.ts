import { describe, it, expect } from 'vitest'
import { pinch, clamp, clampView, toLocal, type View, type Pair, type Box } from './viewport'

const I: View = { s: 1, dx: 0, dy: 0 }

describe('clamp', () => {
  it('範囲内はそのまま / 下限・上限で止める', () => {
    expect(clamp(5, 1, 8)).toBe(5)
    expect(clamp(0.2, 1, 8)).toBe(1)
    expect(clamp(20, 1, 8)).toBe(8)
  })
})

describe('pinch: 拡大', () => {
  it('中点を中心に2倍すると、焦点の下の内容は動かない', () => {
    const prev: Pair = { a: { x: 100, y: 100 }, b: { x: 200, y: 100 } } // 中点(150,100) 距離100
    const cur: Pair = { a: { x: 50, y: 100 }, b: { x: 250, y: 100 } } // 中点(150,100) 距離200
    const v = pinch(I, prev, cur, 1, 8)
    expect(v.s).toBeCloseTo(2)
    // 焦点(150,100)の下の内容ローカル座標が前後で一致
    const before = toLocal(I, { x: 150, y: 100 })
    const after = toLocal(v, { x: 150, y: 100 })
    expect(after.x).toBeCloseTo(before.x)
    expect(after.y).toBeCloseTo(before.y)
  })

  it('ずれた焦点でも焦点の下の内容は固定される', () => {
    const prev: Pair = { a: { x: 200, y: 200 }, b: { x: 300, y: 200 } } // 中点(250,200)
    const cur: Pair = { a: { x: 150, y: 200 }, b: { x: 350, y: 200 } } // 中点(250,200) 2倍
    const v = pinch(I, prev, cur, 1, 8)
    const focus = { x: 250, y: 200 }
    expect(toLocal(v, focus).x).toBeCloseTo(toLocal(I, focus).x)
    expect(toLocal(v, focus).y).toBeCloseTo(toLocal(I, focus).y)
  })
})

describe('pinch: パン（距離一定）', () => {
  it('距離が変わらず中点だけ動くと平行移動・倍率は不変', () => {
    const prev: Pair = { a: { x: 100, y: 100 }, b: { x: 200, y: 200 } }
    const cur: Pair = { a: { x: 110, y: 100 }, b: { x: 210, y: 200 } } // x+10
    const v = pinch(I, prev, cur, 1, 8)
    expect(v.s).toBeCloseTo(1)
    expect(v.dx).toBeCloseTo(10)
    expect(v.dy).toBeCloseTo(0)
  })
})

describe('pinch: クランプ', () => {
  it('上限を超える拡大は max で止まり、平行移動も実効倍率で整合', () => {
    const start: View = { s: 4, dx: 0, dy: 0 }
    const prev: Pair = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } } // 距離100
    const cur: Pair = { a: { x: 0, y: 0 }, b: { x: 400, y: 0 } } // 距離400 → 生倍率16
    const v = pinch(start, prev, cur, 1, 8)
    expect(v.s).toBe(8) // 4*4=16 を 8 にクランプ
  })

  it('下限未満の縮小は min で止まる', () => {
    const prev: Pair = { a: { x: 0, y: 0 }, b: { x: 400, y: 0 } } // 距離400
    const cur: Pair = { a: { x: 0, y: 0 }, b: { x: 100, y: 0 } } // 距離100 → 0.25倍
    const v = pinch(I, prev, cur, 1, 8)
    expect(v.s).toBe(1)
  })
})

describe('clampView', () => {
  const box: Box = { left: 0, top: 100, right: 400, bottom: 900 } // ヘッダー下端 top=100

  it('画像が box より小さい軸は中央寄せ', () => {
    // 等倍・content 200x200 → box(400x800)より小さい → 中央
    const v = clampView({ s: 1, dx: 999, dy: -999 }, { w: 200, h: 200 }, box)
    expect(v.dx).toBeCloseTo(100) // 0 + (400-200)/2
    expect(v.dy).toBeCloseTo(400) // 100 + (800-200)/2
  })

  it('縦に大きい画像: 上に行き過ぎても上端は box.top で止まる（ヘッダーに潜らない）', () => {
    // content 200x1000, s=1 → ih=1000 > bh=800。dy を大きく(下げ)すぎ → 上端は box.top=100
    const v = clampView({ s: 1, dx: 100, dy: 500 }, { w: 200, h: 1000 }, box)
    expect(v.dy).toBe(100) // 上端がヘッダー下端より下がって隙間を作らない
  })

  it('縦に大きい画像: 下に行き過ぎると下端が box.bottom で止まる', () => {
    const v = clampView({ s: 1, dx: 100, dy: -9999 }, { w: 200, h: 1000 }, box)
    expect(v.dy).toBe(box.bottom - 1000) // 900-1000 = -100（下端=900）
  })
})
