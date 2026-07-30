import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveTextWidthPatch } from '../text-control-update.js'

test('same writing mode preserves the user-defined text frame width', () => {
  assert.deepEqual(resolveTextWidthPatch({ writingMode: 'x', width: 320 }, 'x'), {
    width: 320
  })
  assert.deepEqual(resolveTextWidthPatch({ writingMode: 'y', width: 48 }, 'y'), {
    width: 48
  })
})

test('horizontal and vertical switches release the previous frame width', () => {
  assert.deepEqual(resolveTextWidthPatch({ writingMode: 'x', width: 320 }, 'y'), {})
  assert.deepEqual(resolveTextWidthPatch({ writingMode: 'y', width: 48 }, 'x'), {})
})

test('invalid frame widths are not submitted to the text plugin', () => {
  assert.deepEqual(resolveTextWidthPatch({ writingMode: 'x', width: 0 }, 'x'), {})
  assert.deepEqual(resolveTextWidthPatch({ __: { writingMode: 'y', width: '48' } }, 'y'), {
    width: 48
  })
})
