/**
 * 氷霜ガラスの各レイヤーの不透明度を tex(0..1) から決める純関数。
 * v2 プロトタイプの applyFrostTexture / 霜レイヤー合成の係数をここに集約し、
 * Canvas 描画は app 側がこの値を使うだけにする。
 *
 * tex=0 では active=false（＝霜の質感・霜レイヤーを一切描かない）。
 * これにより「氷霜=0 で霜が完全に消え、下地のモザイク＋ぼかしだけ残る」を保証する。
 */

export interface FrostParams {
  /** tex>0 のときだけ霜の質感・霜レイヤーを描く */
  active: boolean
  /** 寒色白の散乱（soft-light fill の alpha） */
  scatter: number
  /** 微細グレイン（noise soft-light の globalAlpha） */
  grain: number
  /** 斜めの照り（screen グラデの中央ピーク alpha） */
  sheen: number
  /** 固定霜レイヤー画像（screen 合成の globalAlpha） */
  frostLayer: number
}

const clamp01 = (t: number): number => (t < 0 ? 0 : t > 1 ? 1 : t)

export function frostParams(tex: number): FrostParams {
  const t = clamp01(tex)
  if (t <= 0) {
    return { active: false, scatter: 0, grain: 0, sheen: 0, frostLayer: 0 }
  }
  return {
    active: true,
    scatter: 0.1 + 0.28 * t,
    grain: 0.12 + 0.4 * t,
    sheen: 0.14 * t,
    frostLayer: 0.85 * t,
  }
}
