import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeSingleLineText,
  normalizeTextLayout,
  resolveSingleLineFontSize
} from '../src/utils/text-layout.js'

test('text layout uses safe defaults and normalizes minimum font size', () => {
  assert.deepEqual(normalizeTextLayout(), {
    mode: 'wrap',
    overflow: 'shrink-then-visible',
    minFontSize: null
  })
  assert.deepEqual(normalizeTextLayout({ mode: 'single-line', minFontSize: '24' }), {
    mode: 'single-line',
    overflow: 'shrink-then-visible',
    minFontSize: 24
  })
  assert.deepEqual(normalizeTextLayout({ mode: 'vertical' }), {
    mode: 'vertical',
    overflow: 'shrink-then-visible',
    minFontSize: null
  })
})

test('single line text removes all manual newline characters', () => {
  assert.equal(normalizeSingleLineText('欧\r\n阳\n娜'), '欧阳娜')
})

test('single line fitting restores the template font size when content fits', () => {
  assert.equal(resolveSingleLineFontSize({
    frameWidth: 100,
    baseFontSize: 80,
    minFontSize: 24,
    measureWidth: (fontSize) => fontSize
  }), 80)
})

test('single line fitting finds the largest font size inside the fixed frame', () => {
  assert.equal(resolveSingleLineFontSize({
    frameWidth: 100,
    baseFontSize: 80,
    minFontSize: 24,
    measureWidth: (fontSize) => fontSize * 2
  }), 50)
})

test('single line fitting allows overflow after reaching the minimum font size', () => {
  assert.equal(resolveSingleLineFontSize({
    frameWidth: 40,
    baseFontSize: 80,
    minFontSize: 24,
    measureWidth: (fontSize) => fontSize * 2
  }), 24)
})
