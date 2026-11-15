import { ACCENT, CELL, createDither, GROUND, hashUnitInterval, SCENE_HEIGHT, SCENE_WIDTH } from './dither.ts'

const INK = '#a49d97'

// The footer's funnel turned over for a window: the expiry point sits low, behind the prompt
// box, and the price paths fan up and out to the top corners, so the middle stays sparse.
const EXPIRY_X = SCENE_WIDTH / 2
const EXPIRY_Y = 900
const LANES = 15
const CORE_LANES = 1.5
/// How far past the window's sides the outer lanes reach at the top, as a share of half the width.
const TOP_SPREAD = 1.15
const SPREAD_POWER = 1.4
const LANE_STEP_Y = 20
const LANE_WIDTH = 12
/// The orange core lanes surface partway down, so the orange gathers only near expiry and the
/// middle of the window above the conversation stays grey and sparse.
const CORE_START_SHARE = 0.45

const BASE_LEVEL = 0.12
const PACKET_LEVEL = 0.34
const CORE_BASE_LEVEL = 0.16
const CORE_PACKET_LEVEL = 0.56
const PACKET_LENGTH = 70
const PACKET_PERIOD = 360
/// Scene units a packet travels each second, before each lane's own variation.
const PACKET_SPEED = 34

/// The ripple is fixed rings lit one after another: scaling a ring would smear its dots.
const RING_COUNT = 5
const RING_GAP = 32
const RING_STAGGER_SECONDS = 0.3
const RING_SECONDS = 7
const STAR_COUNT = 60

const dither = createDither()

/// A lane runs from above the window down into the expiry point, narrowing as the footer's do.
function lanePath(lane: number, startY: number): string {
  const across = ((lane + 0.5) / LANES) * 2 - 1
  const points: string[] = []

  for (let y = startY; y <= EXPIRY_Y; y += LANE_STEP_Y) {
    const spread = Math.max(0, 1 - y / EXPIRY_Y)
    const halfWidth = (SCENE_WIDTH / 2) * TOP_SPREAD * spread ** SPREAD_POWER

    points.push(`${Math.round(EXPIRY_X + across * halfWidth)} ${y}`)
  }

  return `M${points.join('L')}`
}

function lanes(): string {
  const centreLane = (LANES - 1) / 2
  let out = ''

  for (let lane = 0; lane < LANES; lane += 1) {
    const fromCentre = Math.abs(lane - centreLane)
    const isCore = fromCentre < CORE_LANES
    const colour = isCore ? ACCENT : INK
    const seed = hashUnitInterval(fromCentre + 1)
    const seconds = PACKET_PERIOD / (PACKET_SPEED * (0.7 + seed * 0.6))
    const path = lanePath(lane, isCore ? Math.round(EXPIRY_Y * CORE_START_SHARE) : -LANE_STEP_Y)

    out +=
      `<path d="${path}" fill="none" stroke="${dither.fill(colour, isCore ? CORE_BASE_LEVEL : BASE_LEVEL)}" stroke-width="${LANE_WIDTH}"/>` +
      `<path class="packet" d="${path}" fill="none" stroke="${dither.fill(colour, isCore ? CORE_PACKET_LEVEL : PACKET_LEVEL)}" stroke-width="${LANE_WIDTH}" stroke-dasharray="${PACKET_LENGTH} ${PACKET_PERIOD - PACKET_LENGTH}" style="animation-duration:${seconds.toFixed(1)}s;animation-delay:-${(seed * seconds).toFixed(1)}s"/>`
  }

  return out
}

/// The expiry line, the settled price leaving the point downward, the point and its ring.
function expiry(): string {
  return (
    `<path d="M0 ${EXPIRY_Y}H${SCENE_WIDTH}" stroke="${dither.fill(INK, 0.3)}" stroke-width="${CELL}" stroke-dasharray="${CELL * 2} ${CELL * 2}"/>` +
    `<path class="packet" d="M${EXPIRY_X} ${EXPIRY_Y}V${SCENE_HEIGHT + PACKET_PERIOD}" fill="none" stroke="${dither.fill(ACCENT, 0.8)}" stroke-width="${CELL}" stroke-dasharray="${PACKET_LENGTH} ${PACKET_PERIOD - PACKET_LENGTH}" style="animation-duration:6s"/>` +
    `<g transform="translate(${EXPIRY_X} ${EXPIRY_Y})">` +
    ripple() +
    `<rect class="pulse" x="-${CELL * 2}" y="-${CELL * 2}" width="${CELL * 4}" height="${CELL * 4}" fill="${ACCENT}"/>` +
    `</g>`
  )
}

function ripple(): string {
  let rings = ''

  for (let ring = 0; ring < RING_COUNT; ring += 1) {
    const level = 0.6 * (1 - ring / RING_COUNT)

    rings += `<circle class="ring" r="${(ring + 1) * RING_GAP}" fill="none" stroke="${dither.fill(ACCENT, level)}" stroke-width="${CELL * 2}" style="animation-delay:${(ring * RING_STAGGER_SECONDS).toFixed(1)}s"/>`
  }

  return rings
}

/// Single dither dots that brighten and fade, as the footer's stars do.
function stars(): string {
  let out = ''

  for (let index = 0; index < STAR_COUNT; index += 1) {
    const x = Math.floor(hashUnitInterval(index * 3 + 1) * (SCENE_WIDTH / CELL)) * CELL
    const y = Math.floor(hashUnitInterval(index * 3 + 2) * ((EXPIRY_Y - 40) / CELL)) * CELL
    const seconds = 3 + hashUnitInterval(index * 3 + 3) * 5

    out += `<rect class="star" x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${INK}" style="animation-duration:${seconds.toFixed(1)}s;animation-delay:-${(seconds * hashUnitInterval(index)).toFixed(1)}s"/>`
  }

  return out
}

const FIGURE = stars() + lanes() + expiry()

/// Price paths falling from the top corners into one expiry point, after the site's footer.
export const FUNNEL_SCENE = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${SCENE_WIDTH} ${SCENE_HEIGHT}" preserveAspectRatio="xMidYMax slice">
<defs>${dither.defs()}</defs>
<style>
.packet{animation:flow 10s linear infinite}
.ring{opacity:0;animation:ring ${RING_SECONDS}s ease-out infinite}
.pulse{animation:pulse 1.6s ease-in-out infinite alternate}
.star{animation:star 5s ease-in-out infinite alternate}
@keyframes flow{from{stroke-dashoffset:0}to{stroke-dashoffset:-${PACKET_PERIOD}}}
@keyframes ring{0%{opacity:0}4%{opacity:1}16%{opacity:0}100%{opacity:0}}
@keyframes pulse{from{opacity:.55}to{opacity:1}}
@keyframes star{from{opacity:.08}to{opacity:.8}}
@media (prefers-reduced-motion:reduce){.packet,.ring,.pulse,.star{animation:none!important}.ring{opacity:0}}
</style>
<rect width="${SCENE_WIDTH}" height="${SCENE_HEIGHT}" fill="${GROUND}"/>
${FIGURE}
</svg>`
