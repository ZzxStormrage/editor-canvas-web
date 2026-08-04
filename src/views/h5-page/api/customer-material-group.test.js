import assert from 'node:assert/strict'
import test from 'node:test'

import {
  customerMaterialGroupApi,
  MINI_PROGRAM_MATERIAL_API_BASE_URL,
  miniProgramMaterialClient
} from './customer-material-group.js'
import { clearH5AccessToken, setH5AccessToken } from '../services/auth-token.js'

test('H5 material group API uses the mini-program endpoint and keeps request parameters', () => {
  const originalGet = miniProgramMaterialClient.Get
  let request
  miniProgramMaterialClient.Get = (url, config) => {
    request = { url, config }
    return request
  }

  try {
    const result = customerMaterialGroupApi.materials(
      12,
      { page: 0, size: 1000 },
      { partnerId: 8 }
    )

    assert.equal(result, request)
    assert.equal(request.url, '/customer/api/customMaterialGroup/12/materials')
    assert.deepEqual(request.config.params, { page: 0, size: 1000 })
    assert.deepEqual(request.config.headers, { 'X-Partner-Id': 8 })
    assert.equal(MINI_PROGRAM_MATERIAL_API_BASE_URL, '/')
    assert.equal(miniProgramMaterialClient.options.baseURL, '')
  } finally {
    miniProgramMaterialClient.Get = originalGet
  }
})

test('H5 material group API sends the mini-program token', async () => {
  setH5AccessToken('mini-program-token')

  try {
    const method = customerMaterialGroupApi.materials(12, { page: 0, size: 1000 })
    await miniProgramMaterialClient.options.beforeRequest(method)

    assert.equal(method.config.headers.Authorization, 'Bearer mini-program-token')
  } finally {
    clearH5AccessToken()
  }
})
