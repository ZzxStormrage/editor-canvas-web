import { Group, Path } from 'leafer-ui'

const DEFAULT_MOVE_SNAP = {
  enabled: true,
  threshold: 6,
  canvas: true,
  elements: true
}

const DEFAULT_ROTATE_SNAP = {
  enabled: true,
  step: 15,
  threshold: 3
}

const GUIDE_HIDE_DELAY = 90
const GUIDE_STYLE = {
  strokeWidth: 1,
  dashPattern: [6, 4],
  opacity: 0.9,
  hittable: false,
  editable: false,
  draggable: false
}

/**
 * 创建编辑器变换吸附钩子。
 *
 * @param {Object} params
 * @param {() => import('@leafer-in/editor').Editor | null} params.getInnerEditor
 * @param {import('leafer-ui').Group} params.contentLayer
 * @param {Object} params.state
 * @param {Object} params.editorOptions
 * @returns {{ beforeMove: Function, beforeRotate: Function }}
 */
export function createEditorSnapHooks({ getInnerEditor, contentLayer, state, editorOptions }) {
  const moveSnap = normalizeSnapOption(editorOptions.moveSnap, DEFAULT_MOVE_SNAP)
  const rotateSnap = normalizeSnapOption(editorOptions.rotateSnap, DEFAULT_ROTATE_SNAP)
  const userBeforeMove = editorOptions.beforeMove
  const userBeforeRotate = editorOptions.beforeRotate
  const guides = createSnapGuideRenderer(contentLayer, state, editorOptions.theme)

  return {
    beforeMove(data) {
      const checked = runBeforeMove(userBeforeMove, data)
      if (checked === false) return false

      const move = checked ?? { x: data.x, y: data.y }
      if (!moveSnap.enabled) return checked

      return snapMove({
        target: data.target,
        x: move.x,
        y: move.y,
        threshold: moveSnap.threshold,
        canvas: moveSnap.canvas,
        elements: moveSnap.elements,
        contentLayer,
        state,
        selected: getInnerEditor()?.list ?? [],
        guides
      })
    },

    beforeRotate(data) {
      const checked = runBeforeRotate(userBeforeRotate, data)
      if (checked === false) return false

      const rotation = checked ?? data.rotation
      if (!rotateSnap.enabled) return checked

      return snapRotation(data.target, rotation, rotateSnap.step, rotateSnap.threshold)
    }
  }
}

function normalizeSnapOption(option, defaults) {
  if (option === false) return { ...defaults, enabled: false }
  if (option === true || option === undefined) return { ...defaults }
  return { ...defaults, ...option, enabled: option.enabled ?? defaults.enabled }
}

function runBeforeMove(beforeMove, data) {
  if (typeof beforeMove !== 'function') return null

  const checked = beforeMove(data)
  if (checked === false) return false
  if (isPoint(checked)) return checked
  return null
}

function runBeforeRotate(beforeRotate, data) {
  if (typeof beforeRotate !== 'function') return null

  const checked = beforeRotate(data)
  if (checked === false) return false
  return Number.isFinite(checked) ? checked : null
}

function snapMove({ target, x, y, threshold, canvas, elements, contentLayer, state, selected, guides }) {
  if (!target || (!x && !y)) return { x, y }

  const bounds = target.worldBoxBounds
  if (!isValidBounds(bounds)) {
    guides.hide()
    return { x, y }
  }

  const worldMove = target.getWorldPointByLocal?.({ x, y }, null, true)
  if (!worldMove) {
    guides.hide()
    return { x, y }
  }

  const movingBounds = offsetBounds(bounds, worldMove.x, worldMove.y)
  const snapLines = createSnapLines({ contentLayer, state, selected, target, canvas, elements })
  const snapX = findSnapOffset(getVerticalLines(movingBounds), snapLines.vertical, threshold)
  const snapY = findSnapOffset(getHorizontalLines(movingBounds), snapLines.horizontal, threshold)

  if (!snapX && !snapY) {
    guides.hide()
    return { x, y }
  }

  guides.show({
    vertical: snapX?.line,
    horizontal: snapY?.line
  })

  return target.getLocalPoint?.(
    {
      x: worldMove.x + (snapX?.offset ?? 0),
      y: worldMove.y + (snapY?.offset ?? 0)
    },
    null,
    true
  ) ?? { x, y }
}

function snapRotation(target, rotation, step, threshold) {
  if (!target || !Number.isFinite(rotation) || !Number.isFinite(step) || step <= 0) {
    return rotation
  }

  const current = target.rotation ?? 0
  const next = current + rotation
  const nearest = Math.round(next / step) * step
  const diff = nearest - next

  return Math.abs(diff) <= threshold ? rotation + diff : rotation
}

function createSnapLines({ contentLayer, state, selected, target, canvas, elements }) {
  const vertical = []
  const horizontal = []

  if (canvas) {
    const canvasBounds = getCanvasWorldBounds(contentLayer, state)
    if (canvasBounds) {
      vertical.push(...getVerticalLines(canvasBounds))
      horizontal.push(...getHorizontalLines(canvasBounds))
    }
  }

  if (elements) {
    const selectedSet = new Set(selected)
    selectedSet.add(target)

    for (const child of contentLayer?.children ?? []) {
      if (!child?.visible || child.__snapGuide || selectedSet.has(child)) continue
      const bounds = child.worldBoxBounds
      if (!isValidBounds(bounds)) continue
      vertical.push(...getVerticalLines(bounds))
      horizontal.push(...getHorizontalLines(bounds))
    }
  }

  return { vertical, horizontal }
}

function getCanvasWorldBounds(contentLayer, state) {
  const start = contentLayer?.getWorldPoint?.({ x: 0, y: 0 })
  const end = contentLayer?.getWorldPoint?.({ x: state.width, y: state.height })
  if (!start || !end) return null

  const x = Math.min(start.x, end.x)
  const y = Math.min(start.y, end.y)
  return {
    x,
    y,
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y)
  }
}

function findSnapOffset(sourceLines, targetLines, threshold) {
  let best = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (const source of sourceLines) {
    for (const target of targetLines) {
      const offset = target - source
      const distance = Math.abs(offset)
      if (distance <= threshold && distance < bestDistance) {
        bestDistance = distance
        best = { offset, line: target }
      }
    }
  }

  return best
}

function createSnapGuideRenderer(contentLayer, state, theme = {}) {
  let group = null
  let verticalLine = null
  let horizontalLine = null
  let hideTimer = 0

  return {
    show({ vertical, horizontal }) {
      ensureGuides()
      clearHideTimer()

      if (Number.isFinite(vertical)) {
        verticalLine.path = createVerticalGuidePath(contentLayer, state, vertical)
        verticalLine.visible = true
      } else {
        verticalLine.visible = false
      }

      if (Number.isFinite(horizontal)) {
        horizontalLine.path = createHorizontalGuidePath(contentLayer, state, horizontal)
        horizontalLine.visible = true
      } else {
        horizontalLine.visible = false
      }

      group.visible = true
      hideTimer = setTimeout(() => this.hide(), GUIDE_HIDE_DELAY)
    },

    hide() {
      clearHideTimer()
      if (group) group.visible = false
    }
  }

  function ensureGuides() {
    if (group) return

    group = new Group({
      visible: false,
      hittable: false,
      editable: false,
      draggable: false
    })
    group.__snapGuide = true
    verticalLine = createGuideLine(theme)
    horizontalLine = createGuideLine(theme)
    group.addMany(verticalLine, horizontalLine)
    contentLayer?.add(group)
  }

  function clearHideTimer() {
    if (hideTimer) {
      clearTimeout(hideTimer)
      hideTimer = 0
    }
  }
}

function createGuideLine(theme) {
  const line = new Path({
    ...GUIDE_STYLE,
    stroke: theme.snapGuideColor ?? theme.primaryColor ?? '#4A90D9'
  })
  line.__snapGuide = true
  return line
}

function createVerticalGuidePath(contentLayer, state, x) {
  const bounds = getCanvasWorldBounds(contentLayer, state)
  if (!bounds) return ''

  const start = worldToContentPoint(contentLayer, { x, y: bounds.y })
  const end = worldToContentPoint(contentLayer, { x, y: bounds.y + bounds.height })
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
}

function createHorizontalGuidePath(contentLayer, state, y) {
  const bounds = getCanvasWorldBounds(contentLayer, state)
  if (!bounds) return ''

  const start = worldToContentPoint(contentLayer, { x: bounds.x, y })
  const end = worldToContentPoint(contentLayer, { x: bounds.x + bounds.width, y })
  return `M ${start.x} ${start.y} L ${end.x} ${end.y}`
}

function worldToContentPoint(contentLayer, point) {
  return contentLayer?.getLocalPoint?.(point) ?? point
}

function getVerticalLines(bounds) {
  return [bounds.x, bounds.x + bounds.width / 2, bounds.x + bounds.width]
}

function getHorizontalLines(bounds) {
  return [bounds.y, bounds.y + bounds.height / 2, bounds.y + bounds.height]
}

function offsetBounds(bounds, x, y) {
  return {
    x: bounds.x + x,
    y: bounds.y + y,
    width: bounds.width,
    height: bounds.height
  }
}

function isValidBounds(bounds) {
  return (
    bounds &&
    Number.isFinite(bounds.x) &&
    Number.isFinite(bounds.y) &&
    Number.isFinite(bounds.width) &&
    Number.isFinite(bounds.height)
  )
}

function isPoint(value) {
  return value && Number.isFinite(value.x) && Number.isFinite(value.y)
}
