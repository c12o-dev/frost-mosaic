import { describe, it, expect } from 'vitest'
import { mosaicDims } from './mosaic'

describe('mosaicDims', () => {
  it('w/blockPx を四捨五入した分割数を返す', () => {
    expect(mosaicDims(1400, 700, 16)).toEqual({ sw: 88, sh: 44 }) // round(87.5)=88, round(43.75)=44
  })

  it('粗さが大きいほど分割数は小さい（=ブロックが大きい）', () => {
    const coarse = mosaicDims(1000, 1000, 48)
    const fine = mosaicDims(1000, 1000, 6)
    expect(coarse.sw).toBeLessThan(fine.sw)
  })

  it('極端に粗くても最低 1px は保証', () => {
    expect(mosaicDims(20, 20, 48)).toEqual({ sw: 1, sh: 1 })
  })

  it('blockPx が 0 以下は例外', () => {
    expect(() => mosaicDims(100, 100, 0)).toThrow(RangeError)
    expect(() => mosaicDims(100, 100, -5)).toThrow(RangeError)
  })
})
