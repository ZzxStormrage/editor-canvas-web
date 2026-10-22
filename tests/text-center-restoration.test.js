import assert from 'node:assert/strict'
import test from 'node:test'

globalThis.window = globalThis
for (const name of [
  'CanvasRenderingContext2D',
  'Path2D',
  'Image',
  'PointerEvent',
  'DragEvent',
  'MouseEvent',
  'TouchEvent',
  'KeyboardEvent',
  'WheelEvent',
  'Event',
  'UIEvent',
  'FocusEvent'
]) {
  globalThis[name] ??= class {}
}
globalThis.document = {
  createElement: () => ({
    style: {},
    getContext: () => ({})
  })
}

const { TextPlugin } = await import('../src/plugins/feature-plugins/text/text-plugin.js')

function createText(overrides = {}) {
  return {
    tag: 'Text',
    parent: {},
    destroyed: false,
    x: 10,
    y: 20,
    width: 40,
    height: 40,
    set(options) {
      Object.assign(this, options)
    },
    forceUpdate() {},
    updateLayout() {},
    ...overrides
  }
}

test('text center is restored after asynchronous vertical layout', () => {
  const callbacks = []
  globalThis.requestAnimationFrame = (callback) => callbacks.push(callback)
  const plugin = new TextPlugin()
  const text = createText()

  plugin._restoreTextCenterAfterLayout(text, { x: 30, y: 40 })
  text.height = 80
  callbacks[0]()

  assert.equal(text.x, 10)
  assert.equal(text.y, 0)
})

test('stale center restoration is ignored during continuous input', () => {
  const callbacks = []
  globalThis.requestAnimationFrame = (callback) => callbacks.push(callback)
  const plugin = new TextPlugin()
  const text = createText()

  plugin._restoreTextCenterAfterLayout(text, { x: 30, y: 40 })
  plugin._restoreTextCenterAfterLayout(text, { x: 50, y: 60 })
  text.height = 80
  callbacks[0]()

  assert.equal(text.x, 10)
  assert.equal(text.y, 20)

  callbacks[1]()

  assert.equal(text.x, 30)
  assert.equal(text.y, 20)
})
