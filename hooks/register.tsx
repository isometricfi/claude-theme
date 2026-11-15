import type { Register, ThemeSetArgs } from 'claude-code'

import { BLOCKS_SCENE } from './blocks.ts'
import { FUNNEL_SCENE } from './funnel.ts'
import { makeColors } from './make-colors.js'

const PLUGIN_NAME = 'isometric-dither'
const COMMAND = 'isometric-theme'
const STORE_KEY = 'scene'

type Scene = { name: string; source: string; alt: string; blurb: string }

const FUNNEL: Scene = {
  name: 'funnel',
  source: FUNNEL_SCENE,
  alt: 'Dithered price paths flowing down into one expiry point',
  blurb: 'price paths settling into one expiry point',
}
const BLOCKS: Scene = {
  name: 'blocks',
  source: BLOCKS_SCENE,
  alt: 'A row of dithered isometric blocks slowly rising and falling',
  blurb: 'a row of isometric blocks rising and falling',
}
const SCENES = [FUNNEL, BLOCKS]
const DEFAULT_SCENE = FUNNEL

// Isometric's web app colour tokens, converted from oklch.
const { theme, problems } = makeColors({
  label: 'Isometric dither',
  only: 'dark',
  roles: { accent: '#fe6a00', pro: '#7a5cd6' },
  dark: {
    roles: { danger: '#f34e67', success: '#14ca80', warning: '#ecae30' },
    gray: {
      anchors: {
        'surface-0': '#0c0b09',
        'surface-1': '#161312',
        'surface-2': '#1d1a18',
        'surface-3': '#24211e',
        'text-primary': '#f3f1f0',
        'text-secondary': '#c9c4c0',
        'text-muted': '#a49d97',
      },
    },
  },
})

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const result = await next(e)
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }
    await $.command.register({
      name: COMMAND,
      description: 'Switch the Isometric backdrop: funnel or blocks',
      argumentHint: 'funnel | blocks',
      immediate: true,
    })
    await $.theme.set(look(sceneNamed(await $.store.get(STORE_KEY))))

    return result
  })

  on('command.run', { command: COMMAND }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()
    const current = sceneNamed(await $.store.get(STORE_KEY))

    if (asked === '') {
      return { text: `Showing ${current.name}: ${current.blurb}. ${choices()}` }
    }
    const scene = SCENES.find(one => one.name === asked)

    if (scene === undefined) {
      return { text: `No scene called "${asked}". ${choices()}` }
    }
    await $.store.set(STORE_KEY, scene.name)
    await $.theme.set(look(scene))

    return { text: `Switched to ${scene.name}: ${scene.blurb}.` }
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if (e.surface !== 'desktop' && e.surface !== 'mobile') {
      return next(e)
    }
    const scene = SCENES.find(one => one.name === e.props.scene)

    if (e.props.plugin !== PLUGIN_NAME || scene === undefined) {
      return next(e)
    }

    const { Svg } = $.ui.resolve(e)

    return <Svg source={scene.source} alt={scene.alt} isInteractive />
  })
}

/// The stored choice, or the default when nothing valid is stored.
function sceneNamed(stored: unknown): Scene {
  return SCENES.find(one => one.name === stored) ?? DEFAULT_SCENE
}

// A light blur and a thin veil keep the dots, and their motion, readable behind the panels.
function look(scene: Scene): ThemeSetArgs {
  return { colors: theme, backdrop: { scene: scene.name, glass: { blur: 4, opacity: 0.45 } } }
}

function choices(): string {
  return `Choose with /${COMMAND} ${SCENES.map(one => one.name).join(' or ')}.`
}
