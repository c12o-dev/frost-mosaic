import './styles.css'
import frostLayerUrl from '../assets/frost_layer.webp'
import { fitScale, toCanvasPoint, toCanvasBrush, coverFit, containFit } from './lib/geometry'
import { mosaicDims, type Mode } from './lib/mosaic'
import { reduceStrokes, stampPositions, hasStrokes, type Stroke } from './lib/strokes'
import { frostParams, type FrostParams } from './lib/frost'
import { pinch, clampView, type Pair, type Vec, type Box } from './lib/viewport'
import { pickSaveStrategy, outputFileName } from './lib/save'
import { controlState, modeGating } from './lib/uiState'
import { detectSaveCaps } from './env'

const byId = <T extends HTMLElement = HTMLElement>(id: string): T =>
  document.getElementById(id) as T
const mk = (): HTMLCanvasElement => document.createElement('canvas')

const cv = byId<HTMLCanvasElement>('cv')
const ctx = cv.getContext('2d')!
const base = mk()
const eff = mk()
const mask = mk()
const tmp = mk()
const bctx = base.getContext('2d')!
const ectx = eff.getContext('2d')!
const mctx = mask.getContext('2d')!
const tctx = tmp.getContext('2d')!

const MAX = 1400
const MIN_SCALE = 1
const MAX_SCALE = 8
const view = { scale: 1, tx: 0, ty: 0 } // キャンバスの表示変換（ピンチズーム/パン）
let strokes: Stroke[] = []
let activeW = 0
let lastPt: { x: number; y: number } | null = null
let drawing = false
let ready = false
let mode: Mode = 'frost'
let frostImg: HTMLImageElement | null = null
let originalName: string | null = null

const el = {
  block: byId<HTMLInputElement>('block'),
  blur: byId<HTMLInputElement>('blur'),
  tex: byId<HTMLInputElement>('tex'),
  brush: byId<HTMLInputElement>('brush'),
  blockVal: byId('blockVal'),
  blurVal: byId('blurVal'),
  texVal: byId('texVal'),
  brushVal: byId('brushVal'),
  blurRow: byId('blurRow'),
  texRow: byId('texRow'),
  hint: byId('hint'),
  status: byId('status'),
  frame: byId('frame'),
  stage: byId('stage'),
  dock: byId('dock'),
  undo: byId<HTMLButtonElement>('undo'),
  reset: byId<HTMLButtonElement>('reset'),
  save: byId<HTMLButtonElement>('save'),
}

/* ---------- 固定霜レイヤー（バンドル） ---------- */
const fi = new Image()
fi.onload = () => {
  frostImg = fi
  if (ready) {
    buildEffect()
    render()
  }
}
fi.src = frostLayerUrl

/* ---------- 画像読込（dataURL） ---------- */
function loadImage(src: string): void {
  const img = new Image()
  img.onload = () => {
    const { w, h } = fitScale(img.naturalWidth, img.naturalHeight, MAX)
    for (const c of [base, eff, mask, tmp, cv]) {
      c.width = w
      c.height = h
    }
    bctx.drawImage(img, 0, 0, w, h)
    strokes = []
    buildEffect()
    render()
    ready = true
    el.hint.style.display = 'none'
    el.frame.classList.remove('empty')
    resetView()
    layoutStage()
    fitCanvasToStage()
    el.status.textContent = '指でなぞって隠す'
    syncButtons()
  }
  img.onerror = () => {
    el.status.textContent = '読み込めませんでした'
  }
  img.src = src
}

/* ---------- エフェクト生成 ---------- */
let _noise: HTMLCanvasElement | null = null
function noiseTile(): HTMLCanvasElement {
  if (_noise) return _noise
  const n = mk()
  n.width = n.height = 220
  const nc = n.getContext('2d')!
  const id = nc.createImageData(220, 220)
  for (let i = 0; i < id.data.length; i += 4) {
    const v = 128 + (Math.random() * 2 - 1) * 64
    id.data[i] = id.data[i + 1] = id.data[i + 2] = v
    id.data[i + 3] = 255
  }
  nc.putImageData(id, 0, 0)
  _noise = n
  return n
}

function applyFrostTexture(c: CanvasRenderingContext2D, w: number, h: number, f: FrostParams): void {
  // 1) 寒色白の散乱
  c.globalCompositeOperation = 'soft-light'
  c.fillStyle = `rgba(214,233,243,${f.scatter})`
  c.fillRect(0, 0, w, h)
  // 2) 微細グレイン
  c.globalCompositeOperation = 'soft-light'
  c.globalAlpha = f.grain
  const pat = c.createPattern(noiseTile(), 'repeat')
  if (pat) {
    c.fillStyle = pat
    c.fillRect(0, 0, w, h)
  }
  c.globalAlpha = 1
  // 3) 斜めの照り
  c.globalCompositeOperation = 'screen'
  const side = f.sheen * 0.43
  const g = c.createLinearGradient(0, 0, w, h)
  g.addColorStop(0, 'rgba(255,255,255,0)')
  g.addColorStop(0.44, `rgba(255,255,255,${side})`)
  g.addColorStop(0.5, `rgba(255,255,255,${f.sheen})`)
  g.addColorStop(0.56, `rgba(255,255,255,${side})`)
  g.addColorStop(1, 'rgba(255,255,255,0)')
  c.fillStyle = g
  c.fillRect(0, 0, w, h)
  c.globalCompositeOperation = 'source-over'
}

function buildEffect(): void {
  if (!base.width) return
  const w = base.width
  const h = base.height
  const { sw, sh } = mosaicDims(w, h, +el.block.value)

  const small = mk()
  small.width = sw
  small.height = sh
  const sctx = small.getContext('2d')!
  sctx.imageSmoothingEnabled = true
  sctx.drawImage(base, 0, 0, sw, sh)

  ectx.clearRect(0, 0, w, h)
  ectx.imageSmoothingEnabled = false
  ectx.drawImage(small, 0, 0, sw, sh, 0, 0, w, h)

  if (mode !== 'frost') return

  // ぼかし
  const blurPx = +el.blur.value
  if (blurPx > 0) {
    const blurred = mk()
    blurred.width = w
    blurred.height = h
    const blc = blurred.getContext('2d')!
    blc.filter = `blur(${blurPx}px)`
    blc.drawImage(eff, 0, 0)
    ectx.clearRect(0, 0, w, h)
    ectx.imageSmoothingEnabled = true
    ectx.drawImage(blurred, 0, 0)
  }

  // ガラス質感＋固定霜レイヤー（tex=0 で active=false → 何もしない）
  const f = frostParams(+el.tex.value / 100)
  if (f.active) {
    applyFrostTexture(ectx, w, h, f)
    if (frostImg) {
      ectx.save()
      ectx.globalCompositeOperation = 'screen'
      ectx.globalAlpha = f.frostLayer
      const c = coverFit(w, h, frostImg.naturalWidth, frostImg.naturalHeight)
      ectx.drawImage(frostImg, c.dx, c.dy, c.dw, c.dh)
      ectx.restore()
    }
  }
}

/* ---------- 合成描画 ---------- */
function render(): void {
  const w = cv.width
  const h = cv.height
  ctx.clearRect(0, 0, w, h)
  ctx.drawImage(base, 0, 0)
  tctx.clearRect(0, 0, w, h)
  tctx.globalCompositeOperation = 'source-over'
  tctx.drawImage(eff, 0, 0)
  tctx.globalCompositeOperation = 'destination-in'
  tctx.drawImage(mask, 0, 0)
  tctx.globalCompositeOperation = 'source-over'
  ctx.drawImage(tmp, 0, 0)
}

/* ---------- 表示サイズ（画像アスペクト比のまま全体表示・トリミングなし） ----------
   上端: ヘッダー分の余白を確保し画像が潜らないようにする。
   下端: ドックは画像の上に浮く（重なってよい）。 */
const headerEl = document.querySelector('header') as HTMLElement
function layoutStage(): void {
  // ヘッダーの実高ぶんステージ上部を空け、初期表示でも画像がヘッダーに被らないように
  el.stage.style.paddingTop = `${headerEl.getBoundingClientRect().height}px`
  // 空状態（画像選択枠）はドックに被らないよう、下にドック分の余白を確保する。
  // 画像読込後は '' に戻し、CSS の小さい padding（ドックは画像に重なってよい）に任せる。
  el.stage.style.paddingBottom = el.frame.classList.contains('empty')
    ? `${el.dock.getBoundingClientRect().height + 24}px`
    : ''
}
// 画像を収めたい表示領域（画面座標）= ステージの content box（padding を除いた内側）
function contentBox(): Box {
  const sr = el.stage.getBoundingClientRect()
  const cs = getComputedStyle(el.stage)
  return {
    left: sr.left + parseFloat(cs.paddingLeft),
    top: sr.top + parseFloat(cs.paddingTop),
    right: sr.right - parseFloat(cs.paddingRight),
    bottom: sr.bottom - parseFloat(cs.paddingBottom),
  }
}
// transform 前のキャンバス表示サイズ（CSS px）
function baseSize(): { w: number; h: number } {
  return { w: parseFloat(cv.style.width) || 0, h: parseFloat(cv.style.height) || 0 }
}
function fitCanvasToStage(): void {
  if (!cv.width || !cv.height) return
  const cs = getComputedStyle(el.stage)
  const padX = parseFloat(cs.paddingLeft) + parseFloat(cs.paddingRight)
  const padY = parseFloat(cs.paddingTop) + parseFloat(cs.paddingBottom)
  const boxW = el.stage.clientWidth - padX
  const boxH = el.stage.clientHeight - padY
  if (boxW <= 0 || boxH <= 0) return
  const { w, h } = containFit(boxW, boxH, cv.width, cv.height)
  cv.style.width = `${w}px`
  cv.style.height = `${h}px`
}
function applyView(): void {
  cv.style.transform = `translate(${view.tx}px, ${view.ty}px) scale(${view.scale})`
}
function resetView(): void {
  view.scale = 1
  view.tx = 0
  view.ty = 0
  applyView()
}
// ステージのサイズ変化（回転・ウィンドウリサイズ・safe-area 変化）に追従
new ResizeObserver(() => {
  if (ready) {
    resetView() // レイアウトが変わったらズームは等倍に戻す
    layoutStage()
    fitCanvasToStage()
  }
}).observe(el.stage)
layoutStage() // 空状態でもヘッダー分の余白を確保

/* ---------- マスク（ソフト円） ---------- */
function softCore(c: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const g = c.createRadialGradient(x, y, 0, x, y, r)
  g.addColorStop(0, 'rgba(255,255,255,1)')
  g.addColorStop(0.5, 'rgba(255,255,255,0.95)')
  g.addColorStop(1, 'rgba(255,255,255,0)')
  c.globalCompositeOperation = 'lighten'
  c.fillStyle = g
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fill()
  c.globalCompositeOperation = 'source-over'
}
function stampStroke(c: CanvasRenderingContext2D, pts: { x: number; y: number }[], w: number): void {
  const r = w / 2
  for (const p of stampPositions(pts, r)) softCore(c, p.x, p.y, r)
}
function rebuildMask(): void {
  mctx.clearRect(0, 0, mask.width, mask.height)
  for (const s of strokes) stampStroke(mctx, s.pts, s.w)
}

/* ---------- 入力 ---------- */
// getBoundingClientRect は CSS transform を反映するので、ズーム中も座標は正しくマップされる
function pos(e: { clientX: number; clientY: number }): { x: number; y: number } {
  const r = cv.getBoundingClientRect()
  return toCanvasPoint(e.clientX, e.clientY, r, cv.width, cv.height)
}
function brushW(): number {
  const r = cv.getBoundingClientRect()
  return toCanvasBrush(+el.brush.value, r.width, cv.width)
}
let raf = 0
function scheduleRender(): void {
  if (!raf)
    raf = requestAnimationFrame(() => {
      raf = 0
      render()
    })
}

/* --- 描画（1本指） --- */
function startStroke(e: PointerEvent): void {
  const p = pos(e)
  activeW = brushW()
  strokes = reduceStrokes(strokes, { type: 'start', point: p, w: activeW })
  lastPt = p
  drawing = true
  softCore(mctx, p.x, p.y, activeW / 2)
  scheduleRender()
}
function extendStroke(e: PointerEvent): void {
  if (!lastPt) return
  const p = pos(e)
  strokes = reduceStrokes(strokes, { type: 'extend', point: p })
  const r = activeW / 2
  for (const s of stampPositions([lastPt, p], r)) softCore(mctx, s.x, s.y, r)
  lastPt = p
  scheduleRender()
}
function endStroke(): void {
  if (!drawing) return
  drawing = false
  lastPt = null
  syncButtons()
}
// 2本指目が触れたら、開始済みストロークは取り消してジェスチャに切り替える
function discardStroke(): void {
  if (!drawing) return
  strokes = reduceStrokes(strokes, { type: 'undo' })
  rebuildMask()
  drawing = false
  lastPt = null
  scheduleRender()
}

/* --- ズーム/パン（2本指） --- */
const pointers = new Map<number, Vec>()
let gesture: { ids: number[]; prev: Pair; layoutL: number; layoutT: number } | null = null

function beginGesture(): void {
  const ids = [...pointers.keys()].slice(0, 2)
  const a = pointers.get(ids[0])!
  const b = pointers.get(ids[1])!
  const r = cv.getBoundingClientRect() // 左上 = layout原点 + 現在の平行移動（origin:0 0）
  gesture = {
    ids,
    prev: { a: { ...a }, b: { ...b } },
    layoutL: r.left - view.tx,
    layoutT: r.top - view.ty,
  }
}
function updateGesture(): void {
  if (!gesture) return
  const a = pointers.get(gesture.ids[0])
  const b = pointers.get(gesture.ids[1])
  if (!a || !b) return
  const cur: Pair = { a: { ...a }, b: { ...b } }
  const sv = { s: view.scale, dx: gesture.layoutL + view.tx, dy: gesture.layoutT + view.ty }
  const nv = pinch(sv, gesture.prev, cur, MIN_SCALE, MAX_SCALE)
  // 表示領域に収める（上端がヘッダーに潜らない・縁に隙間を作らない）
  const cl = clampView(nv, baseSize(), contentBox())
  view.scale = cl.s
  view.tx = cl.dx - gesture.layoutL
  view.ty = cl.dy - gesture.layoutT
  applyView()
  gesture.prev = cur
}

cv.addEventListener('pointerdown', (e) => {
  if (!ready) return
  cv.setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 1) {
    startStroke(e)
  } else if (pointers.size === 2) {
    discardStroke() // 1本目で塗り始めていたら取り消す
    beginGesture()
  }
})
cv.addEventListener('pointermove', (e) => {
  const p = pointers.get(e.pointerId)
  if (!p) return
  p.x = e.clientX
  p.y = e.clientY
  if (gesture) {
    if (gesture.ids.includes(e.pointerId)) updateGesture()
    return
  }
  if (drawing) extendStroke(e)
})
function liftPointer(e: PointerEvent): void {
  pointers.delete(e.pointerId)
  if (gesture) {
    if (pointers.size < 2) gesture = null // 残った指では描かない（全て離すまで待つ）
    return
  }
  endStroke()
}
cv.addEventListener('pointerup', liftPointer)
cv.addEventListener('pointercancel', liftPointer)

/* ---------- スライダー / モード ---------- */
el.block.addEventListener('input', () => {
  el.blockVal.textContent = `${el.block.value} px`
  buildEffect()
  render()
})
el.blur.addEventListener('input', () => {
  el.blurVal.textContent = `${el.blur.value} px`
  buildEffect()
  render()
})
el.tex.addEventListener('input', () => {
  el.texVal.textContent = `${el.tex.value} %`
  buildEffect()
  render()
})
el.brush.addEventListener('input', () => {
  el.brushVal.textContent = `${el.brush.value} px`
})

const modeSeg = byId('modeSeg')
modeSeg.addEventListener('click', (e) => {
  const b = (e.target as HTMLElement).closest('button')
  if (!b) return
  mode = b.dataset.mode as Mode
  for (const x of Array.from(modeSeg.children)) x.classList.toggle('on', x === b)
  const g = modeGating(mode)
  el.blur.disabled = g.blurDisabled
  el.tex.disabled = g.texDisabled
  el.blurRow.classList.toggle('off', g.blurDisabled)
  el.texRow.classList.toggle('off', g.texDisabled)
  buildEffect()
  render()
})

/* ---------- 画像選択 ---------- */
const fileInput = byId<HTMLInputElement>('file')
byId('pick').addEventListener('click', () => fileInput.click())
el.frame.addEventListener('click', () => {
  if (!ready) fileInput.click()
})
fileInput.addEventListener('change', () => {
  const f = fileInput.files?.[0]
  if (!f) return
  originalName = f.name || null
  const r = new FileReader()
  r.onload = () => loadImage(r.result as string)
  r.onerror = () => {
    el.status.textContent = '読み込めませんでした'
  }
  r.readAsDataURL(f)
})

/* ---------- 取消 / 消去 ---------- */
el.undo.addEventListener('click', () => {
  strokes = reduceStrokes(strokes, { type: 'undo' })
  rebuildMask()
  render()
  syncButtons()
})
el.reset.addEventListener('click', () => {
  strokes = reduceStrokes(strokes, { type: 'clear' })
  rebuildMask()
  render()
  syncButtons()
})

/* ---------- 保存（Share ファースト） ---------- */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}
function openInNewTab(blob: Blob): void {
  const url = URL.createObjectURL(blob)
  window.open(url, '_blank')
  el.status.textContent = '保存できなければ画像を長押し'
  setTimeout(() => URL.revokeObjectURL(url), 60000)
}
function save(): void {
  const filename = outputFileName(originalName, mode)
  cv.toBlob((blob) => {
    if (!blob) return
    const strategy = pickSaveStrategy(detectSaveCaps())
    if (strategy === 'share') {
      const file = new File([blob], filename, { type: 'image/png' })
      // title は渡さない（iOS で画像がテキスト扱いされるバグ回避）
      navigator.share({ files: [file] }).catch(() => openInNewTab(blob))
      return
    }
    if (strategy === 'newtab') {
      openInNewTab(blob)
      return
    }
    downloadBlob(blob, filename)
  }, 'image/png')
}
el.save.addEventListener('click', save)

/* ---------- ドック開閉 ----------
   開いている間は画像に重なってよい。画像（ステージ）をタップすると閉じ、
   その1タップは描画に使わない（次のタップから塗れる）。 */
const dockToggle = byId('dockToggle')
function setDockOpen(open: boolean): void {
  el.dock.classList.toggle('open', open)
  dockToggle.setAttribute('aria-expanded', String(open))
}
dockToggle.addEventListener('click', () => {
  setDockOpen(!el.dock.classList.contains('open'))
})
// ステージ上のタップでドックを閉じ、その pointerdown は飲み込む（capture で canvas より先に処理）
el.stage.addEventListener(
  'pointerdown',
  (e) => {
    if (!el.dock.classList.contains('open')) return
    setDockOpen(false)
    e.stopPropagation() // canvas の pointerdown を発火させない＝この1タップは描画しない
  },
  true,
)

/* ---------- About モーダル ---------- */
const aboutBackdrop = byId('aboutBackdrop')
byId('info').addEventListener('click', () => {
  aboutBackdrop.hidden = false
})
byId('aboutClose').addEventListener('click', () => {
  aboutBackdrop.hidden = true
})
aboutBackdrop.addEventListener('click', (e) => {
  if (e.target === aboutBackdrop) aboutBackdrop.hidden = true
})

/* ---------- ボタン活性 ---------- */
function syncButtons(): void {
  const s = controlState(hasStrokes(strokes), ready)
  el.undo.disabled = s.undoDisabled
  el.reset.disabled = s.resetDisabled
  el.save.disabled = s.saveDisabled
}

/* ---------- 起動 ---------- */
el.blurRow.classList.remove('off')
el.texRow.classList.remove('off')
el.status.textContent = '画像を選ぶ'
