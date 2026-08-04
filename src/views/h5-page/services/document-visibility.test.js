import assert from 'node:assert/strict'
import test from 'node:test'

import { createDocumentWithAttributeVisibility } from './document-visibility.js'

test('H5 initial visibility only displays the selected attribute value', () => {
  const source = {
    version: 1,
    canvas: { width: 100, height: 100 },
    elements: [
      { tag: 'Image', url: 'background.png', attributes: { image: { role: 'background' } } },
      { tag: 'Image', url: 'mouse.png', visible: true, attributes: { image: { description: '鼠' } } },
      { tag: 'Image', url: 'ox.png', visible: true, attributes: { image: { description: '牛' } } },
      {
        tag: 'Group',
        children: [
          { tag: 'Image', url: 'tiger.png', visible: true, attributes: { image: { description: '虎' } } }
        ]
      }
    ]
  }

  const result = createDocumentWithAttributeVisibility(source, 'image.description', '鼠')

  assert.equal(result.elements[0].visible, undefined)
  assert.equal(result.elements[1].visible, true)
  assert.equal(result.elements[2].visible, false)
  assert.equal(result.elements[3].children[0].visible, false)
  assert.equal(source.elements[2].visible, true)
})
