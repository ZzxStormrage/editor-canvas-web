import assert from 'node:assert/strict'
import test from 'node:test'

import { createImageTextFields } from './image-text-fields.js'

test('multiple music text targets become numbered fields in document order', () => {
  const targets = [
    { elementId: 'title', text: '标\n题' },
    { elementId: 'body', text: '正\n文' }
  ]
  const document = {
    elements: [
      {
        tag: 'Text',
        elementId: 'title',
        text: '标题',
        attributes: {
          text: { description: '文本替换' },
          textInput: { enabled: true, maxCharacters: 8 }
        }
      },
      {
        tag: 'Group',
        children: [
          {
            tag: 'Text',
            elementId: 'body',
            text: '正文',
            attributes: { text: { description: '文本替换' } }
          }
        ]
      }
    ]
  }

  const fields = createImageTextFields(document, targets, {
    pageId: 'music-customization',
    separate: true,
    textDescription: '文本替换'
  })

  assert.deepEqual(fields.map(({ label, value, targetIndexes }) => ({
    label,
    value,
    targetIndexes
  })), [
    { label: '文本1', value: '标题', targetIndexes: [0] },
    { label: '文本2', value: '正文', targetIndexes: [1] }
  ])
  assert.equal(fields[0].rules.maxCharacters, 8)
})

test('a single music text target keeps one unnumbered input', () => {
  const fields = createImageTextFields(
    {
      elements: [
        {
          tag: 'Text',
          elementId: 'only-text',
          text: '单个文本',
          attributes: { text: { description: '文本替换' } }
        }
      ]
    },
    [{ elementId: 'only-text', text: '单\n个\n文\n本' }],
    { pageId: 'music-customization', separate: true }
  )

  assert.equal(fields.length, 1)
  assert.equal(fields[0].label, '')
  assert.equal(fields[0].value, '单个文本')
  assert.deepEqual(fields[0].targetIndexes, [0])
})
