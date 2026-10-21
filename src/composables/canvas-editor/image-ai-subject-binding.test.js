import assert from 'node:assert/strict'
import test from 'node:test'

import {
  applyImageAiSubjectBinding,
  normalizeAiSubjectIds,
  readImageAiSubjectBinding
} from './image-ai-subject-binding.js'

test('AI subject binding stores ids and configured names', () => {
  assert.deepEqual(
    applyImageAiSubjectBinding(
      { description: '人像替换' },
      ['1', 2],
      [{ id: 1, subjectName: '春日' }, { id: 2, subjectName: '夏日' }]
    ),
    {
      description: '人像替换',
      aiSubjectIds: [1, 2],
      aiSubjectNames: ['春日', '夏日']
    }
  )
})

test('AI subject binding reads legacy values and preserves unavailable names', () => {
  const legacy = readImageAiSubjectBinding({
    image: { aiSubjectId: '8', aiSubjectName: '旧主题' }
  })
  const updated = applyImageAiSubjectBinding({}, [8, 9], [], legacy)

  assert.deepEqual(legacy, { ids: [8], names: ['旧主题'] })
  assert.deepEqual(updated, {
    aiSubjectIds: [8, 9],
    aiSubjectNames: ['旧主题', '']
  })
})

test('AI subject binding can be cleared and ids are deduplicated', () => {
  assert.deepEqual(normalizeAiSubjectIds('1, 2,1'), [1, 2])
  assert.deepEqual(
    applyImageAiSubjectBinding({ aiSubjectIds: [1], role: 'ai-variable' }, [], []),
    { role: 'ai-variable' }
  )
})
