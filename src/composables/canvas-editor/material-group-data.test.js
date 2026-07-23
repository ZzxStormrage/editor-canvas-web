import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mergeMaterialPages,
  normalizeMaterialGroupIds,
  normalizeMaterialGroups,
  normalizeMaterialPage,
  resolveMaterialGroupMessageConfig,
  resolveTemplateMaterialGroups
} from './material-group-data.js'

test('template payload exposes material groups independently from editor JSON', () => {
  const page = { content: [{ id: 1, groupName: '测试1' }], totalElements: 1 }

  assert.equal(resolveTemplateMaterialGroups({ document: {}, materialGroups: page }), page)
  assert.deepEqual(resolveTemplateMaterialGroups({ document: {} }), [])
})

test('material groups accept paged and data-wrapped responses', () => {
  const groups = normalizeMaterialGroups({
    data: {
      content: [
        { id: 1, groupName: '测试1' },
        { id: 2, groupName: '测试2' },
        { id: 2, groupName: '重复项' }
      ]
    }
  })

  assert.deepEqual(groups.map(({ id, groupName }) => ({ id, groupName })), [
    { id: 1, groupName: '测试1' },
    { id: 2, groupName: '测试2' }
  ])
})

test('editor config accepts material group list and preferred id', () => {
  const config = resolveMaterialGroupMessageConfig({
    config: {
      materialGroups: [
        { id: 1, groupName: '测试1' },
        { id: 2, groupName: '测试2' }
      ],
      materialGroupId: 2
    }
  })

  assert.equal(config.hasMaterialGroupConfig, true)
  assert.equal(config.materialGroupId, 2)
  assert.deepEqual(config.materialGroups.map((group) => group.id), [1, 2])
})

test('editor config can receive only one material group id', () => {
  const config = resolveMaterialGroupMessageConfig({
    materialGroupId: 8,
    materialGroupName: '瓶身图案'
  })

  assert.deepEqual(config.materialGroups, [{ id: 8, groupName: '瓶身图案' }])
  assert.equal(config.materialGroupId, 8)
})

test('template load accepts backend material group id arrays', () => {
  const config = resolveMaterialGroupMessageConfig({
    template: {
      id: 3,
      partnerId: 10,
      materialGroupId: [2, '5', 2]
    },
    document: {}
  })

  assert.deepEqual(config.materialGroupIds, [2, 5])
  assert.equal(config.materialGroupId, 2)
  assert.deepEqual(config.materialGroups, [
    { id: 2, groupName: '素材组 #2' },
    { id: 5, groupName: '素材组 #5' }
  ])
})

test('material group ids accept comma separated backend values', () => {
  assert.deepEqual(normalizeMaterialGroupIds('1, 2,2'), [1, 2])
})

test('material pages map real image fields and determine more pages', () => {
  const page = normalizeMaterialPage({
    content: [
      { id: 10, materialName: '生肖图', materialUrl: 'https://example.com/10.png' }
    ],
    number: 0,
    size: 1,
    totalElements: 2,
    last: false
  }, { page: 0, size: 1 })

  assert.equal(page.items[0].materialName, '生肖图')
  assert.equal(page.items[0].materialUrl, 'https://example.com/10.png')
  assert.equal(page.totalElements, 2)
  assert.equal(page.hasMore, true)
})

test('material page merging removes duplicated materials', () => {
  const first = [{ id: '1', materialUrl: 'one.png' }]
  const next = [first[0], { id: '2', materialUrl: 'two.png' }]

  assert.deepEqual(mergeMaterialPages(first, next).map((item) => item.id), ['1', '2'])
})

test('a full page keeps loading when the service omits totalElements', () => {
  const page = normalizeMaterialPage({
    content: [
      { id: 1, materialUrl: 'one.png' },
      { id: 2, materialUrl: 'two.png' }
    ]
  }, { page: 0, size: 2 })

  assert.equal(page.hasKnownTotal, false)
  assert.equal(page.hasMore, true)
})
