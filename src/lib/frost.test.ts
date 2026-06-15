import { describe, it, expect } from 'vitest'
import { frostParams } from './frost'

describe('frostParams', () => {
  it('tex=0 で霜が完全オフ（active=false・全レイヤー0）', () => {
    const f = frostParams(0)
    expect(f.active).toBe(false)
    expect(f.frostLayer).toBe(0)
    expect(f.scatter).toBe(0)
    expect(f.grain).toBe(0)
    expect(f.sheen).toBe(0)
  })

  it('tex>0 で active=true・霜レイヤーは 0.85×t', () => {
    const f = frostParams(0.6)
    expect(f.active).toBe(true)
    expect(f.frostLayer).toBeCloseTo(0.85 * 0.6)
  })

  it('tex=1 で各係数が最大', () => {
    const f = frostParams(1)
    expect(f.scatter).toBeCloseTo(0.38)
    expect(f.grain).toBeCloseTo(0.52)
    expect(f.sheen).toBeCloseTo(0.14)
    expect(f.frostLayer).toBeCloseTo(0.85)
  })

  it('tex が増えると霜レイヤー不透明度は単調増加', () => {
    expect(frostParams(0.8).frostLayer).toBeGreaterThan(frostParams(0.3).frostLayer)
  })

  it('範囲外入力は 0..1 にクランプ', () => {
    expect(frostParams(-5)).toEqual(frostParams(0))
    expect(frostParams(9).frostLayer).toBeCloseTo(0.85)
  })
})
