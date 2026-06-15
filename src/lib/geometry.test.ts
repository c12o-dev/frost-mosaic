import { describe, it, expect } from 'vitest'
import { fitScale, toCanvasPoint, toCanvasBrush, containFit, coverFit, type Rect } from './geometry'

describe('fitScale', () => {
  it('縮小する: 長辺が max を超えるとき', () => {
    const r = fitScale(2800, 1400, 1400)
    expect(r.s).toBeCloseTo(0.5)
    expect(r.w).toBe(1400)
    expect(r.h).toBe(700)
  })

  it('縮小しない: 既に max 以内なら s=1（拡大しない）', () => {
    const r = fitScale(800, 600, 1400)
    expect(r.s).toBe(1)
    expect(r.w).toBe(800)
    expect(r.h).toBe(600)
  })

  it('縦長でも長辺基準で縮小する', () => {
    const r = fitScale(1000, 2000, 1000)
    expect(r.s).toBeCloseTo(0.5)
    expect(r.w).toBe(500)
    expect(r.h).toBe(1000)
  })

  it('ちょうど max のとき s=1', () => {
    const r = fitScale(1400, 900, 1400)
    expect(r.s).toBe(1)
  })

  it('結果は整数に丸める', () => {
    const r = fitScale(999, 333, 500)
    expect(Number.isInteger(r.w)).toBe(true)
    expect(Number.isInteger(r.h)).toBe(true)
  })
})

describe('toCanvasPoint', () => {
  const rect: Rect = { left: 100, top: 50, width: 350, height: 700 }

  it('表示と内部解像度が同じならオフセットだけ引く', () => {
    const p = toCanvasPoint(200, 150, { left: 100, top: 50, width: 700, height: 700 }, 700, 700)
    expect(p).toEqual({ x: 100, y: 100 })
  })

  it('表示が内部解像度より小さいときスケールアップする', () => {
    // 表示 350px に対し内部 700px → 倍率 2
    const p = toCanvasPoint(100 + 175, 50 + 350, rect, 700, 1400)
    expect(p.x).toBeCloseTo(350) // 175 * (700/350)
    expect(p.y).toBeCloseTo(700) // 350 * (1400/700)
  })

  it('左上(rect原点)は (0,0)', () => {
    const p = toCanvasPoint(100, 50, rect, 700, 1400)
    expect(p).toEqual({ x: 0, y: 0 })
  })
})

describe('toCanvasBrush', () => {
  it('表示幅と内部幅が同じなら等倍', () => {
    expect(toCanvasBrush(36, 700, 700)).toBe(36)
  })

  it('表示が内部の半分なら 2 倍に換算', () => {
    expect(toCanvasBrush(36, 350, 700)).toBe(72)
  })
})

describe('containFit (全体表示・トリミングしない)', () => {
  it('縦長画像: 高さ基準で収まり、見切れない', () => {
    // box 400x800 に 1000x2000(縦長) → 高さ基準 scale=0.4
    const r = containFit(400, 800, 1000, 2000)
    expect(r.scale).toBeCloseTo(0.4)
    expect(r.w).toBeCloseTo(400)
    expect(r.h).toBeCloseTo(800)
    expect(r.w).toBeLessThanOrEqual(400)
    expect(r.h).toBeLessThanOrEqual(800)
  })

  it('横長画像: 幅基準で収まる', () => {
    const r = containFit(400, 800, 2000, 1000)
    expect(r.scale).toBeCloseTo(0.2)
    expect(r.w).toBeCloseTo(400)
    expect(r.h).toBeCloseTo(200)
  })

  it('アスペクト比を保つ', () => {
    const r = containFit(400, 800, 1000, 2000)
    expect(r.w / r.h).toBeCloseTo(1000 / 2000)
  })

  it('小さい画像は領域を埋めるよう拡大する（scale>1 許容）', () => {
    const r = containFit(400, 800, 100, 200)
    expect(r.scale).toBeGreaterThan(1)
    expect(r.w).toBeCloseTo(400)
  })
})

describe('coverFit (霜レイヤーの cover 配置)', () => {
  it('box を完全に覆う（dw>=box, dh>=box）', () => {
    const r = coverFit(400, 800, 1000, 1000)
    expect(r.dw).toBeGreaterThanOrEqual(400)
    expect(r.dh).toBeGreaterThanOrEqual(800)
  })

  it('はみ出しは中央寄せ（オフセットが負で対称）', () => {
    const r = coverFit(400, 800, 1000, 1000) // 正方形を縦長boxへ → 横がはみ出す
    expect(r.dx).toBeLessThan(0)
    expect(r.dy).toBeCloseTo(0)
    // 中央寄せ: 左右均等
    expect(r.dx).toBeCloseTo((400 - r.dw) / 2)
  })
})
