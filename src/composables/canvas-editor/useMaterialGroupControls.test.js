import assert from 'node:assert/strict'
import test from 'node:test'

import {
  normalizeMaterialRequestPartnerId,
  resolveInitialMaterialGroup
} from './useMaterialGroupControls.js'

const GROUPS = Object.freeze([
  Object.freeze({ id: 1, groupName: '测试1' }),
  Object.freeze({ id: 2, groupName: '测试2' })
])

test('preferred material group is selected by id', () => {
  assert.equal(resolveInitialMaterialGroup(GROUPS, 2)?.id, 2)
  assert.equal(resolveInitialMaterialGroup(GROUPS, '2')?.id, 2)
})

test('material group selection falls back to the first group', () => {
  assert.equal(resolveInitialMaterialGroup(GROUPS, 99)?.id, 1)
  assert.equal(resolveInitialMaterialGroup([], 1), null)
})

test('invalid partner ids are omitted from material requests', () => {
  assert.equal(normalizeMaterialRequestPartnerId(10), 10)
  assert.equal(normalizeMaterialRequestPartnerId('10'), 10)
  assert.equal(normalizeMaterialRequestPartnerId([10]), 10)
  assert.equal(normalizeMaterialRequestPartnerId(0), null)
  assert.equal(normalizeMaterialRequestPartnerId(''), null)
  assert.equal(normalizeMaterialRequestPartnerId('undefined'), null)
})
