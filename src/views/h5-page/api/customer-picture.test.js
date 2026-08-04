import assert from 'node:assert/strict'
import test from 'node:test'

import { createCustomerPictureApi, resolveUploadedPictureUrl } from './customer-picture.js'

test('customer picture upload keeps the mini-program endpoint and multipart field', () => {
  const client = {
    Post(url, data, config) {
      return { url, data, config }
    }
  }
  const api = createCustomerPictureApi(client, 'https://xiaoxiang.ele007.com')
  const file = new Blob(['image'], { type: 'image/jpeg' })
  const request = api.upload(file)
  const uploadedFile = request.data.get('files')

  assert.equal(request.url, '/customer/api/file/upload')
  assert.equal(uploadedFile.type, file.type)
  assert.equal(uploadedFile.size, file.size)
  assert.equal(request.config.name, 'customerPicture.upload')
  assert.equal(
    request.config.transformData({ data: '/file/image/generated.jpg' }),
    'https://xiaoxiang.ele007.com/file/image/generated.jpg'
  )
})

test('customer picture upload validates files and response URLs', () => {
  const api = createCustomerPictureApi({ Post() {} }, 'https://xiaoxiang.ele007.com')

  assert.throws(() => api.upload(new Blob(['text'], { type: 'text/plain' })))
  assert.throws(() => resolveUploadedPictureUrl({}, 'https://xiaoxiang.ele007.com'))
})
