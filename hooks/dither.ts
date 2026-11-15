export const SCENE_WIDTH = 1600
export const SCENE_HEIGHT = 1000
export const ACCENT = '#fe6a00'
/// Each scene paints its own ground, Isometric's dark page: in the app a transparent scene sat
/// still, so the theme is dark only.
export const GROUND = '#0c0b09'

/// One dither dot, in scene units, on an ordered 8x8 Bayer grid.
export const CELL = 4
const BAYER_SIDE = 8
const TILE = CELL * BAYER_SIDE
const BAYER_LEVELS = 64
const BAYER_8 = [
  0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52,
  20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45,
  5, 37, 63, 31, 55, 23, 61, 29, 53, 21,
]

export type Dither = { fill: (colour: string, level: number) => string; defs: () => string }

/// Dot fields for one scene: `fill` names a Bayer tile with the cells under the level lit, so a
/// tone becomes dots and never a tint, and `defs` writes every tile the scene asked for.
export function createDither(): Dither {
  const patterns = new Map<string, string>()

  const fill = (colour: string, level: number): string => {
    const lit = Math.round(level * BAYER_LEVELS)
    const id = `d${colour.slice(1)}-${lit}`

    if (!patterns.has(id)) {
      let cells = ''

      BAYER_8.forEach((threshold, index) => {
        if (threshold < lit) {
          cells += `M${(index % BAYER_SIDE) * CELL} ${Math.floor(index / BAYER_SIDE) * CELL}h${CELL}v${CELL}h-${CELL}z`
        }
      })
      patterns.set(
        id,
        `<pattern id="${id}" width="${TILE}" height="${TILE}" patternUnits="userSpaceOnUse"><path d="${cells}" fill="${colour}"/></pattern>`,
      )
    }

    return `url(#${id})`
  }

  return { fill, defs: () => [...patterns.values()].join('') }
}

/// A fixed-seed sequence, so a scene is the same on every reload.
export function seededRandom(seed: number): () => number {
  let state = seed

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296

    return state / 4294967296
  }
}

/// A stable pseudo-random value in [0, 1) for an integer seed, as the web app's dither uses.
export function hashUnitInterval(value: number): number {
  const scaled = Math.sin(value * 12.9898) * 43758.5453

  return scaled - Math.floor(scaled)
}
