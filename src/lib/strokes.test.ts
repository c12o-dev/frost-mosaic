import { describe, it, expect } from 'vitest'
import { reduceStrokes, hasStrokes, stampPositions, type Stroke } from './strokes'

const p = (x: number, y: number) => ({ x, y })

describe('reduceStrokes', () => {
  it('start: 新しいストロークを1本追加する', () => {
    const s = reduceStrokes([], { type: 'start', point: p(1, 2), w: 36 })
    expect(s).toEqual([{ pts: [p(1, 2)], w: 36 }])
  })

  it('extend: 直近ストロークに点を足す', () => {
    let s = reduceStrokes([], { type: 'start', point: p(0, 0), w: 10 })
    s = reduceStrokes(s, { type: 'extend', point: p(5, 5) })
    expect(s[0].pts).toEqual([p(0, 0), p(5, 5)])
  })

  it('extend: ストロークが無ければ無視', () => {
    const s = reduceStrokes([], { type: 'extend', point: p(1, 1) })
    expect(s).toEqual([])
  })

  it('undo: 直近の1本だけ消す', () => {
    let s = reduceStrokes([], { type: 'start', point: p(0, 0), w: 10 })
    s = reduceStrokes(s, { type: 'start', point: p(9, 9), w: 20 })
    s = reduceStrokes(s, { type: 'undo' })
    expect(s).toHaveLength(1)
    expect(s[0].w).toBe(10)
  })

  it('undo: 空配列なら同じ参照を返す（noop）', () => {
    const empty: Stroke[] = []
    expect(reduceStrokes(empty, { type: 'undo' })).toBe(empty)
  })

  it('clear: 全部消す', () => {
    let s = reduceStrokes([], { type: 'start', point: p(0, 0), w: 10 })
    s = reduceStrokes(s, { type: 'start', point: p(1, 1), w: 10 })
    expect(reduceStrokes(s, { type: 'clear' })).toEqual([])
  })

  it('入力配列を破壊しない（不変）', () => {
    const before: Stroke[] = [{ pts: [p(0, 0)], w: 10 }]
    const snapshot = JSON.stringify(before)
    reduceStrokes(before, { type: 'start', point: p(1, 1), w: 20 })
    reduceStrokes(before, { type: 'extend', point: p(2, 2) })
    expect(JSON.stringify(before)).toBe(snapshot)
  })
})

describe('hasStrokes', () => {
  it('1本以上で true', () => {
    expect(hasStrokes([{ pts: [p(0, 0)], w: 1 }])).toBe(true)
  })
  it('空で false', () => {
    expect(hasStrokes([])).toBe(false)
  })
})

describe('stampPositions', () => {
  it('空配列なら空', () => {
    expect(stampPositions([], 36)).toEqual([])
  })

  it('1点なら1スタンプ（コピーを返す）', () => {
    const out = stampPositions([p(5, 7)], 36)
    expect(out).toEqual([p(5, 7)])
  })

  it('始点と終点を必ず含む', () => {
    const out = stampPositions([p(0, 0), p(100, 0)], 36)
    expect(out[0]).toEqual(p(0, 0))
    expect(out[out.length - 1]).toEqual(p(100, 0))
  })

  it('隣接スタンプ間隔は step(=r*0.38) 以下で連続する', () => {
    const r = 36 / 2 // ブラシ径36 → 半径18 → step≈6.84
    const step = Math.max(1, r * 0.38)
    const out = stampPositions([p(0, 0), p(100, 0)], r)
    for (let i = 1; i < out.length; i++) {
      const d = Math.hypot(out[i].x - out[i - 1].x, out[i].y - out[i - 1].y)
      expect(d).toBeLessThanOrEqual(step + 1e-9)
    }
  })

  it('長い線ほどスタンプ数が増える', () => {
    const short = stampPositions([p(0, 0), p(20, 0)], 18)
    const long = stampPositions([p(0, 0), p(400, 0)], 18)
    expect(long.length).toBeGreaterThan(short.length)
  })

  it('太いブラシ(step大)ほど同じ線でスタンプ数が減る', () => {
    const thin = stampPositions([p(0, 0), p(200, 0)], 10)
    const thick = stampPositions([p(0, 0), p(200, 0)], 80)
    expect(thick.length).toBeLessThan(thin.length)
  })
})
