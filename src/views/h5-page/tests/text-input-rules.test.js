import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyTextInputRules,
  createH5TextInputController,
  normalizeTextInputRules,
  supportsMultilineInput
} from '../services/text-input-rules.js'

test('disabled rules keep the original input', () => {
  const value = '中文 ABC!\n第二行'
  assert.equal(applyTextInputRules(value, { enabled: false, maxCharacters: 2 }), value)
})

test('latin and symbol rules are applied independently', () => {
  assert.equal(applyTextInputRules('中A1! 😀', {
    enabled: true,
    characterSet: 'latin',
    allowSymbols: true
  }), 'A1! ')
  assert.equal(applyTextInputRules('中A1! 😀', {
    enabled: true,
    characterSet: 'any',
    allowSymbols: false
  }), '中A1 ')
})

test('symbols and emoji are disabled by default and require explicit opt-in', () => {
  const defaultRules = normalizeTextInputRules({ enabled: true })
  assert.equal(defaultRules.allowSymbols, false)
  assert.equal(applyTextInputRules('中文 A1!😀', defaultRules), '中文 A1')
  assert.equal(applyTextInputRules('中文 A1!😀', {
    enabled: true,
    allowSymbols: true
  }), '中文 A1!😀')
})

test('H5 input controller waits for composition end before filtering', () => {
  const controller = createH5TextInputController()
  const target = { value: '中😀' }
  const event = { target }
  let committedValue = null

  controller.handleCompositionStart(event)
  assert.equal(controller.handleInput(event, { enabled: true }), null)
  assert.equal(target.value, '中😀')

  const nextValue = controller.handleCompositionEnd(
    event,
    { enabled: true },
    (value) => {
      committedValue = value
    }
  )
  assert.equal(nextValue, '中')
  assert.equal(target.value, '中')
  assert.equal(committedValue, '中')
})

test('manual newlines are removed before automatic weighted wrapping', () => {
  assert.equal(applyTextInputRules('AB\n中C', {
    enabled: true,
    allowManualNewline: false,
    maxCharactersPerLine: 3
  }), 'AB\n中C')
})

test('weighted total length counts Chinese as two and ASCII as one', () => {
  assert.equal(applyTextInputRules('中A文BC', {
    enabled: true,
    maxCharacters: 4
  }), '中A')
})

test('a weighted length of four accepts two Chinese surname characters', () => {
  assert.equal(applyTextInputRules('欧阳司马', {
    enabled: true,
    allowManualNewline: false,
    maxCharacters: 4,
    maxLines: 1
  }), '欧阳')
})

test('manual newlines do not consume the total character limit', () => {
  assert.equal(applyTextInputRules('AB\nCD', {
    enabled: true,
    maxCharacters: 4
  }), 'AB\nCD')
})

test('maximum lines is enforced after automatic wrapping', () => {
  assert.equal(applyTextInputRules('ABCD中文', {
    enabled: true,
    maxCharactersPerLine: 4,
    maxLines: 2
  }), 'ABCD\n中文')
})

test('a character larger than the per-line capacity is rejected', () => {
  assert.equal(applyTextInputRules('中A', {
    enabled: true,
    maxCharactersPerLine: 1
  }), 'A')
})

test('rule normalization and multiline detection use safe defaults', () => {
  const rules = normalizeTextInputRules({ enabled: true, maxLines: 2 })
  assert.equal(rules.maxCharacters, null)
  assert.equal(supportsMultilineInput(rules), true)
  assert.equal(supportsMultilineInput({ enabled: true, allowManualNewline: false }), false)
})

test('automatic wrapping uses a multiline control when manual newlines are disabled', () => {
  assert.equal(supportsMultilineInput({
    enabled: true,
    allowManualNewline: false,
    maxCharactersPerLine: 4
  }), true)
})

test('one-line rules remove manual newlines without dropping following text', () => {
  const rules = normalizeTextInputRules({
    enabled: true,
    allowManualNewline: true,
    maxLines: 1
  })

  assert.equal(rules.allowManualNewline, false)
  assert.equal(supportsMultilineInput(rules), false)
  assert.equal(applyTextInputRules('ABC\nDEF', rules), 'ABCDEF')
})

test('single vertical line disables wrapping and removes user newlines', () => {
  const rules = normalizeTextInputRules({
    enabled: true,
    singleVerticalLine: true,
    allowManualNewline: true,
    maxCharactersPerLine: 4,
    maxLines: 3
  })

  assert.equal(rules.allowManualNewline, false)
  assert.equal(rules.maxCharactersPerLine, null)
  assert.equal(rules.maxLines, null)
  assert.equal(supportsMultilineInput(rules), false)
  assert.equal(applyTextInputRules('甲乙\n丙丁', rules), '甲乙丙丁')
})
