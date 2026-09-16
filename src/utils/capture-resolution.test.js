import assert from 'node:assert/strict'
import test from 'node:test'

import { resolveCapturePixelRatio } from './capture-resolution.js'

test('small capture areas use the maximum 2x resolution', () => {
  assert.equal(resolveCapturePixelRatio({ width: 600, height: 800 }), 2)
  assert.equal(resolveCapturePixelRatio({ width: 1000, height: 1000 }), 2)
})

test('medium capture areas are limited by the 2400px longest side', () => {
  assert.equal(resolveCapturePixelRatio({ width: 1200, height: 1800 }), 2400 / 1800)
  assert.equal(resolveCapturePixelRatio({ width: 2000, height: 2000 }), 1.2)
})

test('large capture areas keep their original 1x resolution', () => {
  assert.equal(resolveCapturePixelRatio({ width: 2000, height: 3000 }), 1)
})

test('invalid capture bounds safely fall back to 1x', () => {
  assert.equal(resolveCapturePixelRatio(null), 1)
  assert.equal(resolveCapturePixelRatio({ width: 0, height: 1000 }), 1)
  assert.equal(resolveCapturePixelRatio({ width: 1000, height: Number.NaN }), 1)
})
