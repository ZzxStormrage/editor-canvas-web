import assert from 'node:assert/strict'
import test from 'node:test'

import { useLayerControls } from './useLayerControls.js'

function createLayerEditor() {
  let currentLayers = [
    { id: 'top' },
    { id: 'middle' },
    { id: 'bottom' }
  ]
  const reorderCalls = []
  const editor = {
    layer: {
      getList: () => currentLayers,
      reorder(ids) {
        reorderCalls.push([...ids])
        const layerMap = new Map(currentLayers.map((layer) => [layer.id, layer]))
        currentLayers = ids.map((id) => layerMap.get(id)).filter(Boolean)
      }
    }
  }

  return {
    editor,
    reorderCalls
  }
}

test('layer controls move a layer to the visual top', () => {
  const { editor, reorderCalls } = createLayerEditor()
  const controls = useLayerControls(() => editor)

  controls.refreshLayers()

  assert.equal(controls.moveLayerToFront('middle'), true)
  assert.deepEqual(reorderCalls, [['middle', 'top', 'bottom']])
  assert.deepEqual(controls.layers.value.map((layer) => layer.id), ['middle', 'top', 'bottom'])
})

test('layer controls preserve boundaries for top, up, and down actions', () => {
  const { editor, reorderCalls } = createLayerEditor()
  const controls = useLayerControls(() => editor)

  controls.refreshLayers()

  assert.equal(controls.moveLayerToFront('top'), false)
  assert.equal(controls.moveLayerUp('top'), false)
  assert.equal(controls.moveLayerDown('top'), true)
  assert.deepEqual(reorderCalls, [['middle', 'top', 'bottom']])
  assert.equal(controls.moveLayerToFront('missing'), false)
})

test('layer drag commits the displayed top-to-bottom order', () => {
  const { editor, reorderCalls } = createLayerEditor()
  const controls = useLayerControls(() => editor)

  controls.refreshLayers()
  controls.startLayerDrag()
  controls.layers.value = [
    controls.layers.value[2],
    controls.layers.value[0],
    controls.layers.value[1]
  ]
  controls.endLayerDrag()

  assert.deepEqual(reorderCalls, [['bottom', 'top', 'middle']])
  assert.deepEqual(controls.layers.value.map((layer) => layer.id), ['bottom', 'top', 'middle'])
})

test('selected layer lock uses the selection command and preserves selection', () => {
  let selectionLockCalls = 0
  let layerLockCalls = 0
  const editor = {
    selectedElements: [{}],
    toggleSelectionLock() {
      selectionLockCalls += 1
    },
    layer: {
      toggleLock() {
        layerLockCalls += 1
      }
    }
  }
  const controls = useLayerControls(() => editor)

  controls.setLayers([{ id: 'selected', selected: true }])
  controls.toggleLayerLock('selected')

  assert.equal(selectionLockCalls, 1)
  assert.equal(layerLockCalls, 0)
})

test('unselected layer lock remains a per-layer operation', () => {
  let selectionLockCalls = 0
  const layerLockCalls = []
  const editor = {
    selectedElements: [{}],
    toggleSelectionLock() {
      selectionLockCalls += 1
    },
    layer: {
      toggleLock(id) {
        layerLockCalls.push(id)
      }
    }
  }
  const controls = useLayerControls(() => editor)

  controls.setLayers([{ id: 'other', selected: false }])
  controls.toggleLayerLock('other')

  assert.equal(selectionLockCalls, 0)
  assert.deepEqual(layerLockCalls, ['other'])
})
