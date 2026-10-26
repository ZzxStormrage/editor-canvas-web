import assert from 'node:assert/strict'
import test from 'node:test'
import { Direction9 } from '@leafer-ui/draw'

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

test('text corner scaling updates font metrics and restores node scale', () => {
  const plugin = new TextPlugin()
  const text = createText({
    fontSize: 18,
    lineHeight: 24,
    letterSpacing: 2,
    scaleX: 1.5,
    scaleY: 1.5,
    scaleOfWorld(_origin, scaleX, scaleY) {
      this.scaleX *= scaleX
      this.scaleY *= scaleY
    }
  })

  plugin._applyTextFontScale(text, { worldOrigin: { x: 20, y: 40 } }, {
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
    scaleX: 1,
    scaleY: 1
  })

  assert.equal(text.fontSize, 18)
  assert.equal(text.lineHeight, 24)
  assert.equal(text.letterSpacing, 1.5)
  assert.equal(text.scaleX, 1)
  assert.equal(text.scaleY, 1)
})

test('new text defaults to centered alignment and centered placement', () => {
  const plugin = new TextPlugin()
  plugin._context = {
    artboard: {
      getContentBounds: () => ({ x: 100, y: 50, width: 400, height: 300 })
    }
  }

  const options = plugin._normalizeAddOptions({}, {
    width: 800,
    height: 600,
    textOptions: { fontSize: 32 }
  })

  assert.equal(options.textAlign, 'center')
  assert.equal(options.x, 300)
  assert.equal(options.y, 184)
})

test('right-side text resize changes the frame without changing font metrics', () => {
  const plugin = new TextPlugin()
  const text = createText({
    fontSize: 12,
    scaleX: 2,
    scaleY: 1,
    scaleOfWorld(_origin, scaleX, scaleY) {
      this.scaleX *= scaleX
      this.scaleY *= scaleY
    }
  })
  plugin._textScaleBaseline = {
    text,
    direction: Direction9.right,
    fontSize: 12,
    lineHeight: null,
    letterSpacing: 0,
    scaleX: 1,
    scaleY: 1
  }
  plugin._context = {
    innerEditor: {
      list: [text],
      updateEditBox() {}
    },
    eventBus: { emit() {} }
  }
  plugin._emitSelected = () => {}

  plugin._handleScale({ target: text, direction: Direction9.right })

  assert.equal(text.fontSize, 12)
  assert.equal(text.scaleX, 2)
  assert.equal(text.scaleY, 1)
})
