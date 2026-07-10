import { Frame, Group, Rect } from 'leafer-ui'
import { EditorEvent, EditorMoveEvent, EditorRotateEvent, EditorScaleEvent } from '@leafer-in/editor'

import { EditorError } from './errors/editor-error.js'

const ARTBOARD_NODE_KEY = '__canvasEditorArtboard'
const ARTBOARD_OVERFLOW_KEY = '__canvasEditorArtboardOverflow'
const CONTENT_OVERLAY_SYNC_DELAY = 32

/**
 * 归一化画板配置。
 *
 * @param {Object} [artboard={}] 外部传入的画板配置。
 * @param {Object} [baseArtboard={}] 默认画板配置。
 * @returns {Object} 归一化后的画板配置。
 */
export function normalizeArtboardOptions(artboard = {}, baseArtboard = {}) {
  const merged = {
    ...baseArtboard,
    ...(artboard ?? {})
  }

  return {
    enabled: normalizeOptionalBoolean(merged.enabled, 'artboard.enabled') ?? true,
    x: normalizeOptionalNumber(merged.x, 'artboard.x'),
    y: normalizeOptionalNumber(merged.y, 'artboard.y'),
    width: normalizePositiveNumber(merged.width, 'artboard.width'),
    height: normalizePositiveNumber(merged.height, 'artboard.height'),
    minWidth: normalizePositiveNumber(merged.minWidth, 'artboard.minWidth'),
    minHeight: normalizePositiveNumber(merged.minHeight, 'artboard.minHeight'),
    fill: normalizeOptionalString(merged.fill, 'artboard.fill') ?? '#ffffff',
    shadow: merged.shadow,
    overflowOpacity: normalizeOpacity(merged.overflowOpacity)
  }
}

/**
 * 白色画板管理器。
 *
 * 该画板是 stage 内的视觉与操作区域，不是 DOM canvas，也不放入 contentLayer，
 * 因此不会破坏 Leafer 官方 Editor 的 tree / sky 分层。
 */
export class ArtboardManager {
  #options
  #canvasSize
  #node
  #clipFrame
  #stage = null
  #contentOverlayGroup
  #contentLayer = null
  #skyLeafer = null
  #innerEditor = null
  #state = null
  #eventBus = null
  #eventIds = []
  #unsubscribers = []

  /**
   * @param {Object} options 归一化后的画板配置。
   * @param {{ width: number, height: number }} canvasSize 外层画布尺寸。
   */
  constructor(options, canvasSize) {
    this.#options = options
    this.#canvasSize = canvasSize
    this.#node = this.#createNode()
    this.#clipFrame = this.#createClipFrame()
    this.#contentOverlayGroup = this.#createOverlayGroup()
  }

  /** @returns {Rect} 画板节点。 */
  get node() {
    return this.#node
  }

  /** @returns {Object} 当前画板配置快照。 */
  get options() {
    return { ...this.#options }
  }

  /** @returns {{ x: number, y: number, width: number, height: number }} 内容坐标系画板边界。 */
  getContentBounds() {
    return {
      x: this.#node.x ?? 0,
      y: this.#node.y ?? 0,
      width: this.#node.width ?? this.#options.width,
      height: this.#node.height ?? this.#options.height
    }
  }

  /** @returns {{ x: number, y: number, width: number, height: number } | null} 世界坐标画板边界。 */
  getWorldBounds() {
    const bounds = this.getContentBounds()
    const start = this.#contentLayer?.getWorldPoint?.({ x: bounds.x, y: bounds.y })
    const end = this.#contentLayer?.getWorldPoint?.({
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height
    })

    if (!start || !end) {
      return null
    }

    return {
      x: Math.min(start.x, end.x),
      y: Math.min(start.y, end.y),
      width: Math.abs(end.x - start.x),
      height: Math.abs(end.y - start.y)
    }
  }

  /**
   * 挂载画板到 stage。
   *
   * @param {import('leafer-ui').Group} stage 缩放容器。
   * @param {import('leafer-ui').Group} contentLayer 内容层。
   * @returns {void}
   */
  mount(stage, contentLayer) {
    this.#stage = stage
    this.#contentLayer = contentLayer

    if (this.#options.enabled) {
      this.#clipFrame.add(this.#contentOverlayGroup)
      stage.add(this.#node, 0)
      stage.add(contentLayer, 1)
      stage.add(this.#clipFrame, 2)
    }
  }

  /**
   * 启动画板事件同步。
   *
   * @param {Object} context 编辑器上下文。
   * @returns {void}
   */
  bootstrap(context) {
    this.#innerEditor = context.innerEditor
    this.#skyLeafer = context.skyLeafer
    this.#state = context.state
    this.#eventBus = context.eventBus
    this.#syncState()
    this.#syncOverflowViews()
    this.#bindEditorEvents()
    this.#bindElementEvents()
  }

  /**
   * 调整画板尺寸。
   *
   * @param {number} width 新宽度。
   * @param {number} height 新高度。
   * @returns {void}
   */
  resize(width, height) {
    const nextWidth = Math.max(this.#options.minWidth, normalizePositiveNumber(width, 'artboard.width'))
    const nextHeight = Math.max(this.#options.minHeight, normalizePositiveNumber(height, 'artboard.height'))
    const current = this.getContentBounds()

    this.#options.width = nextWidth
    this.#options.height = nextHeight
    this.#node.width = nextWidth
    this.#node.height = nextHeight
    this.#node.x = current.x + (current.width - nextWidth) / 2
    this.#node.y = current.y + (current.height - nextHeight) / 2

    this.#syncState()
    this.syncAllElements()
    this.#innerEditor?.updateEditBox?.()
    this.#eventBus?.emit('artboard:resized', { artboard: this.options })
  }

  /**
   * 同步所有内容元素的超出透明度。
   *
   * @returns {void}
   */
  syncAllElements() {
    this.#syncOverflowViews()
  }

  /**
   * 同步单个元素的超出透明度。
   *
   * @param {Object} element 内容元素。
   * @returns {void}
   */
  syncElement(_element) {
    this.#syncOverflowViews()
  }

  /**
   * 销毁画板管理器。
   *
   * @returns {void}
   */
  destroy() {
    this.#innerEditor?.off_(this.#eventIds)
    this.#unsubscribers.forEach((unsubscribe) => unsubscribe())
    this.#eventIds = []
    this.#unsubscribers = []
    this.#node?.remove()
    this.#clipFrame?.remove()
    this.#contentOverlayGroup?.remove()
    this.#stage = null
    this.#contentLayer = null
    this.#skyLeafer = null
    this.#innerEditor = null
    this.#state = null
    this.#eventBus = null
  }

  /**
   * 创建画板节点。
   *
   * @returns {Rect} 画板节点。
   */
  #createNode() {
    const width = this.#options.width
    const height = this.#options.height
    const node = new Rect({
      x: this.#options.x ?? (this.#canvasSize.width - width) / 2,
      y: this.#options.y ?? (this.#canvasSize.height - height) / 2,
      width,
      height,
      fill: this.#options.fill,
      shadow: this.#options.shadow,
      hittable: false,
      hitChildren: false,
      editable: false,
      draggable: false
    })

    node[ARTBOARD_NODE_KEY] = true
    return node
  }

  /**
   * 创建画板内内容裁剪容器。
   *
   * @returns {Frame} 画板内裁剪容器。
   */
  #createClipFrame() {
    const frame = new Frame({
      fill: 'rgba(255, 255, 255, 0)',
      overflow: 'hide',
      hittable: false,
      hitChildren: false,
      editable: false,
      draggable: false
    })

    frame[ARTBOARD_OVERFLOW_KEY] = true
    return frame
  }

  /**
   * 创建画板内正常显示的裁剪预览组。
   *
   * 真实 contentLayer 保持在 stage 中交给官方 Editor 命中、选中和移动；
   * 该组只负责在画板范围内叠加一份正常不透明的视觉副本，所以必须完全不可命中。
   *
   * @returns {Group} 画板内预览组。
   */
  #createOverlayGroup() {
    const group = new Group({
      hittable: false,
      hitChildren: false,
      editable: false,
      draggable: false
    })

    group[ARTBOARD_OVERFLOW_KEY] = true
    return group
  }

  /**
   * 绑定官方 Editor 变换事件。
   *
   * @returns {void}
   */
  #bindEditorEvents() {
    if (!this.#innerEditor?.on_) {
      return
    }

    this.#eventIds = this.#innerEditor.on_([
      [EditorEvent.SELECT, this.#handleEditorChange, this],
      [EditorEvent.AFTER_SELECT, this.#handleEditorChange, this],
      [EditorMoveEvent.MOVE, this.#handleEditorChange, this],
      [EditorScaleEvent.SCALE, this.#handleEditorChange, this],
      [EditorRotateEvent.ROTATE, this.#handleEditorChange, this]
    ])
  }

  /**
   * 绑定元素新增事件。
   *
   * @returns {void}
   */
  #bindElementEvents() {
    if (!this.#eventBus) {
      return
    }

    this.#unsubscribers = [
      this.#eventBus.on('image:added', ({ image }) => this.syncElement(image)),
      this.#eventBus.on('text:added', ({ text }) => this.syncElement(text)),
      this.#eventBus.on('text:updated', ({ text }) => this.syncElement(text)),
      this.#eventBus.on('selection:deleted', () => this.syncAllElements()),
      this.#eventBus.on('selection:layer-changed', () => this.syncAllElements()),
      this.#eventBus.on('text:selected', () => this.syncAllElements()),
      this.#eventBus.on('viewport:zoom-changed', () => this.syncAllElements()),
      this.#eventBus.on('canvas:resized', () => this.syncAllElements())
    ]
  }

  /**
   * 处理编辑器选区或变换变化。
   *
   * @returns {void}
   */
  #handleEditorChange() {
    this.syncAllElements()
  }

  /**
   * 同步内容层的画板外淡化显示。
   *
   * 选择框和操作按钮属于官方 Editor 的 sky 层，按产品规则始终保持正常不透明；
   * 真实内容层留在 stage 中负责交互，裁剪预览层只负责把画板内视觉恢复为正常不透明。
   *
   * @returns {void}
   */
  #syncOverflowViews() {
    this.#syncContentLayerOpacity()
    this.#syncClipFrame()
    this.#syncContentOverlayView()
  }

  /**
   * 同步真实内容层透明度。
   *
   * 这里不裁剪真实 contentLayer，是为了继续使用 Leafer 官方 Editor 的命中、
   * 选中和拖拽逻辑；画板内正常显示由上层不可命中的裁剪副本补足。
   *
   * @returns {void}
   */
  #syncContentLayerOpacity() {
    if (!this.#contentLayer) {
      return
    }

    this.#contentLayer.opacity = this.#options.overflowOpacity
  }

  /**
   * 同步画板内裁剪容器。
   *
   * @returns {void}
   */
  #syncClipFrame() {
    const artboardBounds = this.getContentBounds()

    this.#setBox(this.#clipFrame, artboardBounds)
    this.#contentOverlayGroup.x = -artboardBounds.x
    this.#contentOverlayGroup.y = -artboardBounds.y
  }

  /**
   * 同步画板内正常不透明的内容预览。
   *
   * @returns {void}
   */
  #syncContentOverlayView() {
    this.#syncOverlayClones(this.#getContentCloneSources())
    this.#stage?.add?.(this.#clipFrame, 2)
  }

  /**
   * 同步画板内裁剪预览副本。
   *
   * @param {Array} sourceChildren 需要预览的真实内容节点。
   * @returns {void}
   */
  #syncOverlayClones(sourceChildren) {
    if (!this.#contentOverlayGroup) {
      return
    }

    this.#contentOverlayGroup.clear()
    sourceChildren.forEach((source) => {
      const clone = this.#cloneForOverlay(source)

      if (clone) {
        this.#contentOverlayGroup.add(clone)
      }
    })
    setTimeout(() => {
      this.#refreshOverlayGroup()
    }, CONTENT_OVERLAY_SYNC_DELAY)
  }

  /**
   * 获取内容层中需要镜像到画板外的源节点。
   *
   * @returns {Array} 内容源节点列表。
   */
  #getContentCloneSources() {
    return (this.#contentLayer?.children ?? []).filter((child) => {
      return child?.visible !== false && !child[ARTBOARD_OVERFLOW_KEY] && !child.__snapGuide
    })
  }

  /**
   * 创建画板内正常显示副本。
   *
   * @param {Object} source 源节点。
   * @returns {Object | null} 不可交互副本。
   */
  #cloneForOverlay(source) {
    const clone = source?.clone?.()

    if (!clone) {
      return null
    }

    clone[ARTBOARD_OVERFLOW_KEY] = true
    this.#disableOverlayHit(clone)
    return clone
  }

  /**
   * 关闭预览副本命中，确保指针事件穿透到真实内容层。
   *
   * @param {Object} node 预览副本节点。
   * @returns {void}
   */
  #disableOverlayHit(node) {
    node.set?.({
      hittable: false,
      hitChildren: false,
      editable: false,
      draggable: false
    })

    for (const child of node.children ?? []) {
      this.#disableOverlayHit(child)
    }
  }

  /**
   * 二次刷新预览组，等待图片或文本布局完成异步更新。
   *
   * @returns {void}
   */
  #refreshOverlayGroup() {
    if (!this.#contentOverlayGroup?.children?.length) {
      return
    }

    this.#contentOverlayGroup.forceUpdate?.()
    this.#contentOverlayGroup.children.forEach((child) => {
      child.forceUpdate?.()
      child.updateLayout?.()
    })
  }

  /**
   * 设置节点矩形属性。
   *
   * @param {Object} node Leafer 节点。
   * @param {{ x: number, y: number, width: number, height: number }} bounds 边界。
   * @returns {void}
   */
  #setBox(node, bounds) {
    if (!node) {
      return
    }

    node.x = bounds.x
    node.y = bounds.y
    node.width = bounds.width
    node.height = bounds.height
  }

  /**
   * 同步状态代理中的画板快照。
   *
   * @returns {void}
   */
  #syncState() {
    if (!this.#state) {
      return
    }

    this.#state.artboard = {
      ...this.#options,
      ...this.getContentBounds()
    }
  }

}

/**
 * 归一化可选布尔值。
 *
 * @param {*} value 原始值。
 * @param {string} key 字段名。
 * @returns {boolean | undefined} 归一化后的布尔值。
 */
function normalizeOptionalBoolean(value, key) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'boolean') {
    throw new EditorError(`${key} must be a boolean.`, 'ARTBOARD_BOOLEAN_INVALID')
  }

  return value
}

/**
 * 归一化可选数字。
 *
 * @param {*} value 原始值。
 * @param {string} key 字段名。
 * @returns {number | undefined} 归一化后的数字。
 */
function normalizeOptionalNumber(value, key) {
  if (value === undefined || value === null) {
    return undefined
  }

  const number = Number(value)
  if (!Number.isFinite(number)) {
    throw new EditorError(`${key} must be a number.`, 'ARTBOARD_NUMBER_INVALID')
  }

  return number
}

/**
 * 归一化正数。
 *
 * @param {*} value 原始值。
 * @param {string} key 字段名。
 * @returns {number} 归一化后的正数。
 */
function normalizePositiveNumber(value, key) {
  const number = Number(value)

  if (!Number.isFinite(number) || number <= 0) {
    throw new EditorError(`${key} must be greater than 0.`, 'ARTBOARD_SIZE_INVALID')
  }

  return number
}

/**
 * 归一化透明度。
 *
 * @param {*} value 原始透明度。
 * @returns {number} 0 到 1 之间的透明度。
 */
function normalizeOpacity(value) {
  const number = Number(value ?? 0.5)

  if (!Number.isFinite(number)) {
    return 0.5
  }

  return Math.max(0, Math.min(1, number))
}

/**
 * 归一化可选字符串。
 *
 * @param {*} value 原始值。
 * @param {string} key 字段名。
 * @returns {string | undefined} 归一化后的字符串。
 */
function normalizeOptionalString(value, key) {
  if (value === undefined || value === null) {
    return undefined
  }

  if (typeof value !== 'string') {
    throw new EditorError(`${key} must be a string.`, 'ARTBOARD_STRING_INVALID')
  }

  return value
}
