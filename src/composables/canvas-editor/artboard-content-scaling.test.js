import assert from 'node:assert/strict'
import test from 'node:test'

import { resizeArtboardWithContent } from './artboard-content-scaling.js'

test('same-ratio artboard resize scales every content element uniformly', () => {
  const background = createElement({ x: 0, y: 0, width: 500, height: 500 })
  const text = createElement({ x: 100, y: 150, scaleX: 1, scaleY: 1 })
  const editor = createEditor({ width: 500, height: 500 }, [background, text], [background])

  const result = resizeArtboardWithContent(editor, 2000, 2000)

  assert.equal(result.scale, 4)
  assert.deepEqual(background.state, {
    x: -750,
    y: -750,
    width: 2000,
    height: 2000,
    scaleX: 1,
    scaleY: 1,
    lockRatio: false
  })
  assert.equal(text.state.x, -350)
  assert.equal(text.state.y, -150)
  assert.equal(text.state.scaleX, 4)
  assert.equal(text.state.scaleY, 4)
})

test('different-ratio artboard resize contains and centers content without distortion', () => {
  const background = createElement({ x: 0, y: 0, width: 500, height: 500 })
  const image = createElement({ x: 100, y: 100, scaleX: 2, scaleY: 2 })
  const editor = createEditor({ width: 500, height: 500 }, [background, image], [background])

  const result = resizeArtboardWithContent(editor, 1000, 500)

  assert.equal(result.scale, 1)
  assert.equal(image.state.x, 100)
  assert.equal(image.state.y, 100)
  assert.equal(image.state.scaleX, 2)
  assert.equal(image.state.scaleY, 2)
  assert.equal(background.state.width, 1000)
  assert.equal(background.state.height, 500)
  assert.equal(background.state.x, -250)
})

/** @param {Object} initial 初始属性。 @returns {Object} 模拟元素。 */
function createElement(initial) {
  const element = {
    ...initial,
    state: {},
    set(patch) {
      Object.assign(this, patch)
      this.state = { ...patch }
    },
    forceUpdate() {},
    updateLayout() {}
  }

  return element
}

/**
 * @param {{ width: number, height: number }} initialBounds 初始画板。
 * @param {Object[]} elements 顶层元素。
 * @param {Object[]} backgrounds 背景元素。
 * @returns {Object} 模拟 Editor。
 */
function createEditor(initialBounds, elements, backgrounds) {
  let bounds = { x: 0, y: 0, ...initialBounds }

  return {
    contentLayer: { children: elements },
    artboard: {
      getContentBounds: () => ({ ...bounds }),
      syncAllElements() {}
    },
    eventBus: { emit() {} },
    getElementsByRole: () => backgrounds,
    setArtboardSize(width, height) {
      bounds = {
        x: bounds.x + (bounds.width - width) / 2,
        y: bounds.y + (bounds.height - height) / 2,
        width,
        height
      }
    },
    deselect() {}
  }
}
