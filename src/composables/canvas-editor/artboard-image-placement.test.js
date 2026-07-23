import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveContainedImagePlacement } from './artboard-image-placement.js'

test('wide mask is contained without changing its aspect ratio', () => {
  assert.deepEqual(
    resolveContainedImagePlacement(
      { width: 2000, height: 1000 },
      { x: 0, y: 0, width: 1000, height: 1000 }
    ),
    { x: 0, y: 250, width: 1000, height: 500 }
  )
})

test('tall mask is centered inside an offset artboard', () => {
  assert.deepEqual(
    resolveContainedImagePlacement(
      { width: 600, height: 1200 },
      { x: 100, y: 50, width: 900, height: 600 }
    ),
    { x: 400, y: 50, width: 300, height: 600 }
  )
})
