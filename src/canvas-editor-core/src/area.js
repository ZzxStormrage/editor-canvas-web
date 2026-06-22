import { Group, Path, Rect } from 'leafer-ui'

export const DEFAULT_AREA_TYPE = 'grid'
export const DEFAULT_GRID_OPTIONS = {
  size: 20,
  color: '#e7e7e7',
  majorSize: 100,
  majorColor: '#d2d2d2'
}

const areaParts = new WeakMap()

/**
 * 创建画布区域背景。
 *
 * 网格使用 Leafer 矢量 Path 绘制，避免位图 pattern 放大后模糊。
 *
 * @param {{ width: number, height: number }} size 画布尺寸。
 * @param {Object} options 归一化后的初始化参数。
 * @returns {Group} 区域背景节点组。
 */
export function createArea(size, options) {
  const background = new Rect({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    fill: options.background,
    hittable: false,
    editable: false,
    draggable: false
  })

  const minorGrid = createGridPathNode(options.grid.color)
  const majorGrid = createGridPathNode(options.grid.majorColor)
  const area = new Group({
    x: 0,
    y: 0,
    width: size.width,
    height: size.height,
    zIndex: -1,
    hittable: false,
    hitChildren: false,
    editable: false,
    draggable: false
  })

  areaParts.set(area, {
    background,
    minorGrid,
    majorGrid
  })

  area.add([background, minorGrid, majorGrid])
  updateArea(area, size, options)

  return area
}

/**
 * 同步区域背景。
 *
 * @param {Group} area 区域背景节点组。
 * @param {{ width: number, height: number }} size 画布尺寸。
 * @param {Object} options 区域配置。
 */
export function updateArea(area, size, options) {
  const { background, minorGrid, majorGrid } = areaParts.get(area)

  area.width = size.width
  area.height = size.height
  background.width = size.width
  background.height = size.height
  background.fill = options.background

  const isGrid = options.areaType === 'grid'
  minorGrid.visible = isGrid
  majorGrid.visible = isGrid

  if (!isGrid) return

  minorGrid.stroke = options.grid.color
  minorGrid.path = createGridPath(size, options.grid.size, options.grid.majorSize)
  majorGrid.stroke = options.grid.majorColor
  majorGrid.path = createGridPath(size, options.grid.majorSize)
}

/**
 * 归一化区域类型。
 *
 * @param {string} areaType 区域类型。
 * @returns {'grid' | 'blank'} 归一化后的区域类型。
 */
export function normalizeAreaType(areaType) {
  if (areaType === 'blank' || areaType === 'grid') {
    return areaType
  }

  throw new Error('[canvas-editor-core] areaType must be "grid" or "blank".')
}

/**
 * 归一化网格配置。
 *
 * @param {Object} [grid] 外部传入的网格配置。
 * @param {Object} [baseGrid] 上一次网格配置。
 * @returns {Object} 内部网格配置。
 */
export function normalizeGridOptions(grid = {}, baseGrid = DEFAULT_GRID_OPTIONS) {
  const normalizedGrid = {
    ...baseGrid,
    ...(grid ?? {})
  }

  normalizedGrid.size = normalizePositiveNumber(normalizedGrid.size, 'grid.size')
  normalizedGrid.majorSize = normalizePositiveNumber(normalizedGrid.majorSize, 'grid.majorSize')

  return normalizedGrid
}

function createGridPathNode(stroke) {
  return new Path({
    path: '',
    stroke,
    strokeWidth: 1,
    hittable: false,
    editable: false,
    draggable: false
  })
}

function createGridPath(size, step, skipStep) {
  const paths = []

  for (let x = 0; x <= size.width; x += step) {
    if (shouldSkipLine(x, skipStep)) continue
    paths.push(`M ${x} 0 V ${size.height}`)
  }

  for (let y = 0; y <= size.height; y += step) {
    if (shouldSkipLine(y, skipStep)) continue
    paths.push(`M 0 ${y} H ${size.width}`)
  }

  return paths.join(' ')
}

function shouldSkipLine(position, skipStep) {
  return skipStep ? position % skipStep === 0 : false
}

function normalizePositiveNumber(value, key) {
  const normalizedValue = Number(value)

  if (!Number.isFinite(normalizedValue) || normalizedValue <= 0) {
    throw new Error(`[canvas-editor-core] ${key} must be greater than 0.`)
  }

  return normalizedValue
}
