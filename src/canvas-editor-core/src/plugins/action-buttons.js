import { Group, Image as LeaferImage, Rect, Text, PointerEvent, DragEvent, MoveEvent } from 'leafer-ui'
import { EditorEvent, EditorMoveEvent, EditorRotateEvent, EditorScaleEvent } from '@leafer-in/editor'

import copyIconSvg from '../assets/icons/copy.svg?raw'
import deleteIconSvg from '../assets/icons/delete-themes.svg?raw'
import layerIconSvg from '../assets/icons/layers.svg?raw'
import lockIconSvg from '../assets/icons/lock.svg?raw'
import rotateIconSvg from '../assets/icons/rotate.svg?raw'
import unlockIconSvg from '../assets/icons/unlock.svg?raw'

import bringFrontIconSvg from '../assets/icons/bring-front.svg?raw'
import forwardIconSvg from '../assets/icons/forward.svg?raw'
import backwardIconSvg from '../assets/icons/backward.svg?raw'
import sendBackIconSvg from '../assets/icons/send-back.svg?raw'
import { isTextElement } from '../utils/text.js'

/**
 * 编辑器操作按钮管理器。
 *
 * 监听 @leafer-in/editor 的选中事件，在 EditBox 上动态添加
 * 锁定/解锁、复制、删除操作按钮。
 *
 * 按钮外观对齐 leafer-ui 的设计语言，放置在 editBox.buttons 容器中。
 *
 * 锁定元素时：
 *   - 显示解锁按钮 —— 始终可点击
 *   - 复制、删除按钮灰色且不可点击
 *
 * @author zzx
 * @since 2026-07-01
 */

const DEFAULT_ACTION_THEME = {
  primaryColor: '#4A90D9',
  surfaceColor: '#ffffff',
  borderColor: '#e5e7eb',
  textColor: '#111827',
  disabledTextColor: '#a8b0bd',
  disabledFillColor: '#f7f8fa',
  hoverFillColor: '#f3f4f6',
  transparentFillColor: 'rgba(255, 255, 255, 0)',
  shadow: { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(15, 23, 42, 0.14)' },
  menuShadow: { x: 0, y: 6, blur: 16, spread: 0, color: 'rgba(15, 23, 42, 0.14)' },
  middleHandleShadow: { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(15, 23, 42, 0.2)' },
  middleHandleHoverShadow: { x: 0, y: 3, blur: 10, spread: 0, color: 'rgba(37, 99, 235, 0.24)' },
  rotationTipFill: 'rgba(0, 0, 0, 0.7)',
  rotationTipTextColor: '#ffffff'
}

const BUTTON_ICON_SVGS = {
  lock: lockIconSvg,
  unlock: unlockIconSvg,
  layer: layerIconSvg,
  copy: copyIconSvg,
  delete: deleteIconSvg,
  rotate: rotateIconSvg
}

const LAYER_ACTION_DEFS = [
  {
    key: 'front',
    label: '移到最前',
    shortcut: '⌥⌘]',
    svg: bringFrontIconSvg
  },
  {
    key: 'forward',
    label: '前移',
    shortcut: '⌘]',
    svg: forwardIconSvg
  },
  {
    key: 'backward',
    label: '后移',
    shortcut: '⌘[',
    svg: backwardIconSvg
  },
  {
    key: 'back',
    label: '移到最后',
    shortcut: '⌥⌘[',
    svg: sendBackIconSvg
  }
]

const BAR_HEIGHT = 36
const BAR_PADDING_X = 8
const BTN_SIZE = 30
const ICON_SIZE = 20
const BTN_RADIUS = 8
const ROTATE_BTN_SIZE = 30
const ROTATE_ICON_INSET = 5
const ROTATE_ICON_SIZE = ROTATE_BTN_SIZE - ROTATE_ICON_INSET * 2
const ROTATE_ANGLE_GAP = 12
const ROTATE_ANGLE_WIDTH = 50
const ROTATE_ANGLE_HEIGHT = 24
const MENU_WIDTH = 132
const MENU_ITEM_HEIGHT = 34
const MENU_GAP = 8
const RESIZE_HANDLE_CURSORS = ['nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize', 'ew-resize']
const RESIZE_LINE_CURSORS = ['ns-resize', 'ew-resize', 'ns-resize', 'ew-resize']
const TEXT_WIDTH_RESIZE_POINT_INDEXES = new Set([3, 7])
const TEXT_WIDTH_RESIZE_LINE_INDEXES = new Set([1, 3])
const TEXT_HEIGHT_RESIZE_POINT_INDEXES = new Set([1, 5])
const TEXT_HEIGHT_RESIZE_LINE_INDEXES = new Set([0, 2])
const TEXT_WIDTH_EDIT_CONFIG = { editSize: 'size', lockRatio: false }
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

function createButtonStyles(theme) {
  return Object.entries(BUTTON_ICON_SVGS).reduce((styles, [key, svg]) => {
    styles[key] = {
      icon: createIconUrl(svg, theme.textColor),
      disabledIcon: createIconUrl(svg, theme.disabledTextColor)
    }
    return styles
  }, {})
}

function createLayerActions(theme) {
  return LAYER_ACTION_DEFS.map((action) => ({
    key: action.key,
    label: action.label,
    shortcut: action.shortcut,
    icon: createIconUrl(action.svg, theme.textColor),
    disabledIcon: createIconUrl(action.svg, theme.disabledTextColor)
  }))
}

export class EditorActionButtons {
  /** @type {import('@leafer-in/editor').Editor} */
  #innerEditor

  /** @type {Object} */
  #theme

  /** @type {Record<string, { icon: string, disabledIcon: string }>} */
  #btnStyle

  /** @type {Array<{ key: string, label: string, shortcut: string, icon: string, disabledIcon: string }>} */
  #layerActions

  /** @type {import('leafer-ui').Group | null} */
  #btnGroup

  /** @type {import('leafer-ui').Group | null} */
  #layerMenu

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

  /** @type {import('leafer-ui').UI[]} */
  #textWidthResizeTargets

  /** @type {Map<import('leafer-ui').UI, Object | null>} */
  #textWidthResizeConfigs

  /** @type {import('@leafer-in/interface').IEditBox | null} */
  #patchedEditBox

  /** @type {((bounds: import('@leafer-ui/interface').IBoundsData) => void) | null} */
  #originalEditBoxUpdateBounds

  /** @type {import('@leafer-ui/interface').IEventListenerId[]} */
  #hoverFallbackEventIds

  /** @type {import('@leafer-ui/interface').IEventListenerId[]} */
  #textHandleEventIds

  /** @type {HTMLElement | null} */
  #hoverFallbackView

  /** @type {((event: PointerEvent) => void) | null} */
  #onDomHoverFallbackMove

  /** @type {(() => void) | null} */
  #onDomHoverFallbackLeave

  /** @type {boolean} */
  #disposed = false

  /** 锁定切换期间跳过事件干扰 */
  #isTogglingLock = false

  /** 锁定切换后 editBox 尚未就绪时的重试计数器 */
  #lockRetryCount = 0

  /**
   * @param {import('@leafer-in/editor').Editor} innerEditor
   * @param {Object} [theme]
   */
  constructor(innerEditor, theme = {}) {
    this.#innerEditor = innerEditor
    this.#theme = normalizeActionTheme(theme)
    this.#btnStyle = createButtonStyles(this.#theme)
    this.#layerActions = createLayerActions(this.#theme)
    this.#btnGroup = null
    this.#layerMenu = null
    this.#cursorRect = null
    this.#rotatePoint = null
    this.#rotateIcon = null
    this.#rotationTip = null
    this.#middleHandles = []
    this.#cursorHoverTargets = []
    this.#textWidthResizeTargets = []
    this.#textWidthResizeConfigs = new Map()
    this.#patchedEditBox = null
    this.#originalEditBoxUpdateBounds = null
    this.#hoverFallbackEventIds = []
    this.#textHandleEventIds = []
    this.#hoverFallbackView = null
    this.#onDomHoverFallbackMove = null
    this.#onDomHoverFallbackLeave = null

    this.#innerEditor.on_(EditorEvent.SELECT, this.#onSelect, this)
    this.#innerEditor.on_(EditorEvent.BEFORE_SELECT, this.#onBeforeSelect, this)
    this.#innerEditor.on_(EditorMoveEvent.BEFORE_MOVE, this.#syncTextHeightHandlesAfterTransform, this)
    this.#innerEditor.on_(EditorMoveEvent.MOVE, this.#syncTextHeightHandlesAfterTransform, this)
    this.#innerEditor.on_(EditorScaleEvent.BEFORE_SCALE, this.#syncTextHeightHandlesAfterTransform, this)
    this.#innerEditor.on_(EditorScaleEvent.SCALE, this.#syncTextHeightHandlesAfterTransform, this)
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
      this.#textHandleEventIds = app.on_([
        [[MoveEvent.BEFORE_MOVE, MoveEvent.MOVE, MoveEvent.END], this.#syncTextHeightHandlesNow, this, true],
        [[DragEvent.START, DragEvent.DRAG, DragEvent.END], this.#syncTextHeightHandlesNow, this, true]
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
    this.#syncTextHeightHandlesNow()
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

    if (this.#isPointInVisibleNode(this.#layerMenu, point)) {
      return 'pointer'
    }

    if (this.#isPointInVisibleNode(this.#btnGroup, point)) {
      return 'pointer'
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

    this.#removeButtons()
  }

  /**
   * @param {import('@leafer-in/interface').IEditorEvent} e
   */
  #onSelect(e) {
    if (this.#isTogglingLock) return
    const list = e?.list ?? []
    if (list.length === 0) {
      this.#removeButtons()
      return
    }

    this.#buildButtons(list)
  }

  // ────────── 按钮构建 ──────────

  /**
   * @param {import('leafer-ui').UI[]} selected
   */
  #buildButtons(selected) {
    const editBox = this.#innerEditor.editBox
    if (!editBox?.buttons) {
      // 锁定切换时 editBox 可能正在重建中，延迟重试
      if (this.#lockRetryCount > 0) {
        this.#lockRetryCount--
        requestAnimationFrame(() => {
          if (!this.#disposed) {
            this.#buildButtons(selected)
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

    // 移除旧的
    this.#removeButtons()

    // 判断锁定态：使用共享属性决定（true = 全部锁定，false = 全部未锁定，undefined = 混合）
    const allLocked = shared.locked === true

    // 按钮定义：[key, callback, disabled?]
    let layerMenuX = 0
    const btnDefs = [
      [allLocked ? 'unlock' : 'lock', () => this.#toggleLock(selected, allLocked), false],
      ['copy', () => this.#copySelected(selected), allLocked],
      ['delete', () => this.#deleteSelected(selected), allLocked],
      ['layer', () => this.#toggleLayerMenu(editBox, selected, layerMenuX), allLocked]
    ]

    const totalWidth = btnDefs.length * BTN_SIZE
    const barWidth = totalWidth + BAR_PADDING_X * 2
    const btnGroup = new Group({ x: 0, y: 0 })
    const barBg = new Rect({
      x: -barWidth / 2,
      y: 0,
      width: barWidth,
      height: BAR_HEIGHT,
      cornerRadius: BAR_HEIGHT / 2,
      fill: this.#theme.surfaceColor,
      stroke: this.#theme.borderColor,
      strokeWidth: 1,
      shadow: this.#theme.shadow
    })
    let offsetX = -totalWidth / 2 // 居中（父容器 around: 'center'）

    btnGroup.add(barBg)

    for (const [key, onClick, disabled] of btnDefs) {
      const style = this.#btnStyle[key] || this.#btnStyle.lock
      const btn = disabled ? this.#createDisabledButton(key, offsetX) : this.#createButton(style, offsetX, onClick)
      btnGroup.add(btn)
      if (key === 'layer') {
        layerMenuX = offsetX + BTN_SIZE
      }
      offsetX += BTN_SIZE
    }

    this.#btnGroup = btnGroup
    editBox.buttons.add(btnGroup)
    this.#syncMoveCursor(editBox)
    this.#syncResizeHandleCursors(editBox, selected)
    this.#syncMiddleHandleHover(editBox, selected)
    this.#syncRotateButton(editBox, allLocked)

    if (allLocked) {
      this.#showLockedEditBox(editBox)
    }
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
   * @param {import('@leafer-in/interface').IEditBox} editBox
   * @param {import('leafer-ui').UI[]} selected
   * @param {number} menuX
   */
  #toggleLayerMenu(editBox, selected, menuX) {
    if (this.#layerMenu) {
      this.#removeLayerMenu()
      return
    }

    const layerState = this.#getLayerState(selected)
    const menu = new Group({
      x: editBox.buttons.x + menuX + MENU_GAP,
      y: editBox.buttons.y - MENU_ITEM_HEIGHT / 2
    })
    const menuBg = new Rect({
      width: MENU_WIDTH,
      height: this.#layerActions.length * MENU_ITEM_HEIGHT,
      cornerRadius: 8,
      fill: this.#theme.surfaceColor,
      stroke: this.#theme.borderColor,
      strokeWidth: 1,
      shadow: this.#theme.menuShadow
    })

    menu.add(menuBg)

    this.#layerActions.forEach((action, index) => {
      const canUse = layerState[action.key]
      const item = canUse
        ? this.#createLayerMenuItem(action, index, () => this.#runLayerAction(action.key, selected))
        : this.#createDisabledLayerMenuItem(action, index)
      menu.add(item)
    })

    this.#layerMenu = menu
    editBox.view.add(menu)
  }

  /**
   * @param {{ key: string, label: string, shortcut: string, icon: string }} action
   * @param {number} index
   * @param {() => void} onClick
   * @returns {Group}
   */
  #createLayerMenuItem(action, index, onClick) {
    const item = new Group({ x: 0, y: index * MENU_ITEM_HEIGHT, cursor: 'pointer' })
    const bg = new Rect({
      width: MENU_WIDTH,
      height: MENU_ITEM_HEIGHT,
      cornerRadius: 6,
      fill: this.#theme.transparentFillColor,
      cursor: 'pointer'
    })
    const icon = this.#createMenuIcon(action.icon)
    const label = this.#createMenuText(action.label, 34, this.#theme.textColor)
    const shortcut = this.#createShortcutText(action.shortcut, this.#theme.textColor)

    icon.cursor = 'pointer'
    label.cursor = 'pointer'
    shortcut.cursor = 'pointer'
    item.addMany(bg, icon, label, shortcut)
    item.on(PointerEvent.ENTER, (e) => {
      this.#setCanvasCursor('pointer', e.current)
      bg.fill = this.#theme.hoverFillColor
    })
    item.on(PointerEvent.LEAVE, (e) => {
      bg.fill = this.#theme.transparentFillColor
      this.#updateCanvasCursor(e.current)
    })
    item.on(PointerEvent.TAP, (e) => {
      e.stop()
      onClick?.()
    })

    return item
  }

  /**
   * @param {{ key: string, label: string, shortcut: string, icon: string }} action
   * @param {number} index
   * @returns {Group}
   */
  #createDisabledLayerMenuItem(action, index) {
    const item = new Group({ x: 0, y: index * MENU_ITEM_HEIGHT })
    const icon = this.#createMenuIcon(action.disabledIcon)
    const label = this.#createMenuText(action.label, 34, this.#theme.disabledTextColor)
    const shortcut = this.#createShortcutText(action.shortcut, this.#theme.disabledTextColor)

    item.addMany(icon, label, shortcut)
    return item
  }

  /**
   * @param {string} url
   * @returns {LeaferImage}
   */
  #createMenuIcon(url) {
    return new LeaferImage({ url, x: 10, y: 7, width: 20, height: 20 })
  }

  /**
   * @param {string} text
   * @param {number} x
   * @param {string} color
   * @returns {Text}
   */
  #createMenuText(text, x, color) {
    return new Text({
      text,
      x,
      y: 0,
      width: 58,
      height: MENU_ITEM_HEIGHT,
      fontSize: 13,
      fill: color,
      verticalAlign: 'middle'
    })
  }

  /**
   * @param {string} text
   * @param {string} color
   * @returns {Text}
   */
  #createShortcutText(text, color) {
    return new Text({
      text,
      x: 91,
      y: 7,
      width: 32,
      height: 20,
      fontSize: 11,
      fill: color,
      textAlign: 'center',
      verticalAlign: 'middle'
    })
  }

  /**
   * @param {import('@leafer-in/interface').IEditBox} editBox
   */
  #showLockedEditBox(editBox) {
    editBox.visible = true
    editBox.rect.visible = true
    this.#syncMoveCursor(editBox)
    editBox.circle.visible = false
    editBox.resizePoints?.forEach((point) => {
      point.visible = false
    })
    editBox.rotatePoints?.forEach((point) => {
      point.visible = false
    })
    editBox.resizeLines?.forEach((line) => {
      line.visible = false
    })
    editBox.buttons.visible = true
    editBox.layoutButtons?.()
    this.#hideRotationTip()
  }

  /**
   * 官方 EditBox 在变换后会刷新控制点，需要再次隐藏文本高度把手。
   *
   * @returns {void}
   */
  #syncTextHeightHandlesAfterTransform() {
    const selected = this.#innerEditor?.list ?? []

    if (!selected.some(isTextElement)) {
      return
    }

    this.#hideTextHeightHandles(this.#innerEditor?.editBox, selected)
    requestAnimationFrame(() => {
      if (!this.#disposed) {
        this.#hideTextHeightHandles(this.#innerEditor?.editBox, selected)
      }
    })
  }

  /**
   * 包装官方 EditBox.updateBounds，在官方刷新控制点后同帧隐藏文本高度把手。
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
      this.#syncTextHeightHandlesNow()
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
   * 在 Leafer 移动/拖拽事件当帧隐藏文本高度把手，避免官方刷新时短暂闪现。
   *
   * @returns {void}
   */
  #syncTextHeightHandlesNow() {
    const selected = this.#innerEditor?.list ?? []

    if (selected.some(isTextElement)) {
      this.#hideTextHeightHandles(this.#innerEditor?.editBox, selected)
    }
  }

  /**
   * @param {{ icon: string, disabledIcon: string }} style
   * @param {number} offsetX
   * @param {() => void} onClick
   * @returns {Group}
   */
  #createButton(style, offsetX, onClick) {
    const btn = new Group({ x: offsetX, y: 3, cursor: 'pointer' })

    const bg = new Rect({
      width: BTN_SIZE,
      height: BTN_SIZE,
      cornerRadius: BTN_RADIUS,
      fill: this.#theme.transparentFillColor,
      cursor: 'pointer'
    })

    const icon = this.#createIcon(style.icon)
    icon.cursor = 'pointer'

    btn.addMany(bg, icon)

    // 交互效果
    btn.on(PointerEvent.ENTER, (e) => {
      this.#setCanvasCursor('pointer', e.current)
      bg.fill = this.#theme.hoverFillColor
    })
    btn.on(PointerEvent.LEAVE, (e) => {
      bg.fill = this.#theme.transparentFillColor
      this.#updateCanvasCursor(e.current)
    })
    btn.on(PointerEvent.TAP, (e) => {
      e.stop()
      onClick?.()
    })

    return btn
  }

  /**
   * 创建禁用态的按钮（锁定元素时复制/删除按钮不可点击）。
   * @param {string} key
   * @param {number} offsetX
   * @returns {Group}
   */
  #createDisabledButton(key, offsetX) {
    const style = this.#btnStyle[key] || this.#btnStyle.copy
    const btn = new Group({ x: offsetX, y: 3 })

    const bg = new Rect({
      width: BTN_SIZE,
      height: BTN_SIZE,
      cornerRadius: BTN_RADIUS,
      fill: this.#theme.disabledFillColor
    })

    const icon = this.#createIcon(style.disabledIcon)

    btn.addMany(bg, icon)
    // 不绑定任何点击事件 — 完全禁用

    return btn
  }

  /**
   * @param {string} url
   * @returns {LeaferImage}
   */
  #createIcon(url) {
    const offset = (BTN_SIZE - ICON_SIZE) / 2
    return new LeaferImage({
      url,
      x: offset,
      y: offset,
      width: ICON_SIZE,
      height: ICON_SIZE
    })
  }

  #removeButtons() {
    this.#unbindMiddleHandleHover()
    this.#unbindImmediateCursorHover()
    this.#unbindTextWidthResizeMode()
    this.#unbindRotateButton()
    this.#removeRotationTip()
    this.#removeLayerMenu()
    if (this.#btnGroup) {
      this.#btnGroup.remove()
      this.#btnGroup.destroy()
      this.#btnGroup = null
    }
  }

  #removeLayerMenu() {
    if (this.#layerMenu) {
      this.#layerMenu.remove()
      this.#layerMenu.destroy()
      this.#layerMenu = null
    }
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

  #syncMiddleHandleHover(editBox, selected = []) {
    this.#unbindMiddleHandleHover()
    this.#syncTextHeightHandles(editBox, selected)
    this.#middleHandles = (editBox?.resizePoints ?? []).filter((_, index) => index % 2 === 1)

    this.#middleHandles.forEach((point, handleIndex) => {
      point.cursor = this.#getResizeHandleCursor(handleIndex * 2 + 1)
      point.on_(PointerEvent.ENTER, this.#onMiddleHandleEnter, this)
      point.on_(PointerEvent.LEAVE, this.#onMiddleHandleLeave, this)
    })
  }

  /**
   * 预先写入控制点 cursor，避免等到点击/拖拽时才出现对应鼠标样式。
   *
   * @param {import('@leafer-in/interface').IEditBox} editBox 编辑框实例。
   * @param {import('leafer-ui').UI[]} selected 当前选中元素。
   * @returns {void}
   */
  #syncResizeHandleCursors(editBox, selected = []) {
    const isTextSelected = Array.isArray(selected) && selected.some(isTextElement)

    editBox?.resizePoints?.forEach((point, index) => {
      if (isTextSelected && TEXT_HEIGHT_RESIZE_POINT_INDEXES.has(index)) {
        point.visible = false
        point.cursor = undefined
        point.hittable = false
        point.editConfig = undefined
        return
      }

      point.visible = true
      point.hittable = true
      point.cursor = this.#getResizeHandleCursor(index)
      point.editConfig =
        isTextSelected && TEXT_WIDTH_RESIZE_POINT_INDEXES.has(index)
          ? TEXT_WIDTH_EDIT_CONFIG
          : undefined
      if (isTextSelected && TEXT_WIDTH_RESIZE_POINT_INDEXES.has(index)) {
        this.#bindTextWidthResizeMode(point)
      }
      this.#bindImmediateCursorHover(point)
    })

    editBox?.resizeLines?.forEach((line, index) => {
      if (isTextSelected && TEXT_HEIGHT_RESIZE_LINE_INDEXES.has(index)) {
        line.visible = false
        line.cursor = undefined
        line.hittable = false
        line.editConfig = undefined
        return
      }

      line.visible = true
      line.hittable = true
      line.cursor = RESIZE_LINE_CURSORS[index] ?? 'pointer'
      line.editConfig =
        isTextSelected && TEXT_WIDTH_RESIZE_LINE_INDEXES.has(index)
          ? TEXT_WIDTH_EDIT_CONFIG
          : undefined
      if (isTextSelected && TEXT_WIDTH_RESIZE_LINE_INDEXES.has(index)) {
        this.#bindTextWidthResizeMode(line)
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

  /**
   * 绑定文本左右宽度控制点的临时编辑模式。
   *
   * @param {import('leafer-ui').UI} target 控制点或控制边线。
   * @returns {void}
   */
  #bindTextWidthResizeMode(target) {
    if (!target || this.#textWidthResizeTargets.includes(target)) {
      return
    }

    this.#textWidthResizeTargets.push(target)
    target.on_(PointerEvent.DOWN, this.#onTextWidthResizeStart, this)
    target.on_(PointerEvent.UP, this.#onTextWidthResizeEnd, this)
    target.on_(DragEvent.END, this.#onTextWidthResizeEnd, this)
  }

  /**
   * 解绑文本左右宽度控制点的临时编辑模式。
   *
   * @returns {void}
   */
  #unbindTextWidthResizeMode() {
    this.#textWidthResizeTargets.forEach((target) => {
      target.off_(PointerEvent.DOWN, this.#onTextWidthResizeStart, this)
      target.off_(PointerEvent.UP, this.#onTextWidthResizeEnd, this)
      target.off_(DragEvent.END, this.#onTextWidthResizeEnd, this)
    })
    this.#textWidthResizeTargets = []
    this.#restoreTextFontSizeEditMode()
  }

  #unbindMiddleHandleHover() {
    this.#middleHandles.forEach((point) => {
      point.off_(PointerEvent.ENTER, this.#onMiddleHandleEnter, this)
      point.off_(PointerEvent.LEAVE, this.#onMiddleHandleLeave, this)
    })
    this.#middleHandles = []
  }

  /**
   * 文本高度由内容和行高决定，选择框隐藏上下高度把手和边线。
   *
   * @param {import('@leafer-in/interface').IEditBox} editBox 编辑框实例。
   * @param {import('leafer-ui').UI[]} selected 当前选中元素。
   * @returns {void}
   */
  #syncTextHeightHandles(editBox, selected) {
    if (!Array.isArray(selected) || !selected.some(isTextElement)) {
      return
    }

    this.#hideTextHeightHandles(editBox, selected)
    requestAnimationFrame(() => {
      if (!this.#disposed) {
        this.#hideTextHeightHandles(this.#innerEditor?.editBox, selected)
      }
    })
  }

  /**
   * 隐藏文本选择框中上下两个会改变高度的缩放控制点。
   *
   * @param {import('@leafer-in/interface').IEditBox} editBox 编辑框实例。
   * @param {import('leafer-ui').UI[]} [selected] 当前选中元素。
   * @returns {void}
   */
  #hideTextHeightHandles(editBox, selected = this.#innerEditor?.list ?? []) {
    const isTextSelected = Array.isArray(selected) && selected.some(isTextElement)

    if (!isTextSelected) {
      return
    }

    editBox?.resizePoints?.forEach((point, index) => {
      if (!TEXT_HEIGHT_RESIZE_POINT_INDEXES.has(index)) {
        return
      }

      if (!point) return

      point.visible = false
      point.cursor = undefined
      point.hittable = false
    })

    editBox?.resizeLines?.forEach((line, index) => {
      if (!TEXT_HEIGHT_RESIZE_LINE_INDEXES.has(index)) {
        return
      }

      if (!line) return

      line.visible = false
      line.cursor = undefined
      line.hittable = false
    })
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
        url: this.#btnStyle.rotate.icon,
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
    const selected = this.#innerEditor?.list ?? []
    const rotation = selected.length === 1 ? selected[0]?.rotation : this.#computeSharedAttributes(selected).rotation
    this.#showRotationTip(this.#formatRotation(rotation ?? 0))
  }

  #onRotateButtonEnd() {
    this.#hideRotationTip()
  }

  #onRotate(e) {
    this.#showRotationTip(this.#formatRotation(e?.target?.rotation ?? e?.rotation ?? 0))
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
        if (!this.#disposed) this.#buildButtons(list)
      })
    }
  }

  #onMoveCursorDown() {
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

  /**
   * 左右宽度控制点拖拽开始时，临时切到 size 模式。
   *
   * @returns {void}
   */
  #onTextWidthResizeStart() {
    const selected = this.#innerEditor?.list ?? []

    for (const item of selected) {
      if (!isTextElement(item) || this.#textWidthResizeConfigs.has(item)) {
        continue
      }

      this.#textWidthResizeConfigs.set(item, item.editConfig ? { ...item.editConfig } : null)
      item.editConfig = {
        ...(item.editConfig ?? {}),
        editSize: 'size',
        lockRatio: false
      }
    }
  }

  /**
   * 左右宽度控制点拖拽结束时，恢复文本原本的编辑模式。
   *
   * @returns {void}
   */
  #onTextWidthResizeEnd() {
    this.#restoreTextFontSizeEditMode()
  }

  /**
   * 恢复文本进入宽度拖拽前的 editConfig。
   *
   * @returns {void}
   */
  #restoreTextFontSizeEditMode() {
    this.#textWidthResizeConfigs.forEach((editConfig, text) => {
      if (!isTextElement(text) || text.destroyed) {
        return
      }

      text.editConfig = editConfig ?? { editSize: 'font-size' }
    })
    this.#textWidthResizeConfigs.clear()
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

    // 等 Leafer 完成 editBox 的锁定态更新后，再补回按钮。
    requestAnimationFrame(() => {
      if (!this.#disposed) {
        this.#buildButtons(selected)
      }
      this.#isTogglingLock = false
    })
  }

  /**
   * @param {import('leafer-ui').UI[]} selected
   */
  #copySelected(selected) {
    const toAdd = []
    for (const item of selected) {
      const clone = item.clone()
      clone.set({
        x: item.x + 20,
        y: item.y + 20,
        editable: true,
        draggable: true,
        locked: false
      })
      toAdd.push(clone)
    }

    // 挂到原元素所在父容器
    const parent = selected[0]?.parent
    if (parent?.addMany) {
      parent.addMany(...toAdd)
    }

    this.#innerEditor.updateEditBox?.()
  }

  /**
   * @param {import('leafer-ui').UI[]} selected
   */
  #deleteSelected(selected) {
    this.#innerEditor.cancel() // 先取消选中
    for (const item of selected) {
      item.remove()
    }
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

    this.#removeLayerMenu()
    this.#innerEditor.updateEditBox?.()
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

    this.#removeButtons()
    this.#unbindMoveCursorEvents()
    this.#unbindMiddleHandleHover()
    this.#unbindHoverFallback()
    this.#unbindTextHandleEvents()
    this.#restoreEditBoxUpdateBounds()

    if (this.#innerEditor) {
      this.#innerEditor.off_(EditorEvent.SELECT, this.#onSelect, this)
      this.#innerEditor.off_(EditorEvent.BEFORE_SELECT, this.#onBeforeSelect, this)
      this.#innerEditor.off_(EditorMoveEvent.BEFORE_MOVE, this.#syncTextHeightHandlesAfterTransform, this)
      this.#innerEditor.off_(EditorMoveEvent.MOVE, this.#syncTextHeightHandlesAfterTransform, this)
      this.#innerEditor.off_(EditorScaleEvent.BEFORE_SCALE, this.#syncTextHeightHandlesAfterTransform, this)
      this.#innerEditor.off_(EditorScaleEvent.SCALE, this.#syncTextHeightHandlesAfterTransform, this)
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
   * 解绑文本高度把手同步事件。
   *
   * @returns {void}
   */
  #unbindTextHandleEvents() {
    if (this.#textHandleEventIds?.length) {
      this.#innerEditor?.app?.off_(this.#textHandleEventIds)
      this.#textHandleEventIds = []
    }
  }
}
