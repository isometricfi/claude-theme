import { expect, test } from 'claude-code/testing'

const START = { cwd: '/', surface: 'desktop', isInteractive: true } as const

test('the funnel shows when no scene has been chosen', async ($, on) => {
  const scenes: unknown[] = []

  // given
  on('command.register', () => ({ value: { command: 'isometric-theme' } }))
  on('store.get', () => ({ value: undefined }))
  on('theme.set', (_, e) => {
    scenes.push(e.backdrop)

    return { value: { isDrawn: true } }
  })
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  // when
  await $.session.start(START)

  // then
  expect(scenes).toEqual([expect.objectContaining({ scene: 'funnel' })])
})

test('switching to blocks stores the choice and shows the blocks', async ($, on) => {
  const stored: unknown[] = []
  const scenes: unknown[] = []

  // given
  on('store.get', () => ({ value: 'funnel' }))
  on('store.set', (_, e) => {
    stored.push(e)

    return { value: undefined }
  })
  on('theme.set', (_, e) => {
    scenes.push(e.backdrop)

    return { value: { isDrawn: true } }
  })

  // when
  const answer = await $.command.run({ command: 'isometric-theme', args: 'blocks' })

  // then
  expect(answer.text).toBe('Switched to blocks: a row of isometric blocks rising and falling.')
  expect(stored).toEqual([expect.objectContaining({ value: 'blocks' })])
  expect(scenes).toEqual([expect.objectContaining({ scene: 'blocks' })])
})

test('an unknown scene changes nothing and names the choices', async ($, on) => {
  const scenes: unknown[] = []

  // given
  on('store.get', () => ({ value: 'blocks' }))
  on('theme.set', (_, e) => {
    scenes.push(e.backdrop)

    return { value: { isDrawn: true } }
  })

  // when
  const answer = await $.command.run({ command: 'isometric-theme', args: 'waves' })

  // then
  expect(answer.text).toBe('No scene called "waves". Choose with /isometric-theme funnel or blocks.')
  expect(scenes).toEqual([])
})
