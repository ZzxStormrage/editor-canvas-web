import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyImageMaterialGroupBinding,
  readImageMaterialGroupBinding
} from './image-material-group-binding.js'

test('image material group binding stores stable id and readable name', () => {
  const attributes = applyImageMaterialGroupBinding(
    { description: '瓶身图案' },
    1,
    [{ id: 1, groupName: '测试1' }]
  )

  assert.deepEqual(attributes, {
    description: '瓶身图案',
    materialGroupId: 1,
    materialGroupName: '测试1'
  })
})

test('image material group binding preserves unavailable saved groups', () => {
  const attributes = applyImageMaterialGroupBinding(
    {},
    8,
    [],
    { id: 8, name: '已下架素材组' }
  )

  assert.deepEqual(attributes, {
    materialGroupId: 8,
    materialGroupName: '已下架素材组'
  })
})

test('image material group binding can be cleared and reads legacy data', () => {
  const legacy = readImageMaterialGroupBinding({
    image: { materialGroup: { id: '12', groupName: '旧素材组' } }
  })
  const cleared = applyImageMaterialGroupBinding(
    { materialGroupId: 12, materialGroupName: '旧素材组', role: 'ai-variable' },
    null,
    []
  )

  assert.deepEqual(legacy, { id: 12, name: '旧素材组' })
  assert.deepEqual(cleared, { role: 'ai-variable' })
})
