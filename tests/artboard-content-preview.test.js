import assert from 'node:assert/strict'
import test from 'node:test'

import {
  areContentPreviewBoundsEqual,
  resolveContentLayerOpacity
} from '../src/utils/content-preview.js'

test('content preview compares bounds without rebuilding unchanged overlays', () => {
  const bounds = { x: 20, y: 30, width: 200, height: 120 }

  assert.equal(areContentPreviewBoundsEqual(bounds, { ...bounds }), true)
  assert.equal(areContentPreviewBoundsEqual(bounds, { ...bounds, width: 240 }), false)
  assert.equal(areContentPreviewBoundsEqual(null, null), true)
  assert.equal(areContentPreviewBoundsEqual(bounds, null), false)
})

test('content preview hides the real layer and restores overflow opacity', () => {
  assert.equal(resolveContentLayerOpacity({ x: 0, y: 0, width: 100, height: 100 }, 0.45), 0)
  assert.equal(resolveContentLayerOpacity(null, 0.45), 0.45)
})
