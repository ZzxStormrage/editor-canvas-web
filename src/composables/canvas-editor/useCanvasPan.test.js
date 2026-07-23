import assert from 'node:assert/strict'
import test from 'node:test'

import { useCanvasPan } from './useCanvasPan.js'

class FakeEventTarget {
  constructor() {
    this.listeners = new Map()
  }

  /** @param {string} type 事件类型。 @param {Function} listener 监听器。 @returns {void} */
  addEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? []
    listeners.push(listener)
    this.listeners.set(type, listeners)
  }

  /** @param {string} type 事件类型。 @param {Function} listener 监听器。 @returns {void} */
  removeEventListener(type, listener) {
    const listeners = this.listeners.get(type) ?? []
    this.listeners.set(type, listeners.filter((item) => item !== listener))
  }

  /** @param {string} type 事件类型。 @param {Object} event 事件数据。 @returns {void} */
  dispatch(type, event) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

class FakeHTMLElement extends FakeEventTarget {
  /** @param {string} [tagName='DIV'] 标签名。 */
  constructor(tagName = 'DIV') {
    super()
    this.tagName = tagName
    this.isContentEditable = false
  }
}

/**
 * 创建可观察 preventDefault 和 stopImmediatePropagation 的事件。
 *
 * @param {Object} [values={}] 事件字段。
 * @returns {Object} 模拟事件。
 */
function createEvent(values = {}) {
  return {
    defaultPrevented: false,
    immediatePropagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true
    },
    stopImmediatePropagation() {
      this.immediatePropagationStopped = true
    },
    ...values
  }
}

/**
 * 在隔离的 window 和 HTMLElement 环境中运行测试。
 *
 * @param {(context: { windowTarget: FakeEventTarget }) => void} run 测试逻辑。
 * @returns {void}
 */
function withBrowserGlobals(run) {
  const originalWindow = globalThis.window
  const originalHTMLElement = globalThis.HTMLElement
  const windowTarget = new FakeEventTarget()

  globalThis.window = windowTarget
  globalThis.HTMLElement = FakeHTMLElement

  try {
    run({ windowTarget })
  } finally {
    globalThis.window = originalWindow
    globalThis.HTMLElement = originalHTMLElement
  }
}

test('canvas pan moves the viewport only while space and the primary pointer are active', () => {
  withBrowserGlobals(({ windowTarget }) => {
    const view = new FakeHTMLElement()
    const panCalls = []
    const controls = useCanvasPan(() => ({
      panBy(deltaX, deltaY) {
        panCalls.push([deltaX, deltaY])
      }
    }))

    controls.setView(view)
    controls.start()

    const keyDown = createEvent({ code: 'Space', key: ' ', target: new FakeHTMLElement() })
    windowTarget.dispatch('keydown', keyDown)
    assert.equal(controls.panReady.value, true)
    assert.equal(keyDown.defaultPrevented, true)

    const pointerDown = createEvent({
      button: 0,
      clientX: 100,
      clientY: 120,
      isPrimary: true,
      pointerId: 7
    })
    view.dispatch('pointerdown', pointerDown)
    assert.equal(controls.panning.value, true)
    assert.equal(pointerDown.immediatePropagationStopped, true)

    windowTarget.dispatch('pointermove', createEvent({
      clientX: 132,
      clientY: 111,
      pointerId: 7
    }))
    assert.deepEqual(panCalls, [[32, -9]])

    windowTarget.dispatch('pointerup', createEvent({ pointerId: 7 }))
    assert.equal(controls.panning.value, false)
    assert.equal(controls.panReady.value, true)

    windowTarget.dispatch('keyup', createEvent({ code: 'Space', key: ' ' }))
    assert.equal(controls.panReady.value, false)
    controls.stop()
  })
})

test('canvas pan preserves spaces typed in form controls', () => {
  withBrowserGlobals(({ windowTarget }) => {
    const controls = useCanvasPan(() => null)
    controls.start()

    const inputEvent = createEvent({
      code: 'Space',
      key: ' ',
      target: new FakeHTMLElement('INPUT')
    })
    windowTarget.dispatch('keydown', inputEvent)

    assert.equal(controls.panReady.value, false)
    assert.equal(inputEvent.defaultPrevented, false)
    controls.stop()
  })
})
