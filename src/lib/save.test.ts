import { describe, it, expect } from 'vitest'
import { pickSaveStrategy, outputFileName, type SaveCaps } from './save'

const caps = (o: Partial<SaveCaps>): SaveCaps => ({
  canShareFiles: false,
  isIOS: false,
  isStandalone: false,
  ...o,
})

describe('pickSaveStrategy', () => {
  it('iOS かつ共有可なら share', () => {
    expect(pickSaveStrategy(caps({ isIOS: true, canShareFiles: true }))).toBe('share')
  })

  it('iOS かつ共有不可なら newtab（長押し保存の退路）', () => {
    expect(pickSaveStrategy(caps({ isIOS: true, canShareFiles: false }))).toBe('newtab')
  })

  it('Android/Desktop は共有可でも download（共有シートを出さない）', () => {
    // ← Windows/Android で share が出るストレスを潰す回帰テスト
    expect(pickSaveStrategy(caps({ isIOS: false, canShareFiles: true }))).toBe('download')
  })

  it('Android/Desktop で共有不可でも download', () => {
    expect(pickSaveStrategy(caps({ isIOS: false, canShareFiles: false }))).toBe('download')
  })

  it('Share は iOS 限定（standalone でも非iOSなら download）', () => {
    expect(pickSaveStrategy(caps({ isIOS: false, canShareFiles: true, isStandalone: true }))).toBe(
      'download',
    )
    expect(pickSaveStrategy(caps({ isIOS: true, canShareFiles: true, isStandalone: true }))).toBe(
      'share',
    )
  })
})

describe('outputFileName', () => {
  it('サフィックス形式: 元名_モード.png', () => {
    expect(outputFileName('IMG_1234.jpg', 'frost')).toBe('IMG_1234_frost.png')
    expect(outputFileName('photo.png', 'mosaic')).toBe('photo_mosaic.png')
  })

  it('出力は常に .png（元拡張子は捨てる）', () => {
    expect(outputFileName('vacation.heic', 'frost')).toBe('vacation_frost.png')
    expect(outputFileName('a.JPEG', 'mosaic')).toBe('a_mosaic.png')
  })

  it('日本語名もそのまま使える', () => {
    expect(outputFileName('旅行写真.heic', 'mosaic')).toBe('旅行写真_mosaic.png')
  })

  it('パス区切りを除去してベース名だけ使う', () => {
    expect(outputFileName('folder/sub/pic.jpg', 'frost')).toBe('pic_frost.png')
  })

  it('名前が無い/空ならモードのみ', () => {
    expect(outputFileName(null, 'frost')).toBe('frost.png')
    expect(outputFileName(undefined, 'mosaic')).toBe('mosaic.png')
    expect(outputFileName('', 'frost')).toBe('frost.png')
    expect(outputFileName('   ', 'mosaic')).toBe('mosaic.png')
  })

  it('拡張子なしの名前もOK', () => {
    expect(outputFileName('myimage', 'frost')).toBe('myimage_frost.png')
  })
})
