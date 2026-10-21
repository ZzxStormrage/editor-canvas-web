import assert from 'node:assert/strict'
import test from 'node:test'

import { createCustomAiSubjectApi } from './custom-ai-subject.js'

test('AI subject API builds a paged searchable request', () => {
  const api = createCustomAiSubjectApi('/admin/api/customAiSubject/', {
    Get(url, config) { return { url, config } }
  })
  const request = api.list({ page: 2, size: 20, keyword: '春' })
  assert.equal(request.url, '/admin/api/customAiSubject')
  assert.deepEqual(request.config.params, { page: 2, size: 20, keyword: '春' })
})
