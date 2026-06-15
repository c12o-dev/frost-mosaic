import { describe, it, expect } from 'vitest'
import { controlState, modeGating } from './uiState'

describe('controlState', () => {
  it('ストロークなし: 取消・消去は無効', () => {
    const s = controlState(false, true)
    expect(s.undoDisabled).toBe(true)
    expect(s.resetDisabled).toBe(true)
  })
  it('ストロークあり: 取消・消去は有効', () => {
    const s = controlState(true, true)
    expect(s.undoDisabled).toBe(false)
    expect(s.resetDisabled).toBe(false)
  })
  it('未読込: 保存は無効', () => {
    expect(controlState(true, false).saveDisabled).toBe(true)
  })
  it('読込済み: 保存は有効', () => {
    expect(controlState(false, true).saveDisabled).toBe(false)
  })
})

describe('modeGating', () => {
  it('mosaic: ぼかし・氷霜は無効', () => {
    expect(modeGating('mosaic')).toEqual({ blurDisabled: true, texDisabled: true })
  })
  it('frost: ぼかし・氷霜は有効', () => {
    expect(modeGating('frost')).toEqual({ blurDisabled: false, texDisabled: false })
  })
})
