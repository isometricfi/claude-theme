import { ACCENT, CELL, createDither, GROUND, SCENE_HEIGHT, SCENE_WIDTH, seededRandom } from './dither.ts'

const INK = '#8f8780'
const SPARK_COUNT = 46

/// A block is a square column seen in isometric projection: a diamond top over two side faces.
/// Its half width is two dither tiles, so every block meets the dot grid the same way.
const BLOCK_HALF_WIDTH = CELL * 8 * 2
const BLOCK_TOP_HALF_HEIGHT = BLOCK_HALF_WIDTH / 2
const BLOCK_COUNT = 14
/// Far enough below the scene that a block never shows its foot at the top of its rise.
const BLOCK_FOOT_Y = SCENE_HEIGHT + 120

/// The row is low under the conversation and climbs toward the window's edges.
const CENTRE_TOP_Y = 892
const EDGE_CLIMB = 250

/// Three tones, as an isometric drawing lights its faces: the top brightest, then left, then right.
const TOP_LEVEL = 0.42
const LEFT_LEVEL = 0.2
const RIGHT_LEVEL = 0.08
const ACCENT_TOP_LEVEL = 0.62
/// The blocks whose tops are lit orange.
const ACCENT_BLOCKS = [2, 9]

type Block = { centreX: number; topY: number; riseCells: number; seconds: number; delaySeconds: number }

const dither = createDither()

function buildBlocks(): Block[] {
  const random = seededRandom(41)
  const blocks: Block[] = []

  for (let index = 0; index < BLOCK_COUNT; index += 1) {
    const centreX = (index - 0.5) * BLOCK_HALF_WIDTH * 2
    const fromCentre = Math.abs(centreX - SCENE_WIDTH / 2) / (SCENE_WIDTH / 2)
    const topY = CENTRE_TOP_Y - EDGE_CLIMB * Math.pow(Math.min(1, fromCentre), 1.6) - random() * 56
    const riseCells = 10 + Math.floor(random() * 14)
    const seconds = 10 + random() * 10

    blocks.push({
      centreX,
      topY: Math.round(topY / CELL) * CELL,
      riseCells,
      seconds,
      delaySeconds: random() * seconds * 2,
    })
  }

  return blocks
}

/// A block is one group of three dithered faces that rises and falls a whole dot at a time. Its
/// dots travel with it, and every step is one dot, so they always land back on the grid.
function blockPart(block: Block, index: number): string {
  const { centreX: x, topY: y } = block
  const isLit = ACCENT_BLOCKS.includes(index)
  const top = `${x} ${y - BLOCK_TOP_HALF_HEIGHT}L${x + BLOCK_HALF_WIDTH} ${y}L${x} ${y + BLOCK_TOP_HALF_HEIGHT}L${x - BLOCK_HALF_WIDTH} ${y}`
  const left = `${x - BLOCK_HALF_WIDTH} ${y}L${x} ${y + BLOCK_TOP_HALF_HEIGHT}L${x} ${BLOCK_FOOT_Y}L${x - BLOCK_HALF_WIDTH} ${BLOCK_FOOT_Y}`
  const right = `${x} ${y + BLOCK_TOP_HALF_HEIGHT}L${x + BLOCK_HALF_WIDTH} ${y}L${x + BLOCK_HALF_WIDTH} ${BLOCK_FOOT_Y}L${x} ${BLOCK_FOOT_Y}`

  return (
    `<g class="block-${index}" style="animation-delay:-${block.delaySeconds.toFixed(1)}s">` +
    `<path d="M${right}Z" fill="${dither.fill(INK, RIGHT_LEVEL)}"/>` +
    `<path d="M${left}Z" fill="${dither.fill(INK, LEFT_LEVEL)}"/>` +
    `<path d="M${top}Z" fill="${dither.fill(isLit ? ACCENT : INK, isLit ? ACCENT_TOP_LEVEL : TOP_LEVEL)}"/>` +
    `</g>`
  )
}

/// The app drops a scene's whole stylesheet over one rule it does not take (custom properties,
/// `translate`, `d`), so each block gets its own keyframes with plain numbers in them.
function blockKeyframes(block: Block, index: number): string {
  return (
    `.block-${index}{animation:block-${index} ${block.seconds.toFixed(1)}s steps(${block.riseCells}) infinite alternate}` +
    `@keyframes block-${index}{from{transform:translateY(0)}to{transform:translateY(-${block.riseCells * CELL}px)}}`
  )
}

/// Single dither dots that brighten and fade on their own slow cycles, above the row. They keep
/// to the window's sides, away from the conversation. Their smooth fades keep the frame drawing:
/// in the app a scene of stepped motion alone sat still.
function sparks(): string {
  const random = seededRandom(7)
  let dots = ''

  for (let index = 0; index < SPARK_COUNT; index += 1) {
    const isLeft = index % 2 === 0
    const column = Math.floor(random() * 90)
    const x = (isLeft ? column : SCENE_WIDTH / CELL - 1 - column) * CELL
    const y = Math.floor((60 + random() * 640) / CELL) * CELL
    const colour = index % 7 === 0 ? ACCENT : INK
    const seconds = 3 + random() * 5

    dots += `<rect class="spark" x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${colour}" style="animation-duration:${seconds.toFixed(1)}s;animation-delay:-${(random() * 8).toFixed(1)}s"/>`
  }

  return dots
}

const BLOCKS = buildBlocks()
const BLOCK_PARTS = BLOCKS.map(blockPart).join('')
const BLOCK_STYLES = BLOCKS.map(blockKeyframes).join('\n')
const SPARKS = sparks()

/// A row of dithered isometric blocks that rise and fall, with sparks at the window's sides.
export const BLOCKS_SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}" preserveAspectRatio="xMidYMax slice">
<defs>${dither.defs()}</defs>
<style>
.spark{animation:spark 5s ease-in-out infinite alternate}
@keyframes spark{from{opacity:.1}to{opacity:.9}}
${BLOCK_STYLES}
@media (prefers-reduced-motion:reduce){g,.spark{animation:none!important}}
</style>
<rect width="${SCENE_WIDTH}" height="${SCENE_HEIGHT}" fill="${GROUND}"/>
${SPARKS}
${BLOCK_PARTS}
</svg>`
