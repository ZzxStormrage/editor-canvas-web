import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveSyntheticFontWeightStroke,
  sanitizeSyntheticFontWeightData
} from '../src/utils/font.js'

test('system fonts keep native font weight rendering', () => {
  assert.equal(resolveSyntheticFontWeightStroke(36, 700), 0)
})

test('remote font medium and bold weights receive distinct visual strokes', () => {
  const medium = resolveSyntheticFontWeightStroke(36, 500, 'https://example.com/font.ttf')
  const bold = resolveSyntheticFontWeightStroke(36, 700, 'https://example.com/font.ttf')

  assert.equal(medium, 0.72)
  assert.equal(bold, 1.62)
  assert.ok(bold > medium)
})

test('remote font normal weight does not receive a visual stroke', () => {
  assert.equal(resolveSyntheticFontWeightStroke(36, 400, 'https://example.com/font.ttf'), 0)
})

test('synthetic weight stroke is removed from exported document data', () => {
  const renderData = {
    stroke: '#1f2937',
    strokeWidth: 1.62,
    strokeAlign: 'center'
  }

  sanitizeSyntheticFontWeightData(renderData)

  assert.deepEqual(renderData, {})
})
