import assert from 'node:assert/strict'
import test from 'node:test'

import { createCustomerAiPosterApi, unwrapResponseData } from './customer-ai-poster.js'

test('AI poster API builds create and detail requests', () => {
  const client = {
    Post(url, data, config) {
      return { type: 'POST', url, data, config }
    },
    Get(url, config) {
      return { type: 'GET', url, config }
    }
  }
  const api = createCustomerAiPosterApi(client)
  const payload = { face_img_url: 'https://example.com/face.jpg' }

  const createRequest = api.createTask(payload)
  assert.equal(createRequest.url, '/create-sticker-poster-task')
  assert.equal(createRequest.data, payload)
  assert.equal(createRequest.config.name, 'customerAiPoster.createTask')

  const detailRequest = api.getTaskDetail(' task-1 ')
  assert.equal(detailRequest.url, '/get-sticker-task-detail')
  assert.deepEqual(detailRequest.config.params, { task_uuid: 'task-1' })
  assert.equal(detailRequest.config.name, 'customerAiPoster.getTaskDetail')
})

test('AI poster API validates input and unwraps response data', () => {
  const api = createCustomerAiPosterApi({ Post() {}, Get() {} })

  assert.throws(() => api.createTask(null))
  assert.throws(() => api.getTaskDetail(''))
  assert.deepEqual(unwrapResponseData({ data: { task_uuid: 'task-1' } }), { task_uuid: 'task-1' })
  assert.deepEqual(unwrapResponseData({ task_uuid: 'task-1' }), { task_uuid: 'task-1' })
})
