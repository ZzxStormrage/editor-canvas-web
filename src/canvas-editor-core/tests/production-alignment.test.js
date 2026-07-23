import assert from 'node:assert/strict'
import test from 'node:test'

import {
  convertOffsetToParentSpace,
  resolvePrintAreaAlignmentOffset
} from '../src/utils/production-alignment.js'

const target = { x: 40, y: 60, width: 80, height: 40 }
const printArea = { x: 100, y: 120, width: 300, height: 200 }

test('print area alignment resolves all horizontal offsets', () => {
  assert.deepEqual(resolvePrintAreaAlignmentOffset(target, printArea, 'left'), { x: 60, y: 0 })
  assert.deepEqual(
    resolvePrintAreaAlignmentOffset(target, printArea, 'horizontal-center'),
    { x: 170, y: 0 }
  )
  assert.deepEqual(resolvePrintAreaAlignmentOffset(target, printArea, 'right'), { x: 280, y: 0 })
})

test('print area alignment resolves all vertical offsets', () => {
  assert.deepEqual(resolvePrintAreaAlignmentOffset(target, printArea, 'top'), { x: 0, y: 60 })
  assert.deepEqual(
    resolvePrintAreaAlignmentOffset(target, printArea, 'vertical-center'),
    { x: 0, y: 140 }
  )
  assert.deepEqual(resolvePrintAreaAlignmentOffset(target, printArea, 'bottom'), { x: 0, y: 220 })
})

test('content offsets are converted through scaled parent coordinates', () => {
  assert.deepEqual(
    convertOffsetToParentSpace({ x: 40, y: -30 }, { a: 2, b: 0, c: 0, d: 3 }),
    { x: 20, y: -10 }
  )
})
