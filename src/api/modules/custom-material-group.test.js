import assert from 'node:assert/strict'
import test from 'node:test'

import { createCustomMaterialGroupApi } from './custom-material-group.js'

test('material group API builds a paged request with partner header', () => {
  const client = {
    Get(url, config) {
      return { url, config }
    }
  }
  const api = createCustomMaterialGroupApi('/admin/api/customMaterialGroup/', client)
  const request = api.materials(2, { page: 1, size: 24, sort: ['id,desc'] }, { partnerId: 8 })

  assert.equal(request.url, '/admin/api/customMaterialGroup/2/materials')
  assert.deepEqual(request.config.params, { page: 1, size: 24, sort: ['id,desc'] })
  assert.deepEqual(request.config.headers, { 'X-Partner-Id': 8 })
})

test('material group API rejects invalid IDs and pagination', () => {
  const api = createCustomMaterialGroupApi('/admin/api/customMaterialGroup', { Get() {} })

  assert.throws(() => api.materials(0))
  assert.throws(() => api.materials(1, { page: -1 }))
  assert.throws(() => api.materials(1, { size: 0 }))
})
