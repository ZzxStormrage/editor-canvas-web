import assert from 'node:assert/strict'
import test from 'node:test'

import {
  resolveMaterialOptions,
  resolveMaterialTargetGroups,
  resolveMaterialTargetsForGroup,
  resolveTemplateMaterialGroupIds
} from './usePoetryCustomization.js'

test('material options keep target group and deduplicate URLs within each group', () => {
  const options = resolveMaterialOptions(
    [
      {
        data: {
          content: [
            { id: 1, materialName: '素材 A', materialUrl: 'https://example.com/a.png' },
            { id: 2, materialName: '共享素材', materialUrl: 'https://example.com/shared.png' }
          ],
          totalElements: 2
        }
      },
      {
        content: [
          { id: 3, materialName: '重复素材', materialUrl: 'https://example.com/shared.png' },
          { id: 4, materialName: '素材 B', materialUrl: 'https://example.com/b.png' }
        ],
        totalElements: 2
      }
    ],
    [10, 20]
  )

  assert.deepEqual(options, [
    {
      id: 'material-10-1',
      label: '素材 A',
      url: 'https://example.com/a.png',
      groupId: 10
    },
    {
      id: 'material-10-2',
      label: '共享素材',
      url: 'https://example.com/shared.png',
      groupId: 10
    },
    {
      id: 'material-20-3',
      label: '重复素材',
      url: 'https://example.com/shared.png',
      groupId: 20
    },
    {
      id: 'material-20-4',
      label: '素材 B',
      url: 'https://example.com/b.png',
      groupId: 20
    }
  ])
})

test('template material groups are collected recursively from image layers', () => {
  const groupIds = resolveTemplateMaterialGroupIds({
    elements: [
      { tag: 'Image', attributes: { image: { materialGroupId: 12 } } },
      {
        tag: 'Group',
        children: [
          { tag: 'image', attributes: { image: { materialGroupId: '18' } } },
          { tag: 'Image', attributes: { image: { materialGroupId: 12 } } },
          { tag: 'Text', attributes: { image: { materialGroupId: 99 } } }
        ]
      }
    ]
  })

  assert.deepEqual(groupIds, [12, 18])
})

test('material targets are grouped by binding and resolved for the selected material', () => {
  const firstTarget = { id: 'image-1' }
  const secondTarget = { id: 'image-2' }
  const editor = {
    getElementsByAttribute(path, value) {
      assert.equal(path, 'image.materialGroupId')
      if (value === 12) return [firstTarget]
      if (value === '18') return [secondTarget]
      return []
    }
  }

  const groups = resolveMaterialTargetGroups(editor, [12, 18, 12])

  assert.deepEqual(groups, [
    { groupId: 12, targets: [firstTarget] },
    { groupId: 18, targets: [secondTarget] }
  ])
  assert.deepEqual(resolveMaterialTargetsForGroup(groups, '18'), [secondTarget])
  assert.deepEqual(resolveMaterialTargetsForGroup(groups, 99), [])
})
