import type { SaveCaps } from './lib/save'

/**
 * 実環境（navigator/DOM）から SaveCaps を読み取る薄い関数。
 * 分岐の本質は pure な pickSaveStrategy が持ち、ここは「環境の事実」を集めるだけ。
 * `navigator.canShare` は probe 用の実 File を渡さないと false を返す実装があるため、
 * 必ず File を作って渡す。
 */
export function detectSaveCaps(): SaveCaps {
  const nav = navigator as Navigator & {
    canShare?: (data?: ShareData) => boolean
    standalone?: boolean
  }
  const ua = navigator.userAgent || ''
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    // iPadOS は Mac の UA を名乗るのでタッチ有無で補正
    (ua.includes('Macintosh') && typeof document !== 'undefined' && 'ontouchend' in document)
  const isStandalone =
    nav.standalone === true ||
    (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches)

  let canShareFiles = false
  try {
    const probe = new File([new Uint8Array([0])], 'probe.png', { type: 'image/png' })
    canShareFiles = typeof nav.canShare === 'function' && nav.canShare({ files: [probe] })
  } catch {
    canShareFiles = false
  }
  return { canShareFiles, isIOS, isStandalone }
}
