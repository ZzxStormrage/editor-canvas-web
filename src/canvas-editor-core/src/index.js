import { Leafer } from 'leafer-ui'
import {
  DEFAULT_AREA_TYPE,
  createArea,
  normalizeAreaType,
  normalizeGridOptions,
  updateArea
} from './area'

// 默认画布尺寸，外部没有传入 width/height 时使用。
const DEFAULT_CANVAS_WIDTH = 750
const DEFAULT_CANVAS_HEIGHT = 1334
const DEFAULT_BACKGROUND = '#ffffff'

/**
 * 初始化画布编辑器。
 *
 * @param {Object} options 初始化参数。
 * @param {string | HTMLElement | HTMLCanvasElement} options.view 画布挂载容器，可以是元素、id 或选择器。
 * @param {number} [options.width=750] 画布宽度。
 * @param {number} [options.height=1334] 画布高度。
 * @param {string} [options.background='#ffffff'] 画布背景色。
 * @param {'grid' | 'blank'} [options.areaType='grid'] 画布区域类型，grid 为网格，blank 为空白。
 * @param {Object} [options.grid] 网格配置。
 * @param {number} [options.pixelRatio] 画布像素比。
 * @param {boolean} [options.autoResize=false] 是否跟随容器尺寸自动缩放。
 * @param {Object} [options.leaferOptions] 透传给 Leafer 的额外配置。
 * @returns {Object} 编辑器实例上下文。
 */
export function init(options = {}) {
  const normalizedOptions = normalizeInitOptions(options)
  const view = resolveView(normalizedOptions.view)
  const size = resolveSize(view, normalizedOptions)

  const leafer = new Leafer({
    view,
    width: size.width,
    height: size.height,
    fill: normalizedOptions.background,
    pixelRatio: normalizedOptions.pixelRatio,
    type: 'design',
    ...normalizedOptions.leaferOptions
  })

  const area = createArea(size, normalizedOptions)
  leafer.add(area, 0)

  const state = {
    view,
    width: size.width,
    height: size.height,
    background: normalizedOptions.background,
    areaType: normalizedOptions.areaType,
    grid: normalizedOptions.grid,
    destroyed: false
  }

  let resizeObserver = null

  // 先返回轻量 editor 对象，后续图层、命令、插件能力都可以继续挂到这里。
  const editor = {
    leafer,
    state,
    resize(width, height) {
      assertNotDestroyed(state)
      const nextSize = normalizeSize(width, height)

      state.width = nextSize.width
      state.height = nextSize.height
      leafer.resize(nextSize)
      updateArea(area, nextSize, state)

      return editor
    },
    setBackground(background) {
      assertNotDestroyed(state)

      state.background = background
      leafer.fill = background
      updateArea(area, state, state)

      return editor
    },
    setAreaType(areaType) {
      assertNotDestroyed(state)

      state.areaType = normalizeAreaType(areaType)
      updateArea(area, state, state)

      return editor
    },
    setGrid(grid = {}) {
      assertNotDestroyed(state)

      state.grid = normalizeGridOptions(grid, state.grid)
      updateArea(area, state, state)

      return editor
    },
    destroy() {
      if (state.destroyed) return

      resizeObserver?.disconnect()
      resizeObserver = null
      leafer.destroy()
      state.destroyed = true
    }
  }

  if (normalizedOptions.autoResize) {
    resizeObserver = createResizeObserver(view, editor)
  }

  return editor
}

export default {
  init
}

/**
 * 归一化初始化参数。
 *
 * 支持 view、container、el 三种字段传入挂载容器，方便不同调用方接入。
 *
 * @param {Object} options 外部传入的初始化参数。
 * @returns {Object} 内部统一使用的初始化参数。
 */
function normalizeInitOptions(options) {
  if (!options || typeof options !== 'object') {
    throw new TypeError('[canvas-editor-core] init(options) requires an options object.')
  }

  return {
    view: options.view ?? options.container ?? options.el,
    width: options.width,
    height: options.height,
    background: options.background ?? DEFAULT_BACKGROUND,
    areaType: normalizeAreaType(options.areaType ?? options.area ?? DEFAULT_AREA_TYPE),
    grid: normalizeGridOptions(options.grid),
    pixelRatio: options.pixelRatio,
    autoResize: options.autoResize ?? false,
    leaferOptions: options.leaferOptions ?? {}
  }
}

/**
 * 解析画布挂载容器。
 *
 * 如果传入 DOM 元素则直接返回；如果传入字符串，则优先按 id 查找，再按 CSS 选择器查找。
 *
 * @param {string | HTMLElement | HTMLCanvasElement} view 外部传入的挂载容器。
 * @returns {HTMLElement | HTMLCanvasElement} 真实 DOM 容器。
 */
function resolveView(view) {
  if (!view) {
    throw new Error('[canvas-editor-core] Missing required option: view.')
  }

  if (typeof view !== 'string') {
    return view
  }

  // 优先按 id 查找，找不到再按 CSS 选择器查找。
  const element = document.getElementById(view) ?? querySelector(view)

  if (!element) {
    throw new Error(`[canvas-editor-core] Canvas view not found: ${view}`)
  }

  return element
}

/**
 * 安全执行 document.querySelector。
 *
 * 某些字符串可能不是合法 CSS 选择器，这里统一捕获异常，避免初始化过程直接崩溃。
 *
 * @param {string} selector CSS 选择器。
 * @returns {Element | null} 匹配到的元素，未匹配或选择器非法时返回 null。
 */
function querySelector(selector) {
  try {
    return document.querySelector(selector)
  } catch {
    return null
  }
}

/**
 * 解析画布尺寸。
 *
 * 优先使用外部显式传入的 width/height；未传入时读取容器实际尺寸；仍然没有时使用默认尺寸。
 *
 * @param {HTMLElement | HTMLCanvasElement} view 画布挂载容器。
 * @param {Object} options 归一化后的初始化参数。
 * @returns {{ width: number, height: number }} 可用于 Leafer 的画布尺寸。
 */
function resolveSize(view, options) {
  // 没有显式传入尺寸时，优先读取容器实际尺寸。
  const width = options.width ?? getElementSize(view, 'width') ?? DEFAULT_CANVAS_WIDTH
  const height = options.height ?? getElementSize(view, 'height') ?? DEFAULT_CANVAS_HEIGHT

  return normalizeSize(width, height)
}

/**
 * 校验并格式化画布尺寸。
 *
 * Leafer 固定宽高模式下 width/height 不能为 0，因此这里提前做参数保护。
 *
 * @param {number | string} width 画布宽度。
 * @param {number | string} height 画布高度。
 * @returns {{ width: number, height: number }} 格式化后的正数尺寸。
 */
function normalizeSize(width, height) {
  const normalizedWidth = Number(width)
  const normalizedHeight = Number(height)

  if (!Number.isFinite(normalizedWidth) || normalizedWidth <= 0) {
    throw new Error('[canvas-editor-core] Canvas width must be greater than 0.')
  }

  if (!Number.isFinite(normalizedHeight) || normalizedHeight <= 0) {
    throw new Error('[canvas-editor-core] Canvas height must be greater than 0.')
  }

  return {
    width: normalizedWidth,
    height: normalizedHeight
  }
}

/**
 * 读取 DOM 元素的实际尺寸。
 *
 * 只有元素已经挂载且布局完成时才能读到有效尺寸，读不到时返回 undefined。
 *
 * @param {HTMLElement | HTMLCanvasElement} element DOM 元素。
 * @param {'width' | 'height'} key 需要读取的尺寸字段。
 * @returns {number | undefined} 元素尺寸。
 */
function getElementSize(element, key) {
  if (!element || typeof element.getBoundingClientRect !== 'function') {
    return undefined
  }

  const rect = element.getBoundingClientRect()
  const value = key === 'width' ? rect.width : rect.height

  return value > 0 ? value : undefined
}

/**
 * 创建容器尺寸监听器。
 *
 * autoResize 开启后，容器尺寸变化会同步调用 editor.resize 更新 Leafer 画布。
 *
 * @param {HTMLElement | HTMLCanvasElement} view 画布挂载容器。
 * @param {Object} editor 编辑器实例上下文。
 * @returns {ResizeObserver | null} 尺寸监听器，环境不支持 ResizeObserver 时返回 null。
 */
function createResizeObserver(view, editor) {
  if (typeof ResizeObserver === 'undefined') {
    return null
  }

  // 容器尺寸变化后，同步刷新 Leafer 画布尺寸。
  const observer = new ResizeObserver(([entry]) => {
    const { width, height } = entry.contentRect

    if (width > 0 && height > 0) {
      editor.resize(width, height)
    }
  })

  observer.observe(view)
  return observer
}

/**
 * 断言编辑器未被销毁。
 *
 * 已销毁的编辑器不允许继续修改尺寸、背景等状态。
 *
 * @param {Object} state 编辑器状态对象。
 */
function assertNotDestroyed(state) {
  if (state.destroyed) {
    throw new Error('[canvas-editor-core] Editor has been destroyed.')
  }
}
