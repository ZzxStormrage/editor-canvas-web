import { Group, Image as LeaferImage, Rect, Text, PointerEvent, DragEvent, MoveEvent } from 'leafer-ui'
import { EditorEvent, EditorMoveEvent, EditorRotateEvent, EditorScaleEvent } from '@leafer-in/editor'

import rotateIconSvg from '../assets/icons/rotate.svg?raw'
import { cloneElementData } from '../utils/element-data.js'
import { isTextElement } from '../utils/text.js'

/**
 * 编辑器选区交互管理器。
 *
 * 负责选区行为、编辑框控制点和可序列化选区状态。操作工具条由外部视图层
 * 渲染，只通过本类的公开方法执行锁定、复制、删除和层级操作。
 *
 * @author zzx
 * @since 2026-07-01
 */

const DEFAULT_ACTION_THEME = {
  primaryColor: '#4A90D9',
  surfaceColor: '#ffffff',
  borderColor: '#e5e7eb',
  textColor: '#111827',
  disabledFillColor: '#f7f8fa',
  shadow: { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(15, 23, 42, 0.14)' },
  middleHandleShadow: { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(15, 23, 42, 0.2)' },
  middleHandleHoverShadow: { x: 0, y: 3, blur: 10, spread: 0, color: 'rgba(37, 99, 235, 0.24)' },
  rotationTipFill: 'rgba(0, 0, 0, 0.7)',
  rotationTipTextColor: '#ffffff'
}

const LAYER_ACTION_DEFS = [
  {
    key: 'front',
    label: '移到最前',
    shortcut: '⌥⌘]'
  },
  {
    key: 'forward',
    label: '前移',
    shortcut: '⌘]'
  },
  {
    key: 'backward',
    label: '后移',
    shortcut: '⌘['
  },
  {
    key: 'back',
    label: '移到最后',
    shortcut: '⌥⌘['
  }
]

const BTN_RADIUS = 8
const ROTATE_BTN_SIZE = 30
const ROTATE_ICON_INSET = 5
const ROTATE_ICON_SIZE = ROTATE_BTN_SIZE - ROTATE_ICON_INSET * 2
const ROTATE_ANGLE_GAP = 12
const ROTATE_ANGLE_WIDTH = 50
const ROTATE_ANGLE_HEIGHT = 24
const RESIZE_HANDLE_CURSORS = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize']
const RESIZE_LINE_CURSORS = ['ns-resize', 'ew-resize', 'ns-resize', 'ew-resize']
const TEXT_RESIZE_POINT_INDEXES = new Set([0, 3])
const EDITOR_GROUP_KEY = '__canvasEditorGroup'
const EDITOR_GROUP_NAME = '组合'

function hideResizeControl(control) {
  if (!control) {
    return
  }

  control.visible = false
  control.cursor = undefined
  control.hittable = false
  control.editConfig = undefined
}

function showResizeControl(control, cursor) {
  if (!control) {
    return
  }

  control.visible = true
  control.hittable = true
  control.cursor = cursor
  control.editConfig = undefined
}

function createIconUrl(svg, color) {
  const crispSvg = svg
    .replace(/<svg\s+width="24"\s+height="24"/, '<svg width="96" height="96"')
    .replace(/#4A5565/gi, color)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(crispSvg)}`
}

function normalizeActionTheme(theme = {}) {
  return {
    ...DEFAULT_ACTION_THEME,
    ...(theme ?? {})
  }
}

function createLayerActions() {
  return LAYER_ACTION_DEFS.map((action) => ({
    key: action.key,
    label: action.label,
    shortcut: action.shortcut
  }))
}

export class EditorActionButtons {
  /** @type {import('@leafer-in/editor').Editor} */
  #innerEditor

  /** @type {import('../logic/event-bus.js').EventBus | null} */
  #eventBus

  /** @type {Object} */
  #theme

  /** @type {string} */
  #rotateIconUrl

  /** @type {Array<{ key: string, label: string, shortcut: string }>} */
  #layerActions

  /** @type {import('leafer-ui').Rect | null} */
  #cursorRect

  /** @type {import('leafer-ui').UI | null} */
  #rotatePoint

  /** @type {import('leafer-ui').Image | null} */
  #rotateIcon

  /** @type {import('leafer-ui').Group | null} */
  #rotationTip

  /** @type {import('leafer-ui').UI[]} */
  #middleHandles

  /** @type {import('leafer-ui').UI[]} */
  #cursorHoverTargets

  /** @type {import('@leafer-in/interface').IEditBox | null} */
  #patchedEditBox

  /** @type {((bounds: import('@leafer-ui/interface').IBoundsData) => void) | null} */
  #originalEditBoxUpdateBounds

  /** @type {import('@leafer-ui/interface').IEventListenerId[]} */
  #hoverFallbackEventIds

  /** @type {import('@leafer-ui/interface').IEventListenerId[]} */
  #textResizeEventIds

  /** @type {number | null} */
  #textResizeSyncFrame

  /** @type {HTMLElement | null} */
  #hoverFallbackView

  /** @type {((event: PointerEvent) => void) | null} */
  #onDomHoverFallbackMove

  /** @type {(() => void) | null} */
  #onDomHoverFallbackLeave

  /** @type {number | null} */
  #selectionStateFrame

  /** @type {boolean} */
  #disposed = false

  /** 锁定切换期间跳过事件干扰 */
  #isTogglingLock = false

  /** 锁定切换后 editBox 尚未就绪时的重试计数器 */
  #lockRetryCount = 0

  /**
   * @param {import('@leafer-in/editor').Editor} innerEditor
   * @param {Object} [theme]
   * @param {import('../logic/event-bus.js').EventBus | null} [eventBus]
   */
  constructor(innerEditor, theme = {}, eventBus = null) {
    this.#innerEditor = innerEditor
    this.#eventBus = eventBus
    this.#theme = normalizeActionTheme(theme)
    this.#rotateIconUrl = createIconUrl(rotateIconSvg, this.#theme.textColor)
    this.#layerActions = createLayerActions()
    this.#cursorRect = null
    this.#rotatePoint = null
    this.#rotateIcon = null
    this.#rotationTip = null
    this.#middleHandles = []
    this.#cursorHoverTargets = []
    this.#patchedEditBox = null
    this.#originalEditBoxUpdateBounds = null
    this.#hoverFallbackEventIds = []
    this.#textResizeEventIds = []
    this.#textResizeSyncFrame = null
    this.#hoverFallbackView = null
    this.#onDomHoverFallbackMove = null
    this.#onDomHoverFallbackLeave = null
    this.#selectionStateFrame = null

    this.#innerEditor.on_(EditorEvent.SELECT, this.#onSelect, this)
    this.#innerEditor.on_(EditorEvent.BEFORE_SELECT, this.#onBeforeSelect, this)
    this.#innerEditor.on_(EditorMoveEvent.BEFORE_MOVE, this.#onTransform, this)
    this.#innerEditor.on_(EditorMoveEvent.MOVE, this.#onTransform, this)
    this.#innerEditor.on_(EditorScaleEvent.BEFORE_SCALE, this.#onTransform, this)
    this.#innerEditor.on_(EditorScaleEvent.SCALE, this.#onTransform, this)
    this.#innerEditor.on_(EditorMoveEvent.BEFORE_MOVE, this.closeLayerMenu, this)
    this.#innerEditor.on_(EditorScaleEvent.BEFORE_SCALE, this.closeLayerMenu, this)
    this.#innerEditor.on_(EditorRotateEvent.BEFORE_ROTATE, this.closeLayerMenu, this)
    this.#innerEditor.on_(EditorRotateEvent.ROTATE, this.#onRotate, this)
    this.#bindHoverFallback()
  }

  // ────────── 事件处理 ──────────

  /**
   * 绑定官方 hoverStroker 的兜底更新。
   *
   * @returns {void}
   */
  #bindHoverFallback() {
    this.#innerEditor.waitLeafer?.(() => {
      const app = this.#innerEditor?.app

      if (!app?.on_) {
        return
      }

      this.#hoverFallbackEventIds = app.on_([
        [PointerEvent.MOVE, this.#onHoverFallbackMove, this],
        [[PointerEvent.LEAVE, DragEvent.START], this.#hideHoverFallback, this]
      ])
      this.#textResizeEventIds = app.on_([
        [[MoveEvent.BEFORE_MOVE, MoveEvent.MOVE, MoveEvent.END], this.#enforceTextResizeControls, this, true],
        [[DragEvent.START, DragEvent.DRAG, DragEvent.END], this.#enforceTextResizeControls, this, true]
      ])

      this.#bindDomHoverFallback(app.view)
    })
  }

  /**
   * 绑定 DOM 指针移动兜底。
   *
   * @param {HTMLElement | HTMLCanvasElement} view Leafer 挂载视图。
   * @returns {void}
   */
  #bindDomHoverFallback(view) {
    if (!view?.addEventListener) {
      return
    }

    this.#hoverFallbackView = view
    this.#onDomHoverFallbackMove = (event) => this.#onDomHoverFallbackPointerMove(event)
    this.#onDomHoverFallbackLeave = () => this.#hideHoverFallback()
    view.addEventListener('pointermove', this.#onDomHoverFallbackMove)
    view.addEventListener('pointerleave', this.#onDomHoverFallbackLeave)
  }

  /**
   * 鼠标移动时更新官方 hover 边框。
   *
   * @param {import('leafer-ui').PointerEvent} event Leafer 指针事件。
   * @returns {void}
   */
  #onHoverFallbackMove(event) {
    if (!this.#canShowHoverFallback()) {
      this.#hideHoverFallback()
      return
    }

    this.#setHoverFallbackTarget(this.#findHoverTarget(event))
  }

  /**
   * 判断当前是否允许显示 hover 边框。
   *
   * @returns {boolean} 是否允许显示。
   */
  #canShowHoverFallback() {
    const editor = this.#innerEditor

    return Boolean(
      editor &&
      editor.mergeConfig?.hover &&
      !editor.dragging &&
      !editor.innerEditing
    )
  }

  /**
   * 从指针事件路径中查找可编辑的 hover 目标。
   *
   * @param {import('leafer-ui').PointerEvent} event Leafer 指针事件。
   * @returns {import('leafer-ui').UI | null} hover 目标。
   */
  #findHoverTarget(event) {
    const list = event?.path?.list ?? []

    const pathTarget = list.find((leaf) => {
      return leaf?.editable && !this.#innerEditor?.hasItem?.(leaf)
    })

    return pathTarget ?? this.#findHoverTargetByPoint(event)
  }

  /**
   * 使用指针世界坐标查找可编辑 hover 目标。
   *
   * @param {import('leafer-ui').PointerEvent} event Leafer 指针事件。
   * @returns {import('leafer-ui').UI | null} hover 目标。
   */
  #findHoverTargetByPoint(event) {
    const point = this.#getEventWorldPoint(event)

    if (!point) {
      return null
    }

    return this.#findEditableByBounds(this.#innerEditor?.app?.tree, point)
  }

  /**
   * 获取指针事件的世界坐标。
   *
   * @param {import('leafer-ui').PointerEvent} event Leafer 指针事件。
   * @returns {{ x: number, y: number } | null} 世界坐标。
   */
  #getEventWorldPoint(event) {
    if (Number.isFinite(event?.x) && Number.isFinite(event?.y)) {
      return { x: event.x, y: event.y }
    }

    return null
  }

  /**
   * DOM 指针移动时更新 hover 边框。
   *
   * @param {PointerEvent} event DOM 指针事件。
   * @returns {void}
   */
  #onDomHoverFallbackPointerMove(event) {
    if (!this.#canShowHoverFallback()) {
      this.#hideHoverFallback()
      return
    }

    const point = this.#innerEditor?.app?.tree?.getWorldPointByClient?.(
      {
        clientX: event.clientX,
        clientY: event.clientY
      },
      true
    )

    const target = point ? this.#findEditableByBounds(this.#innerEditor?.app?.tree, point) : null
    this.#setHoverFallbackTarget(target)
    this.#syncDomCursorByWorldPoint(point)
  }

  /**
   * 在节点树中按外框命中查找最上层可编辑元素。
   *
   * @param {import('leafer-ui').UI} root 根节点。
   * @param {{ x: number, y: number }} point 世界坐标。
   * @returns {import('leafer-ui').UI | null} hover 目标。
   */
  #findEditableByBounds(root, point) {
    const children = root?.children ?? []

    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = children[i]
      const deep = child?.children?.length ? this.#findEditableByBounds(child, point) : null

      if (deep) {
        return deep
      }

      if (this.#isHoverableElementAtPoint(child, point)) {
        return child
      }
    }

    return null
  }

  /**
   * 判断节点是否可作为 hover 目标。
   *
   * @param {import('leafer-ui').UI} element Leafer 节点。
   * @param {{ x: number, y: number }} point 世界坐标。
   * @returns {boolean} 是否命中。
   */
  #isHoverableElementAtPoint(element, point) {
    const bounds = element?.worldBoxBounds

    if (
      !element?.editable ||
      element.visible === false ||
      this.#innerEditor?.hasItem?.(element) ||
      !bounds
    ) {
      return false
    }

    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    )
  }

  /**
   * 使用官方 hoverStroker 显示 hover 边框。
   *
   * @param {import('leafer-ui').UI | null} target hover 目标。
   * @returns {void}
   */
  #setHoverFallbackTarget(target) {
    const hoverStroker = this.#innerEditor?.selector?.hoverStroker

    if (!hoverStroker) {
      return
    }

    const config = this.#innerEditor.mergeConfig ?? {}
    hoverStroker.setTarget(target, {
      stroke: config.hoverStyle?.stroke ?? config.stroke,
      strokeWidth: config.hoverStyle?.strokeWidth ?? config.strokeWidth,
      strokePathType: config.hoverPathType ?? 'box',
      ...(config.hoverStyle ?? {})
    })
  }

  /**
   * 隐藏 hover 边框。
   *
   * @returns {void}
   */
  #hideHoverFallback() {
    const hoverStroker = this.#innerEditor?.selector?.hoverStroker

    if (hoverStroker) {
      hoverStroker.target = null
      hoverStroker.update()
    }
  }

  /**
   * 根据 DOM 指针所在世界坐标同步官方编辑框控制点的 cursor。
   *
   * Leafer 官方会在节点命中后更新 cursor，但自定义按钮由多层 Group/Image/Rect 组成，
   * 某些场景会先命中子节点导致 cursor 下一次点击才刷新，这里只做同步兜底。
   *
   * @param {{ x: number, y: number } | null} point 世界坐标。
   * @returns {void}
   */
  #syncDomCursorByWorldPoint(point) {
    if (!point || this.#innerEditor?.dragging) {
      return
    }

    const cursor = this.#findEditControlCursor(point)

    if (cursor) {
      this.#setDomCursor(cursor)
      return
    }

    this.#setDomCursor('')
  }

  /**
   * 查找当前世界坐标命中的编辑控制节点光标。
   *
   * @param {{ x: number, y: number }} point 世界坐标。
   * @returns {string | null} CSS cursor 字符串。
   */
  #findEditControlCursor(point) {
    const editBox = this.#innerEditor?.editBox

    if (!editBox?.visible) {
      return null
    }

    if (this.#isPointInVisibleNode(this.#rotatePoint, point)) {
      return 'pointer'
    }

    const pointCursor = this.#findResizePointCursor(editBox, point)
    if (pointCursor) {
      return pointCursor
    }

    const lineCursor = this.#findResizeLineCursor(editBox, point)
    if (lineCursor) {
      return lineCursor
    }

    if (this.#isPointInVisibleNode(editBox.rect, point)) {
      return this.#getMoveCursor(editBox)
    }

    return null
  }

  /**
   * 查找命中的缩放控制点 cursor。
   *
   * @param {import('@leafer-in/interface').IEditBox} editBox 编辑框实例。
   * @param {{ x: number, y: number }} point 世界坐标。
   * @returns {string | null} CSS cursor 字符串。
   */
  #findResizePointCursor(editBox, point) {
    const points = editBox?.resizePoints ?? []

    for (let index = points.length - 1; index >= 0; index -= 1) {
      if (this.#isPointInVisibleNode(points[index], point)) {
        return this.#getResizeHandleCursor(index)
      }
    }

    return null
  }

  /**
   * 查找命中的缩放边线 cursor。
   *
   * @param {import('@leafer-in/interface').IEditBox} editBox 编辑框实例。
   * @param {{ x: number, y: number }} point 世界坐标。
   * @returns {string | null} CSS cursor 字符串。
   */
  #findResizeLineCursor(editBox, point) {
    const lines = editBox?.resizeLines ?? []

    for (let index = lines.length - 1; index >= 0; index -= 1) {
      if (this.#isPointInVisibleNode(lines[index], point)) {
        return RESIZE_LINE_CURSORS[index] ?? 'pointer'
      }
    }

    return null
  }

  /**
   * 判断世界坐标是否命中可见节点外框。
   *
   * @param {import('leafer-ui').UI | null} node Leafer 节点。
   * @param {{ x: number, y: number }} point 世界坐标。
   * @returns {boolean} 是否命中。
   */
  #isPointInVisibleNode(node, point) {
    const bounds = node?.worldBoxBounds

    if (!node || node.visible === false || !bounds) {
      return false
    }

    return (
      point.x >= bounds.x &&
      point.x <= bounds.x + bounds.width &&
      point.y >= bounds.y &&
      point.y <= bounds.y + bounds.height
    )
  }

  #onBeforeSelect(e) {
    if (this.#isTogglingLock) return

    // 如果即将选中的列表与当前选中相同，说明是对已选中元素的重复点击，
    // 不应该移除当前的按钮（否则不会收到后续 SELECT 事件来重建按钮）。
    try {
      const nextList = e?.list ?? []
      const currList = this.#innerEditor?.list ?? []
      if (Array.isArray(nextList) && nextList.length === currList.length) {
        const currSet = new Set(currList)
        const same = nextList.every((it) => currSet.has(it))
        if (same) return
      }
    } catch (err) {
      console.warn('[canvas-editor-core] Failed to compare editor selection before select.', err)
    }

    this.#resetSelectionControls()
  }

  /**
   * @param {import('@leafer-in/interface').IEditorEvent} e
   */
  #onSelect(e) {
    if (this.#isTogglingLock) return
    const list = e?.list ?? []
    this.closeLayerMenu()

    if (list.length === 0) {
      this.#resetSelectionControls()
      this.#emitSelectionToolbarState()
      return
    }

    this.#syncSelectionControls(list)
  }

  // ────────── 选区控制 ──────────

  /**
   * @param {import('leafer-ui').UI[]} selected
   * @returns {void}
   */
  #syncSelectionControls(selected) {
    const editBox = this.#innerEditor.editBox
    if (!editBox) {
      // 锁定切换时 editBox 可能正在重建中，延迟重试
      if (this.#lockRetryCount > 0) {
        this.#lockRetryCount--
        requestAnimationFrame(() => {
          if (!this.#disposed) {
            this.#syncSelectionControls(selected)
          }
        })
      }
      return
    }

    // 成功拿到 editBox，清零重试计数
    this.#lockRetryCount = 0
    this.#patchTextEditBoxUpdateBounds(editBox)

    // 计算选中元素的共享属性快照，并共享到 innerEditor，供其它模块使用
    const shared = this.#computeSharedAttributes(selected)
    try {
      // 将共享属性附加到 innerEditor（非侵入式属性），方便外部读取
      this.#innerEditor.selectionAttributes = shared
    } catch (err) {
      console.warn('[canvas-editor-core] Failed to attach selection attributes.', err)
    }

    this.#resetSelectionControls()

    // 判断锁定态：使用共享属性决定（true = 全部锁定，false = 全部未锁定，undefined = 混合）
    const allLocked = shared.locked === true
    this.#syncMoveCursor(editBox)
    this.#syncResizeControls(editBox, selected)
    this.#syncMiddleHandleHover(editBox)
    this.#scheduleTextResizeControlsSync()
    this.#syncRotateButton(editBox, allLocked)

    if (allLocked) {
      this.#showLockedEditBox(editBox)
    }

    this.#emitSelectionToolbarState()
  }

  /**
   * 计算选中元素的共享属性：若所有元素某属性值相同则返回该值，若存在差异则返回 undefined。
   * @param {import('leafer-ui').UI[]} selected
   * @returns {Object}
   */
  #computeSharedAttributes(selected) {
    if (!Array.isArray(selected) || selected.length === 0) return {}

    const keys = ['locked', 'draggable', 'editable', 'rotation', 'opacity']
    const shared = {}

    for (const key of keys) {
      let value = selected[0][key]
      let same = true
      for (let i = 1; i < selected.length; i++) {
        if (selected[i][key] !== value) {
          same = false
          break
        }
      }
      shared[key] = same ? value : undefined
    }

    return shared
  }

  /**
   * 获取外部选区工具条需要的可序列化状态。
   *
   * @returns {{
   *   visible: boolean,
   *   bounds: { x: number, y: number, width: number, height: number } | null,
   *   locked: boolean,
   *   selectionCount: number,
   *   isImageSelection: boolean,
   *   canEditAttributes: boolean,
   *   canGroup: boolean,
   *   canUngroup: boolean,
   *   disabled: {
   *     replace: boolean,
   *     attributes: boolean,
   *     duplicate: boolean,
   *     delete: boolean,
   *     layer: boolean,
   *     group: boolean,
   *     ungroup: boolean
   *   }
   * }} 选区工具条状态。
   */
  getSelectionToolbarState() {
    const selected = this.#innerEditor?.list ?? []
    const bounds = this.#getSelectionBounds(selected)
    const locked = this.#computeSharedAttributes(selected).locked === true
    const visible = selected.length > 0 && Boolean(bounds)
    const isImageSelection = selected.length === 1 && selected[0] instanceof LeaferImage
    const canEditAttributes = selected.length === 1
      && (isImageSelection || isTextElement(selected[0]))
    const canGroup = this.#canGroupSelection(selected)
    const canUngroup = selected.length === 1 && this.#isEditorGroup(selected[0]) && !locked

    return {
      visible,
      bounds: visible ? bounds : null,
      locked,
      selectionCount: selected.length,
      isImageSelection,
      canEditAttributes,
      canGroup,
      canUngroup,
      disabled: {
        replace: !isImageSelection || locked,
        attributes: !canEditAttributes,
        duplicate: !visible || locked,
        delete: !visible || locked,
        layer: !visible || locked,
        group: !canGroup,
        ungroup: !canUngroup
      }
    }
  }

  /**
   * 判断当前多选是否可组合。
   *
   * Leafer 官方组合要求节点属于同一父级；锁定节点不参与结构变更。
   *
   * @param {import('leafer-ui').UI[]} selected 当前选中元素。
   * @returns {boolean} 是否允许组合。
   */
  #canGroupSelection(selected) {
    if (selected.length < 2 || selected.some((item) => item?.locked)) {
      return false
    }

    const parent = selected[0]?.parent
    return Boolean(parent && selected.every((item) => item?.parent === parent))
  }

  /**
   * 判断节点是否为编辑器创建的组合。
   *
   * @param {import('leafer-ui').UI | null} element Leafer 元素。
   * @returns {boolean} 是否为可解组节点。
   */
  #isEditorGroup(element) {
    return Boolean(
      element?.isBranch &&
      (element[EDITOR_GROUP_KEY] === true || element.customType === EDITOR_GROUP_NAME)
    )
  }

  /**
   * 合并当前选区全部元素的世界坐标边界。
   *
   * @param {import('leafer-ui').UI[]} selected 当前选中元素。
   * @returns {{ x: number, y: number, width: number, height: number } | null} 合并边界。
   */
  #getSelectionBounds(selected) {
    const boundsList = selected
      .map((item) => item?.worldBoxBounds)
      .filter((bounds) => (
        Number.isFinite(bounds?.x) &&
        Number.isFinite(bounds?.y) &&
        Number.isFinite(bounds?.width) &&
        Number.isFinite(bounds?.height)
      ))

    if (boundsList.length === 0) {
      return null
    }

    const minX = Math.min(...boundsList.map((bounds) => bounds.x))
    const minY = Math.min(...boundsList.map((bounds) => bounds.y))
    const maxX = Math.max(...boundsList.map((bounds) => bounds.x + bounds.width))
    const maxY = Math.max(...boundsList.map((bounds) => bounds.y + bounds.height))

    return {
      x: minX,
      y: minY,
      width: maxX - minX,
      height: maxY - minY
    }
  }

  /**
   * 合并同一帧内的连续变换事件，再通知外部视图层更新工具条位置。
   *
   * @returns {void}
   */
  #scheduleSelectionToolbarState() {
    if (this.#selectionStateFrame !== null) {
      return
    }

    this.#selectionStateFrame = requestAnimationFrame(() => {
      this.#selectionStateFrame = null
      this.#emitSelectionToolbarState()
    })
  }

  /**
   * 发布当前选区工具条状态。
   *
   * @returns {void}
   */
  #emitSelectionToolbarState() {
    this.#eventBus?.emit('selection:toolbar-changed', this.getSelectionToolbarState())
  }

  /**
   * 通知外部视图层关闭选区层级菜单。
   *
   * @returns {void}
   */
  closeLayerMenu() {
    this.#eventBus?.emit('selection:layer-menu-close')
  }

  /**
   * @param {import('@leafer-in/interface').IEditBox} editBox
   */
  #showLockedEditBox(editBox) {
    editBox.visible = true
    editBox.rect.visible = true
    this.#syncMoveCursor(editBox)
    editBox.circle.visible = false
    editBox.resizePoints?.forEach(hideResizeControl)
    editBox.rotatePoints?.forEach((point) => {
      point.visible = false
    })
    editBox.resizeLines?.forEach(hideResizeControl)
    if (editBox.buttons) {
      editBox.buttons.visible = false
    }
    this.#hideRotationTip()
  }

  /**
   * 变换过程中官方 EditBox 会刷新控制点，需要立即并在下一帧再次同步。
   *
   * @returns {void}
   */
  #onTransform() {
    this.#enforceTextResizeControls()
    this.#scheduleTextResizeControlsSync()
    this.#scheduleSelectionToolbarState()
  }

  /**
   * 包装官方 EditBox.updateBounds，在官方刷新控制点后同步文字控制点。
   *
   * @param {import('@leafer-in/interface').IEditBox} editBox 编辑框实例。
   * @returns {void}
   */
  #patchTextEditBoxUpdateBounds(editBox) {
    if (!editBox || this.#patchedEditBox === editBox) {
      return
    }

    this.#restoreEditBoxUpdateBounds()

    const originalUpdateBounds = editBox.updateBounds
    if (typeof originalUpdateBounds !== 'function') {
      return
    }

    this.#patchedEditBox = editBox
    this.#originalEditBoxUpdateBounds = originalUpdateBounds
    editBox.updateBounds = (bounds) => {
      originalUpdateBounds.call(editBox, bounds)
      this.#enforceTextResizeControls()
    }
  }

  /**
   * 还原官方 EditBox.updateBounds。
   *
   * @returns {void}
   */
  #restoreEditBoxUpdateBounds() {
    if (this.#patchedEditBox && this.#originalEditBoxUpdateBounds) {
      this.#patchedEditBox.updateBounds = this.#originalEditBoxUpdateBounds
    }

    this.#patchedEditBox = null
    this.#originalEditBoxUpdateBounds = null
  }

  /**
   * 在 Leafer 移动/拖拽事件中同步文字控制点，避免官方刷新时短暂闪现。
   *
   * @returns {void}
   */
  #enforceTextResizeControls() {
    const selected = this.#innerEditor?.list ?? []

    if (selected.some(isTextElement)) {
      this.#syncTextResizeControls(this.#innerEditor?.editBox)
    }
  }

  #scheduleTextResizeControlsSync() {
    const selected = this.#innerEditor?.list ?? []

    if (!selected.some(isTextElement) || this.#textResizeSyncFrame !== null) {
      return
    }

    this.#textResizeSyncFrame = requestAnimationFrame(() => {
      this.#textResizeSyncFrame = null

      if (!this.#disposed) {
        this.#enforceTextResizeControls()
      }
    })
  }

  #resetSelectionControls() {
    this.#unbindMiddleHandleHover()
    this.#unbindImmediateCursorHover()
    this.#unbindRotateButton()
    this.#removeRotationTip()
    this.closeLayerMenu()
  }

  /**
   * @param {import('@leafer-in/interface').IEditBox} editBox
   */
  #syncMoveCursor(editBox) {
    if (editBox?.rect) {
      this.#bindMoveCursorEvents(editBox.rect)
      editBox.rect.cursor = this.#getMoveCursor(editBox)
    }
  }

  /**
   * @param {import('leafer-ui').Rect} rect
   */
  #bindMoveCursorEvents(rect) {
    if (this.#cursorRect === rect) {
      return
    }

    this.#unbindMoveCursorEvents()
    this.#cursorRect = rect
    rect.on_(PointerEvent.ENTER, this.#onImmediateCursorEnter, this)
    rect.on_(PointerEvent.DOWN, this.#onMoveCursorDown, this)
    rect.on_(PointerEvent.UP, this.#onMoveCursorEnd, this)
    rect.on_(PointerEvent.LEAVE, this.#onMoveCursorEnd, this)
    rect.on_(PointerEvent.TAP, this.#onEditBoxTap, this)
  }

  #unbindMoveCursorEvents() {
    if (!this.#cursorRect) {
      return
    }

    this.#cursorRect.off_(PointerEvent.DOWN, this.#onMoveCursorDown, this)
    this.#cursorRect.off_(PointerEvent.UP, this.#onMoveCursorEnd, this)
    this.#cursorRect.off_(PointerEvent.ENTER, this.#onImmediateCursorEnter, this)
    this.#cursorRect.off_(PointerEvent.LEAVE, this.#onMoveCursorEnd, this)
    this.#cursorRect.off_(PointerEvent.TAP, this.#onEditBoxTap, this)
    this.#cursorRect = null
  }

  #syncMiddleHandleHover(editBox) {
    this.#unbindMiddleHandleHover()
    const resizePoints = editBox?.resizePoints ?? []
    this.#middleHandles = resizePoints.filter(
      (point, index) => index % 2 === 1 && point?.visible !== false && point?.hittable !== false
    )

    this.#middleHandles.forEach((point) => {
      point.cursor = this.#getResizeHandleCursor(resizePoints.indexOf(point))
      point.on_(PointerEvent.ENTER, this.#onMiddleHandleEnter, this)
      point.on_(PointerEvent.LEAVE, this.#onMiddleHandleLeave, this)
    })
  }

  /**
   * 同步选择框控制点的可见性、命中状态和 cursor。
   *
   * @param {import('@leafer-in/interface').IEditBox} editBox 编辑框实例。
   * @param {import('leafer-ui').UI[]} selected 当前选中元素。
   * @returns {void}
   */
  #syncResizeControls(editBox, selected = []) {
    const isTextSelected = Array.isArray(selected) && selected.some(isTextElement)
    editBox.config = isTextSelected
      ? { ...(editBox.config ?? {}), editSize: 'size', lockRatio: false }
      : undefined

    editBox?.resizePoints?.forEach((point, index) => {
      if (isTextSelected && !TEXT_RESIZE_POINT_INDEXES.has(index)) {
        hideResizeControl(point)
        return
      }

      showResizeControl(point, this.#getResizeHandleCursor(index))
      if (isTextSelected) {
        point.editConfig = {
          editSize: index === 0 ? 'font-size' : 'size',
          lockRatio: index === 0
        }
      }
      this.#bindImmediateCursorHover(point)
    })

    editBox?.resizeLines?.forEach((line, index) => {
      if (isTextSelected) {
        hideResizeControl(line)
        return
      }

      showResizeControl(line, RESIZE_LINE_CURSORS[index] ?? 'pointer')
      if (isTextSelected) {
        line.editConfig = { editSize: 'size', lockRatio: false }
      }
      this.#bindImmediateCursorHover(line)
    })
  }

  /**
   * 选择框控制点在 hover 当帧直接刷新 canvas cursor。
   *
   * @param {import('leafer-ui').UI} target 需要即时刷新 cursor 的节点。
   * @returns {void}
   */
  #bindImmediateCursorHover(target) {
    if (!target || this.#cursorHoverTargets.includes(target)) {
      return
    }

    this.#cursorHoverTargets.push(target)
    target.on_(PointerEvent.ENTER, this.#onImmediateCursorEnter, this)
    target.on_(PointerEvent.LEAVE, this.#onImmediateCursorLeave, this)
  }

  #unbindImmediateCursorHover() {
    this.#cursorHoverTargets.forEach((target) => {
      target.off_(PointerEvent.ENTER, this.#onImmediateCursorEnter, this)
      target.off_(PointerEvent.LEAVE, this.#onImmediateCursorLeave, this)
    })
    this.#cursorHoverTargets = []
  }

  #unbindMiddleHandleHover() {
    this.#middleHandles.forEach((point) => {
      point.off_(PointerEvent.ENTER, this.#onMiddleHandleEnter, this)
      point.off_(PointerEvent.LEAVE, this.#onMiddleHandleLeave, this)
    })
    this.#middleHandles = []
  }

  /**
   * 保留文字选框左上角和右侧中点，并隐藏其它缩放控制点。
   *
   * @param {import('@leafer-in/interface').IEditBox} editBox 编辑框实例。
   * @returns {void}
   */
  #syncTextResizeControls(editBox) {
    editBox?.resizePoints?.forEach((point, index) => {
      if (TEXT_RESIZE_POINT_INDEXES.has(index)) {
        return
      }

      hideResizeControl(point)
    })

    editBox?.resizeLines?.forEach(hideResizeControl)
  }

  /**
   * @param {import('@leafer-in/interface').IEditBox} editBox
   * @param {boolean} disabled
   */
  #syncRotateButton(editBox, disabled) {
    this.#unbindRotateButton()

    if (!editBox?.circle) return

    const point = editBox.circle
    this.#rotatePoint = point
    point.set({
      width: ROTATE_BTN_SIZE,
      height: ROTATE_BTN_SIZE,
      cornerRadius: BTN_RADIUS,
      fill: disabled ? this.#theme.disabledFillColor : this.#theme.surfaceColor,
      stroke: this.#theme.borderColor,
      strokeWidth: 1,
      shadow: this.#theme.shadow,
      cursor: disabled ? undefined : 'pointer',
      opacity: disabled ? 0 : 1,
      visible: !disabled
    })

    if (!disabled) {
      this.#rotateIcon = new LeaferImage({
        url: this.#rotateIconUrl,
        x: ROTATE_ICON_INSET,
        y: ROTATE_ICON_INSET,
        width: ROTATE_ICON_SIZE,
        height: ROTATE_ICON_SIZE,
        hittable: false
      })
      point.add(this.#rotateIcon)
      point.on_(PointerEvent.ENTER, this.#onRotateButtonEnter, this)
      point.on_(PointerEvent.LEAVE, this.#onRotateButtonLeave, this)
      point.on_(PointerEvent.DOWN, this.#onRotateButtonDown, this)
      point.on_(PointerEvent.UP, this.#onRotateButtonEnd, this)
      point.on_(DragEvent.END, this.#onRotateButtonEnd, this)
    }

    editBox.layoutCircle?.()
  }

  #unbindRotateButton() {
    if (!this.#rotatePoint) return

    if (this.#rotateIcon) {
      this.#rotateIcon.remove()
      this.#rotateIcon.destroy()
      this.#rotateIcon = null
    }

    this.#rotatePoint.off_(PointerEvent.ENTER, this.#onRotateButtonEnter, this)
    this.#rotatePoint.off_(PointerEvent.LEAVE, this.#onRotateButtonLeave, this)
    this.#rotatePoint.off_(PointerEvent.DOWN, this.#onRotateButtonDown, this)
    this.#rotatePoint.off_(PointerEvent.UP, this.#onRotateButtonEnd, this)
    this.#rotatePoint.off_(DragEvent.END, this.#onRotateButtonEnd, this)
    this.#rotatePoint = null
  }

  #onRotateButtonEnter(e) {
    e.current.cursor = 'pointer'
    this.#setCanvasCursor('pointer', e.current)
    e.current?.set?.({
      fill: this.#theme.surfaceColor,
      shadow: this.#theme.shadow
    })
  }

  #onRotateButtonLeave(e) {
    e.current?.set?.({
      fill: this.#theme.surfaceColor,
      shadow: this.#theme.shadow
    })
    this.#updateCanvasCursor(e.current)
  }

  #onRotateButtonDown() {
    this.closeLayerMenu()
    const selected = this.#innerEditor?.list ?? []
    const rotation = selected.length === 1 ? selected[0]?.rotation : this.#computeSharedAttributes(selected).rotation
    this.#showRotationTip(this.#formatRotation(rotation ?? 0))
  }

  #onRotateButtonEnd() {
    this.#hideRotationTip()
  }

  #onRotate(e) {
    this.#showRotationTip(this.#formatRotation(e?.target?.rotation ?? e?.rotation ?? 0))
    this.#scheduleSelectionToolbarState()
  }

  /**
   * @param {string} text
   */
  #showRotationTip(text) {
    const editBox = this.#innerEditor?.editBox
    const point = this.#rotatePoint
    if (!editBox?.view || !point) return

    const tip = this.#rotationTip ?? this.#createRotationTip()
    const y = point.y + ROTATE_BTN_SIZE / 2 + ROTATE_ANGLE_GAP

    tip.x = point.x - ROTATE_ANGLE_WIDTH / 2
    tip.y = y
    tip.visible = true

    const label = tip.children?.[1]
    if (label) label.text = text

    if (!this.#rotationTip) {
      this.#rotationTip = tip
      editBox.view.add(tip)
    }
  }

  #hideRotationTip() {
    if (this.#rotationTip) {
      this.#rotationTip.visible = false
    }
  }

  #removeRotationTip() {
    if (this.#rotationTip) {
      this.#rotationTip.remove()
      this.#rotationTip.destroy()
      this.#rotationTip = null
    }
  }

  #createRotationTip() {
    const tip = new Group({ visible: false, hittable: false })
    const bg = new Rect({
      width: ROTATE_ANGLE_WIDTH,
      height: ROTATE_ANGLE_HEIGHT,
      cornerRadius: 6,
      fill: this.#theme.rotationTipFill
    })
    const label = new Text({
      text: '0°',
      width: ROTATE_ANGLE_WIDTH,
      height: ROTATE_ANGLE_HEIGHT,
      fontSize: 12,
      fill: this.#theme.rotationTipTextColor,
      textAlign: 'center',
      verticalAlign: 'middle'
    })

    tip.addMany(bg, label)
    return tip
  }

  #formatRotation(rotation) {
    const normalized = (((-rotation) % 360) + 360) % 360
    return `${Math.round(normalized)}°`
  }

  #onEditBoxTap(e) {
    try {
      e.stop()
    } catch (err) {
      console.warn('[canvas-editor-core] Failed to stop edit box tap event.', err)
    }

    const list = this.#innerEditor?.list ?? []
    if (!list || list.length === 0) return

    const shared = this.#computeSharedAttributes(list)
    if (shared.locked === true) {
      requestAnimationFrame(() => {
        if (!this.#disposed) this.#syncSelectionControls(list)
      })
    }
  }

  #onMoveCursorDown() {
    this.closeLayerMenu()
    if (this.#cursorRect) {
      this.#cursorRect.cursor = this.#getMoveCursor(this.#innerEditor?.editBox)
      this.#setCanvasCursor(this.#cursorRect.cursor, this.#cursorRect)
    }
  }

  #onMoveCursorEnd() {
    if (this.#cursorRect) {
      this.#cursorRect.cursor = this.#getMoveCursor(this.#innerEditor?.editBox)
      this.#updateCanvasCursor(this.#cursorRect)
    }
  }

  #onMiddleHandleEnter(e) {
    const point = e.current
    if (point) {
      point.cursor = point.cursor ?? 'pointer'
      this.#setCanvasCursor(point.cursor, point)
    }

    e.current?.set?.({
      stroke: this.#theme.primaryColor,
      shadow: this.#theme.middleHandleHoverShadow
    })
  }

  #onMiddleHandleLeave(e) {
    e.current?.set?.({
      stroke: this.#theme.borderColor,
      shadow: this.#theme.middleHandleShadow
    })
    this.#updateCanvasCursor(e.current)
  }

  #getMoveCursor(editBox) {
    return editBox?.mergedConfig?.moveCursor ?? editBox?.mergeConfig?.moveCursor ?? 'move'
  }

  #getResizeHandleCursor(index) {
    return RESIZE_HANDLE_CURSORS[index] ?? 'pointer'
  }

  #onImmediateCursorEnter(e) {
    const cursor = e.current?.cursor
    if (cursor) {
      this.#setCanvasCursor(cursor, e.current)
    }
  }

  #onImmediateCursorLeave(e) {
    this.#updateCanvasCursor(e.current)
  }

  /**
   * 立即写入 canvas 的 DOM 光标，兜底官方交互层下一帧才更新的问题。
   *
   * @param {import('@leafer-ui/interface').ICursorType} cursor 光标样式。
   * @param {import('leafer-ui').UI} target 当前 hover 的节点。
   * @returns {void}
   */
  #setCanvasCursor(cursor, target) {
    const interaction = this.#getInteraction(target)
    interaction?.setCursor?.(cursor)
    this.#setDomCursor(cursor)
  }

  /**
   * 离开控制点后交还给 Leafer 官方交互层重新计算光标。
   *
   * @param {import('leafer-ui').UI} target 当前离开的节点。
   * @returns {void}
   */
  #updateCanvasCursor(target) {
    const interaction = this.#getInteraction(target)
    interaction?.updateCursor?.()
    this.#setDomCursor('')
    requestAnimationFrame(() => {
      if (!this.#disposed) {
        interaction?.updateCursor?.()
      }
    })
  }

  /**
   * 获取 Leafer 交互层实例。
   *
   * @param {import('leafer-ui').UI} target 当前 hover 的节点。
   * @returns {Object | null} Leafer 交互层实例。
   */
  #getInteraction(target) {
    return target?.leafer?.interaction ?? target?.app?.interaction ?? this.#innerEditor?.app?.interaction
  }

  /**
   * 直接设置宿主视图 cursor，作为官方 updateCursor 的同步兜底。
   *
   * @param {import('@leafer-ui/interface').ICursorType} cursor 光标样式。
   * @returns {void}
   */
  #setDomCursor(cursor) {
    const view = this.#innerEditor?.app?.view

    if (view?.style && typeof cursor === 'string') {
      view.style.cursor = cursor
      view.querySelectorAll?.('canvas')?.forEach((canvas) => {
        canvas.style.cursor = cursor
      })
    }
  }

  // ────────── 操作逻辑 ──────────

  /**
   * 切换当前选区的锁定状态。
   *
   * @returns {void}
   */
  toggleSelectionLock() {
    const selected = [...(this.#innerEditor?.list ?? [])]

    if (selected.length === 0) {
      return
    }

    const allLocked = this.#computeSharedAttributes(selected).locked === true
    this.#toggleLock(selected, allLocked)
  }

  /**
   * 复制当前未锁定的选区。
   *
   * @returns {void}
   */
  duplicateSelection() {
    const selected = [...(this.#innerEditor?.list ?? [])]

    if (selected.length === 0 || this.getSelectionToolbarState().disabled.duplicate) {
      return
    }

    this.#copySelected(selected)
  }

  /**
   * 删除当前未锁定的选区。
   *
   * @returns {void}
   */
  deleteSelection() {
    const selected = [...(this.#innerEditor?.list ?? [])]

    if (selected.length === 0 || this.getSelectionToolbarState().disabled.delete) {
      return
    }

    this.#deleteSelected(selected)
  }

  /**
   * 使用 Leafer Editor 官方能力组合当前多选节点。
   *
   * @returns {void}
   */
  groupSelection() {
    const selected = [...(this.#innerEditor?.list ?? [])]

    if (!this.#canGroupSelection(selected)) {
      return
    }

    const group = this.#innerEditor.group({
      name: EDITOR_GROUP_NAME,
      customType: EDITOR_GROUP_NAME,
      editable: true,
      draggable: true
    })

    if (!group) {
      return
    }

    group.name = EDITOR_GROUP_NAME
    group.customType = EDITOR_GROUP_NAME
    group[EDITOR_GROUP_KEY] = true
    this.#eventBus?.emit('selection:group-changed', {
      action: 'group',
      group,
      children: selected
    })
    this.#innerEditor.update?.()
    this.#scheduleSelectionToolbarState()
  }

  /**
   * 使用 Leafer Editor 官方能力解散当前组合节点。
   *
   * @returns {void}
   */
  ungroupSelection() {
    const selected = [...(this.#innerEditor?.list ?? [])]
    const group = selected[0]

    if (selected.length !== 1 || !this.#isEditorGroup(group) || group.locked) {
      return
    }

    const children = [...(group.children ?? [])]
    this.#innerEditor.ungroup()
    this.#eventBus?.emit('selection:group-changed', {
      action: 'ungroup',
      group,
      children
    })
    this.#innerEditor.update?.()
    this.#scheduleSelectionToolbarState()
  }

  /**
   * @param {import('leafer-ui').UI[]} selected
   * @param {boolean} currentlyLocked
   */
  #toggleLock(selected, currentlyLocked) {
    this.#isTogglingLock = true
    this.#lockRetryCount = 20 // 允许最多 20 帧重试
    const shouldLock = !currentlyLocked
    selected.forEach((item) => {
      item.locked = shouldLock
    })
    this.#innerEditor.update?.()

    // 等 Leafer 完成 editBox 的锁定态更新后，再刷新控制点和外部选区状态。
    requestAnimationFrame(() => {
      if (!this.#disposed) {
        this.#syncSelectionControls(selected)
      }
      this.#isTogglingLock = false
    })
  }

  /**
   * @param {import('leafer-ui').UI[]} selected
   */
  #copySelected(selected) {
    const toAdd = []
    const pairs = []
    for (const item of selected) {
      const clone = item.clone()
      clone.set({
        x: item.x + 20,
        y: item.y + 20,
        editable: true,
        draggable: true,
        locked: false
      })
      cloneElementData(item, clone)
      toAdd.push(clone)
      pairs.push({ source: item, clone })
    }

    // 挂到原元素所在父容器
    const parent = selected[0]?.parent
    if (parent?.addMany) {
      parent.addMany(...toAdd)
      this.#eventBus?.emit('selection:duplicated', { pairs })
      const nextSelection = toAdd.length === 1 ? toAdd[0] : toAdd
      this.#innerEditor.select(nextSelection)
    }

    this.#innerEditor.updateEditBox?.()
    this.#scheduleSelectionToolbarState()
  }

  /**
   * @param {import('leafer-ui').UI[]} selected
   */
  #deleteSelected(selected) {
    const targets = [...(selected ?? [])]

    if (targets.length === 0) {
      return
    }

    for (const item of targets) {
      item.remove()
    }

    this.#eventBus?.emit('selection:deleted', { targets })
    this.#innerEditor.cancel()
    this.#innerEditor.updateEditBox?.()
    this.closeLayerMenu()
  }

  /**
   * @param {'front' | 'forward' | 'backward' | 'back'} action
   * @param {import('leafer-ui').UI[]} selected
   */
  #runLayerAction(action, selected) {
    const groups = this.#groupSelectedByParent(selected)

    for (const { parent, items } of groups) {
      if (action === 'front') {
        this.#moveItemsToFront(parent, items)
      } else if (action === 'forward') {
        this.#moveItemsForward(parent, items)
      } else if (action === 'backward') {
        this.#moveItemsBackward(parent, items)
      } else if (action === 'back') {
        this.#moveItemsToBack(parent, items)
      }
    }

    this.closeLayerMenu()
    this.#eventBus?.emit('selection:layer-changed', { action, selected })
    this.#innerEditor.updateEditBox?.()
    this.#scheduleSelectionToolbarState()
  }

  /**
   * 执行当前选区的层级操作，供外部菜单调用。
   *
   * @param {'front' | 'forward' | 'backward' | 'back'} action 层级动作。
   * @returns {void}
   */
  runLayerAction(action) {
    const selected = this.#innerEditor?.list ?? []

    if (selected.length === 0 || this.getSelectionToolbarState().disabled.layer) {
      this.closeLayerMenu()
      return
    }

    this.#runLayerAction(action, selected)
  }

  /**
   * 获取当前选区层级菜单的可序列化渲染数据。
   *
   * @param {import('leafer-ui').UI[]} [selected] 当前选中元素。
   * @returns {Array<{ key: string, label: string, shortcut: string, disabled: boolean }>}
   */
  getLayerMenuActions(selected = this.#innerEditor?.list ?? []) {
    const layerState = this.#getLayerState(selected)

    return this.#layerActions.map((action) => ({
      ...action,
      disabled: !layerState[action.key]
    }))
  }

  /**
   * 获取当前选区可执行的层级操作，供外部工具条调用。
   *
   * @returns {Array<{ key: string, label: string, shortcut: string, disabled: boolean }>}
   * 层级菜单项。
   */
  getSelectionLayerActions() {
    if (this.getSelectionToolbarState().disabled.layer) {
      return this.#layerActions.map((action) => ({ ...action, disabled: true }))
    }

    return this.getLayerMenuActions()
  }

  /**
   * @param {import('leafer-ui').UI[]} selected
   */
  #getLayerState(selected) {
    const groups = this.#groupSelectedByParent(selected)
    const initialState = { front: false, forward: false, backward: false, back: false }

    return groups.reduce((state, { parent, items }) => {
      const indexes = this.#getSortedIndexes(parent, items)
      const firstIndex = indexes[0]
      const lastIndex = indexes[indexes.length - 1]
      const childCount = parent.children.length

      return {
        front: state.front || lastIndex < childCount - 1,
        forward: state.forward || lastIndex < childCount - 1,
        backward: state.backward || firstIndex > 0,
        back: state.back || firstIndex > 0
      }
    }, initialState)
  }

  /**
   * @param {import('leafer-ui').UI[]} selected
   */
  #groupSelectedByParent(selected) {
    const parentMap = new Map()

    for (const item of selected) {
      const parent = item.parent
      if (!parent?.children?.length) {
        continue
      }
      if (!parentMap.has(parent)) {
        parentMap.set(parent, [])
      }
      parentMap.get(parent).push(item)
    }

    return [...parentMap.entries()].map(([parent, items]) => ({ parent, items }))
  }

  /**
   * @param {import('leafer-ui').Group} parent
   * @param {import('leafer-ui').UI[]} items
   * @returns {number[]}
   */
  #getSortedIndexes(parent, items) {
    return items
      .map((item) => parent.children.indexOf(item))
      .filter((index) => index >= 0)
      .sort((a, b) => a - b)
  }

  /**
   * @param {import('leafer-ui').Group} parent
   * @param {import('leafer-ui').UI[]} items
   */
  #moveItemsToFront(parent, items) {
    this.#sortItemsByIndex(parent, items).forEach((item) => {
      parent.add(item)
    })
  }

  /**
   * @param {import('leafer-ui').Group} parent
   * @param {import('leafer-ui').UI[]} items
   */
  #moveItemsToBack(parent, items) {
    this.#sortItemsByIndex(parent, items)
      .reverse()
      .forEach((item) => {
        parent.add(item, 0)
      })
  }

  /**
   * @param {import('leafer-ui').Group} parent
   * @param {import('leafer-ui').UI[]} items
   */
  #moveItemsForward(parent, items) {
    const selectedSet = new Set(items)
    this.#sortItemsByIndex(parent, items)
      .reverse()
      .forEach((item) => {
        const index = parent.children.indexOf(item)
        const next = parent.children[index + 1]
        if (next && !selectedSet.has(next)) {
          parent.addAfter(item, next)
        }
      })
  }

  /**
   * @param {import('leafer-ui').Group} parent
   * @param {import('leafer-ui').UI[]} items
   */
  #moveItemsBackward(parent, items) {
    const selectedSet = new Set(items)
    this.#sortItemsByIndex(parent, items).forEach((item) => {
      const index = parent.children.indexOf(item)
      const prev = parent.children[index - 1]
      if (prev && !selectedSet.has(prev)) {
        parent.addBefore(item, prev)
      }
    })
  }

  /**
   * @param {import('leafer-ui').Group} parent
   * @param {import('leafer-ui').UI[]} items
   */
  #sortItemsByIndex(parent, items) {
    return [...items].sort((a, b) => parent.children.indexOf(a) - parent.children.indexOf(b))
  }

  // ────────── 生命周期 ──────────

  destroy() {
    if (this.#disposed) return
    this.#disposed = true

    if (this.#selectionStateFrame !== null) {
      cancelAnimationFrame(this.#selectionStateFrame)
      this.#selectionStateFrame = null
    }

    if (this.#textResizeSyncFrame !== null) {
      cancelAnimationFrame(this.#textResizeSyncFrame)
      this.#textResizeSyncFrame = null
    }

    this.#resetSelectionControls()
    this.#unbindMoveCursorEvents()
    this.#unbindMiddleHandleHover()
    this.#unbindHoverFallback()
    this.#unbindTextResizeEvents()
    this.#restoreEditBoxUpdateBounds()

    if (this.#innerEditor) {
      this.#innerEditor.off_(EditorEvent.SELECT, this.#onSelect, this)
      this.#innerEditor.off_(EditorEvent.BEFORE_SELECT, this.#onBeforeSelect, this)
      this.#innerEditor.off_(EditorMoveEvent.BEFORE_MOVE, this.#onTransform, this)
      this.#innerEditor.off_(EditorMoveEvent.MOVE, this.#onTransform, this)
      this.#innerEditor.off_(EditorScaleEvent.BEFORE_SCALE, this.#onTransform, this)
      this.#innerEditor.off_(EditorScaleEvent.SCALE, this.#onTransform, this)
      this.#innerEditor.off_(EditorMoveEvent.BEFORE_MOVE, this.closeLayerMenu, this)
      this.#innerEditor.off_(EditorScaleEvent.BEFORE_SCALE, this.closeLayerMenu, this)
      this.#innerEditor.off_(EditorRotateEvent.BEFORE_ROTATE, this.closeLayerMenu, this)
      this.#innerEditor.off_(EditorRotateEvent.ROTATE, this.#onRotate, this)
      this.#innerEditor = null
    }
  }

  /**
   * 解绑 hover 兜底事件。
   *
   * @returns {void}
   */
  #unbindHoverFallback() {
    if (this.#hoverFallbackEventIds?.length) {
      this.#innerEditor?.app?.off_(this.#hoverFallbackEventIds)
      this.#hoverFallbackEventIds = []
    }

    if (this.#hoverFallbackView && this.#onDomHoverFallbackMove) {
      this.#hoverFallbackView.removeEventListener('pointermove', this.#onDomHoverFallbackMove)
    }

    if (this.#hoverFallbackView && this.#onDomHoverFallbackLeave) {
      this.#hoverFallbackView.removeEventListener('pointerleave', this.#onDomHoverFallbackLeave)
    }

    this.#hoverFallbackView = null
    this.#onDomHoverFallbackMove = null
    this.#onDomHoverFallbackLeave = null

    this.#hideHoverFallback()
  }

  /**
   * 解绑文本控制点同步事件。
   *
   * @returns {void}
   */
  #unbindTextResizeEvents() {
    if (this.#textResizeEventIds?.length) {
      this.#innerEditor?.app?.off_(this.#textResizeEventIds)
      this.#textResizeEventIds = []
    }
  }
}
