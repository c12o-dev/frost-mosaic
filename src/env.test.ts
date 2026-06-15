// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest'
import { detectSaveCaps } from './env'

const setNav = (key: string, value: unknown) =>
  Object.defineProperty(navigator, key, { value, configurable: true })

afterEach(() => {
  // 後始末: 上書きした navigator プロパティを消す
  for (const k of ['canShare', 'userAgent', 'standalone']) {
    if (Object.getOwnPropertyDescriptor(navigator, k)?.configurable) {
      // @ts-expect-error 動的 delete
      delete navigator[k]
    }
  }
})

describe('detectSaveCaps', () => {
  it('canShare が files を受理するとき canShareFiles=true（probe File を渡して判定）', () => {
    let received: ShareData | undefined
    setNav('canShare', (d?: ShareData) => {
      received = d
      return true
    })
    const caps = detectSaveCaps()
    expect(caps.canShareFiles).toBe(true)
    // probe として実 File を渡していること（false を返す実装対策）
    expect(received?.files?.length).toBe(1)
  })

  it('canShare が無ければ canShareFiles=false', () => {
    const caps = detectSaveCaps()
    expect(caps.canShareFiles).toBe(false)
  })

  it('canShare が files を拒否すれば false', () => {
    setNav('canShare', () => false)
    expect(detectSaveCaps().canShareFiles).toBe(false)
  })

  it('iPhone の UA を isIOS として検出', () => {
    setNav('userAgent', 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15')
    expect(detectSaveCaps().isIOS).toBe(true)
  })

  it('デスクトップ UA は isIOS=false', () => {
    setNav('userAgent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')
    expect(detectSaveCaps().isIOS).toBe(false)
  })
})
