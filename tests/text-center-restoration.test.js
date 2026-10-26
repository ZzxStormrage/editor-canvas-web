import assert from 'node:assert/strict'
import test from 'node:test'
import { scaleResizeFontSize } from '@leafer-in/resize'
import { Direction9 } from '@leafer-ui/draw'
import { getTextResizePointEditConfig, syncTextResizeControls } from '../src/utils/text-resize.js'

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

const { Editor } = await import('@leafer-in/editor')
const { Text: LeaferText } = await import('leafer-ui')
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

test('text resize control keeps top-left in font-size mode after bounds refresh', () => {
  const resizePoints = Array.from({ length: 8 }, () => ({
    visible: true,
    hittable: true,
    editConfig: { editSize: 'size', lockRatio: false }
  }))
  const resizeLines = Array.from({ length: 4 }, () => ({ visible: true, hittable: true }))

  resizePoints[0].editConfig = undefined
  syncTextResizeControls({ resizePoints, resizeLines })

  assert.deepEqual(resizePoints[0].editConfig, { editSize: 'font-size', lockRatio: true })
  assert.deepEqual(resizePoints[3].editConfig, { editSize: 'size', lockRatio: false })
  assert.equal(resizePoints[0].visible, true)
  assert.equal(resizePoints[3].visible, true)
  assert.equal(resizePoints[1].visible, false)
  assert.equal(resizePoints[1].hittable, false)
  assert.equal(resizeLines[0].visible, false)
  assert.equal(resizeLines[0].hittable, false)

  assert.deepEqual(getTextResizePointEditConfig(3), { editSize: 'size', lockRatio: false })
  assert.equal(getTextResizePointEditConfig(1), null)
})

test('restored top-left edit config activates Leafer font-size resizing', () => {
  const editor = new Editor()
  editor.editBox.config = { editSize: 'size', lockRatio: false }
  const point = editor.editBox.resizePoints[0]
  point.editConfig = undefined
  syncTextResizeControls(editor.editBox)
  editor.editBox.dragPoint = point

  const mergedConfig = editor.mergeConfig
  assert.equal(mergedConfig.editSize, 'font-size')
  assert.equal(mergedConfig.lockRatio, true)

  const text = Object.create(LeaferText.prototype)
  const textEditor = { dragPoint: point, mergedConfig }
  for (const [key, value] of Object.entries({
    app: { editor: textEditor },
    editConfig: { editSize: 'size' },
    __: {
      resizeFontSize: false,
      padding: 0,
      lineHeight: 0,
      letterSpacing: 0,
      __autoWidth: false,
      __autoHeight: false
    },
    __layout: {
      boxBounds: { width: 100, height: 20 },
      affectScaleOrRotation: false
    },
    fontSize: 16,
    width: 100,
    height: 20,
    x: 0,
    y: 0,
    scaleX: 1,
    scaleY: 1
  })) {
    Object.defineProperty(text, key, { value, writable: true, configurable: true })
  }

  text.__scaleResize(1.5, 1.5)

  assert.equal(text.fontSize, 24)
  assert.equal(text.width, 150)
  editor.destroy()
})

test('top-left text resize keeps the font size applied by Leafer', () => {
  const plugin = new TextPlugin()
  const text = createText({
    fontSize: 18,
    lineHeight: 24,
    scaleX: 1,
    scaleY: 1,
    __: {
      padding: 0,
      lineHeight: 24,
      letterSpacing: 0,
      __autoWidth: false,
      __autoHeight: false
    },
    __layout: {
      boxBounds: { width: 40, height: 40 },
      affectScaleOrRotation: false
    }
  })
  Object.defineProperty(text, 'lineHeight', {
    get() { return this.__.lineHeight },
    set(value) { this.__.lineHeight = value },
    configurable: true
  })
  const emitted = []
  plugin._context = {
    innerEditor: {
      list: [text],
      editBox: {
        dragging: true,
        dragPoint: { direction: Direction9.topLeft }
      },
      updateEditBox() {}
    },
    eventBus: { emit: (...args) => emitted.push(args) }
  }
  plugin._emitSelected = () => {}

  // Pointer scale events omit direction; it is available on the active edit point.
  plugin._handleBeforeScale({ target: text })

  // Leafer's native corner resize updates font metrics without changing node scale.
  scaleResizeFontSize(text, 1.5, 1.5, Direction9.topLeft)
  plugin._handleScale({ target: text })

  assert.equal(text.fontSize, 27)
  assert.equal(text.lineHeight, 36)

  plugin._handleScaleEnd()

  assert.equal(text.fontSize, 27)
  assert.equal(text.lineHeight, 36)
  assert.equal(emitted.at(-1)[0], 'text:updated')
})
