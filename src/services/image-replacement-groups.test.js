import assert from 'node:assert/strict'
import test from 'node:test'
import { reactive } from 'vue'
import { collectReplacementGroups, createImageCustomizationEntries } from './image-replacement-groups.js'
import { parseCustomizationDocument } from '../views/h5-page/services/customization-document.js'
import { createMultiCanvasEditor } from '../views/h5-page/services/multi-canvas-editor.js'

const image = (id, group, name, enabled = true) => ({
  tag: 'Image', elementId: id, x: 10, width: 120, height: 90, url: `${id}.png`, fit: 'contain',
  attributes: {
    customization: { name, enabled },
    image: { ...(group ? { replacementGroupId: group, replacementGroupName: '同名组' } : {}) }
  }
})
const document = (elements) => ({ version: 1, canvas: { width: 200, height: 300 }, elements })

function createFixture() {
  const front = image('front', 'a', '瓶身正面')
  const back = image('back', 'a', '瓶身背面')
  const other = image('other', 'b', '包装')
  const closed = image('closed', 'a', '关闭项', false)
  const ungrouped = image('single', '', '独立图')
  back.fit = 'cover'
  const calls = []
  let fail = false
  const makeEditor = (nodes) => ({
    getElementsByType: (type) => type === 'image' ? nodes : [],
    elementData: { get: (node) => node.attributes, getId: (node) => node.elementId, export: () => [] },
    image: { getSource: (node) => node.url, getFit: (node) => node.fit },
    exportDocument: () => document(structuredClone(nodes)),
    async replaceImage(node, url, options) {
      calls.push({ id: node.elementId, url, ...options })
      if (fail && node === back && url === 'broken.png') throw new Error('load failed')
      node.url = url
    }
  })
  const first = makeEditor([front, other, ungrouped])
  const second = makeEditor([back, closed])
  const canvases = [{ id: 'front-part', name: '正面', editor: first }, { id: 'back-part', name: '背面', editor: second }]
  const facade = createMultiCanvasEditor(() => canvases, () => first, true)
  return { facade, front, back, closed, other, ungrouped, calls, setFail: () => { fail = true } }
}

test('groups persist across nested components and same names do not merge IDs', () => {
  const { facade } = createFixture()
  const exported = facade.exportDocument()
  exported.canvases[1].document.elements = [{ tag: 'Group', children: exported.canvases[1].document.elements }]
  const loaded = parseCustomizationDocument(JSON.stringify(exported))
  const groups = collectReplacementGroups(loaded)
  assert.equal(groups.length, 2)
  assert.deepEqual(groups[0].members.map((node) => node.canvasName), ['正面', '背面', '背面'])
  assert.equal(loaded.canvases.length, 2)
  assert.equal(exported.canvases[0].document.elements[0].url, 'front.png')
})

test('linked replacements cross canvases, deduplicate concurrent calls and retain each fit', async () => {
  const { facade, front, back, closed, other, ungrouped, calls } = createFixture()
  await Promise.all([
    facade.replaceImage(reactive(front), 'new.png', { fit: 'stretch' }),
    facade.replaceImage(back, 'new.png', { fit: 'stretch' })
  ])
  assert.deepEqual(calls.map((call) => call.id), ['front', 'back'])
  assert.deepEqual(calls.map((call) => call.fit), ['contain', 'cover'])
  assert.ok(calls.every((call) => call.preserveFrame))
  assert.equal(front.url, 'new.png')
  assert.equal(back.url, 'new.png')
  assert.equal(closed.url, 'closed.png')
  assert.equal(other.url, 'other.png')
  assert.equal(ungrouped.url, 'single.png')
  assert.equal(back.width, 120)
  assert.equal(facade.exportDocument().canvases[1].document.elements[0].url, 'new.png')
})

test('a failed linked replacement rolls back successful peers without invalidating nodes', async () => {
  const fixture = createFixture()
  fixture.setFail()
  await assert.rejects(fixture.facade.replaceImage(fixture.front, 'broken.png'), /load failed/)
  assert.equal(fixture.front.url, 'front.png')
  assert.equal(fixture.back.url, 'back.png')
  await fixture.facade.replaceImage(fixture.back, 'retry.png')
  assert.equal(fixture.front.url, 'retry.png')
})

test('H5 entries use customization names, group by ID and omit explicitly closed nodes', () => {
  const { facade } = createFixture()
  const entries = createImageCustomizationEntries(facade)
  assert.deepEqual(entries.map((entry) => [entry.label, entry.targets.length]), [
    ['瓶身正面', 2], ['包装', 1], ['独立图', 1]
  ])
})

test('old unnamed ungrouped templates retain legacy behavior and version', async () => {
  const { facade, front, back } = createFixture()
  front.attributes = {}
  back.attributes = {}
  const single = createMultiCanvasEditor(() => [{ editor: facade.getCanvasEditors()[0].editor }], () => facade.getCanvasEditors()[0].editor)
  await single.replaceImage(front, 'one.png', { fit: 'stretch' })
  assert.equal(front.url, 'one.png')
  assert.equal(back.url, 'back.png')
  assert.equal(single.exportDocument().version, 1)
  assert.equal(parseCustomizationDocument(document([])).version, 1)
  assert.throws(() => parseCustomizationDocument({ version: 2, canvases: [] }), /没有可用画布/)
})
