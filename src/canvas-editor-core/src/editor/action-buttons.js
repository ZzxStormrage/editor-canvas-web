import { Group, Image as LeaferImage, Rect, Text, PointerEvent } from 'leafer-ui'
import { EditorEvent } from '@leafer-in/editor'

import copyIconSvg from '../assets/icons/copy.svg?raw'
import deleteIconSvg from '../assets/icons/delete-themes.svg?raw'
import layerIconSvg from '../assets/icons/layers.svg?raw'
import lockIconSvg from '../assets/icons/lock.svg?raw'
import unlockIconSvg from '../assets/icons/unlock.svg?raw'

import bringFrontIconSvg from '../assets/icons/bring-front.svg?raw'
import forwardIconSvg from '../assets/icons/forward.svg?raw'
import backwardIconSvg from '../assets/icons/backward.svg?raw'
import sendBackIconSvg from '../assets/icons/send-back.svg?raw'

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

const ICON_COLOR = '#111827'
const DISABLED_ICON_COLOR = '#a8b0bd'

/** @type {Record<string, { icon: string, disabledIcon: string }>} */
const BTN_STYLE = {
  lock: { icon: createIconUrl(lockIconSvg), disabledIcon: createIconUrl(lockIconSvg, DISABLED_ICON_COLOR) },
  unlock: { icon: createIconUrl(unlockIconSvg), disabledIcon: createIconUrl(unlockIconSvg, DISABLED_ICON_COLOR) },
  layer: { icon: createIconUrl(layerIconSvg), disabledIcon: createIconUrl(layerIconSvg, DISABLED_ICON_COLOR) },
  copy: { icon: createIconUrl(copyIconSvg), disabledIcon: createIconUrl(copyIconSvg, DISABLED_ICON_COLOR) },
  delete: { icon: createIconUrl(deleteIconSvg), disabledIcon: createIconUrl(deleteIconSvg, DISABLED_ICON_COLOR) }
}

const LAYER_ACTIONS = [
  {
    key: 'front',
    label: '移到最前',
    shortcut: '⌥⌘]',
    icon: createIconUrl(bringFrontIconSvg),
    disabledIcon: createIconUrl(bringFrontIconSvg, DISABLED_ICON_COLOR)
  },
  {
    key: 'forward',
    label: '前移',
    shortcut: '⌘]',
    icon: createIconUrl(forwardIconSvg),
    disabledIcon: createIconUrl(forwardIconSvg, DISABLED_ICON_COLOR)
  },
  {
    key: 'backward',
    label: '后移',
    shortcut: '⌘[',
    icon: createIconUrl(backwardIconSvg),
    disabledIcon: createIconUrl(backwardIconSvg, DISABLED_ICON_COLOR)
  },
  {
    key: 'back',
    label: '移到最后',
    shortcut: '⌥⌘[',
    icon: createIconUrl(sendBackIconSvg),
    disabledIcon: createIconUrl(sendBackIconSvg, DISABLED_ICON_COLOR)
  }
]

/** 禁用态样式 */
const DISABLED_STYLE = { bg: '#f7f8fa' }

const BAR_HEIGHT = 36
const BAR_PADDING_X = 8
const BTN_SIZE = 30
const ICON_SIZE = 20
const BTN_RADIUS = 8
const MENU_WIDTH = 132
const MENU_ITEM_HEIGHT = 34
const MENU_GAP = 8
const MIDDLE_HANDLE_STYLE = {
  stroke: '#e5e7eb',
  shadow: { x: 0, y: 2, blur: 8, spread: 0, color: 'rgba(15, 23, 42, 0.2)' }
}
const MIDDLE_HANDLE_HOVER_STYLE = {
  stroke: '#4A90D9',
  shadow: { x: 0, y: 3, blur: 10, spread: 0, color: 'rgba(37, 99, 235, 0.24)' }
}

function createIconUrl(svg, color = ICON_COLOR) {
  const crispSvg = svg
    .replace(/<svg\s+width="24"\s+height="24"/, '<svg width="96" height="96"')
    .replace(/#4A5565/gi, color)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(crispSvg)}`
}

export class EditorActionButtons {
  /** @type {import('@leafer-in/editor').Editor} */
  #innerEditor

  /** @type {import('leafer-ui').Group | null} */
  #btnGroup

  /** @type {import('leafer-ui').Group | null} */
  #layerMenu

  /** @type {import('leafer-ui').Rect | null} */
  #cursorRect

  /** @type {import('leafer-ui').UI[]} */
  #middleHandles

  /** @type {boolean} */
  #disposed = false

  /** 锁定切换期间跳过事件干扰 */
  #isTogglingLock = false

  /** 锁定切换后 editBox 尚未就绪时的重试计数器 */
  #lockRetryCount = 0

  /**
   * @param {import('@leafer-in/editor').Editor} innerEditor
   */
  constructor(innerEditor) {
    this.#innerEditor = innerEditor
    this.#btnGroup = null
    this.#layerMenu = null
    this.#cursorRect = null
    this.#middleHandles = []

    this.#innerEditor.on_(EditorEvent.SELECT, this.#onSelect, this)
    this.#innerEditor.on_(EditorEvent.BEFORE_SELECT, this.#onBeforeSelect, this)
  }

  // ────────── 事件处理 ──────────

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
      // 忽略比较错误，回退到默认行为
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

    // 计算选中元素的共享属性快照，并共享到 innerEditor，供其它模块使用
    const shared = this.#computeSharedAttributes(selected)
    try {
      // 将共享属性附加到 innerEditor（非侵入式属性），方便外部读取
      this.#innerEditor.selectionAttributes = shared
    } catch (err) {
      // 忽略附加错误
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
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      shadow: { x: 0, y: 4, blur: 12, spread: 0, color: 'rgba(15, 23, 42, 0.14)' }
    })
    let offsetX = -totalWidth / 2 // 居中（父容器 around: 'center'）

    btnGroup.add(barBg)

    for (const [key, onClick, disabled] of btnDefs) {
      const style = BTN_STYLE[key] || BTN_STYLE.lock
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
    this.#syncMiddleHandleHover(editBox)

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
      height: LAYER_ACTIONS.length * MENU_ITEM_HEIGHT,
      cornerRadius: 8,
      fill: '#ffffff',
      stroke: '#e5e7eb',
      strokeWidth: 1,
      shadow: { x: 0, y: 6, blur: 16, spread: 0, color: 'rgba(15, 23, 42, 0.14)' }
    })

    menu.add(menuBg)

    LAYER_ACTIONS.forEach((action, index) => {
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
      fill: 'rgba(255, 255, 255, 0)'
    })
    const icon = this.#createMenuIcon(action.icon)
    const label = this.#createMenuText(action.label, 34, ICON_COLOR)
    const shortcut = this.#createShortcutText(action.shortcut, ICON_COLOR)

    item.addMany(bg, icon, label, shortcut)
    item.on(PointerEvent.ENTER, () => {
      bg.fill = '#f3f4f6'
    })
    item.on(PointerEvent.LEAVE, () => {
      bg.fill = 'rgba(255, 255, 255, 0)'
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
    const label = this.#createMenuText(action.label, 34, DISABLED_ICON_COLOR)
    const shortcut = this.#createShortcutText(action.shortcut, DISABLED_ICON_COLOR)

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
      fill: 'rgba(255, 255, 255, 0)'
    })

    const icon = this.#createIcon(style.icon)

    btn.addMany(bg, icon)

    // 交互效果
    btn.on(PointerEvent.ENTER, () => {
      bg.fill = '#f3f4f6'
    })
    btn.on(PointerEvent.LEAVE, () => {
      bg.fill = 'rgba(255, 255, 255, 0)'
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
    const style = BTN_STYLE[key] || BTN_STYLE.copy
    const btn = new Group({ x: offsetX, y: 3 })

    const bg = new Rect({
      width: BTN_SIZE,
      height: BTN_SIZE,
      cornerRadius: BTN_RADIUS,
      fill: DISABLED_STYLE.bg
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
    this.#cursorRect.off_(PointerEvent.LEAVE, this.#onMoveCursorEnd, this)
    this.#cursorRect.off_(PointerEvent.TAP, this.#onEditBoxTap, this)
    this.#cursorRect = null
  }

  #syncMiddleHandleHover(editBox) {
    this.#unbindMiddleHandleHover()
    this.#middleHandles = (editBox?.resizePoints ?? []).filter((_, index) => index % 2 === 1)

    this.#middleHandles.forEach((point) => {
      point.on_(PointerEvent.ENTER, this.#onMiddleHandleEnter, this)
      point.on_(PointerEvent.LEAVE, this.#onMiddleHandleLeave, this)
    })
  }

  #unbindMiddleHandleHover() {
    this.#middleHandles.forEach((point) => {
      point.off_(PointerEvent.ENTER, this.#onMiddleHandleEnter, this)
      point.off_(PointerEvent.LEAVE, this.#onMiddleHandleLeave, this)
    })
    this.#middleHandles = []
  }

  #onEditBoxTap(e) {
    try {
      e.stop()
    } catch (err) {}

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
    }
  }

  #onMoveCursorEnd() {
    if (this.#cursorRect) {
      this.#cursorRect.cursor = this.#getMoveCursor(this.#innerEditor?.editBox)
    }
  }

  #onMiddleHandleEnter(e) {
    e.current?.set?.(MIDDLE_HANDLE_HOVER_STYLE)
  }

  #onMiddleHandleLeave(e) {
    e.current?.set?.(MIDDLE_HANDLE_STYLE)
  }

  #getMoveCursor(editBox) {
    return editBox?.mergedConfig?.moveCursor ?? editBox?.mergeConfig?.moveCursor ?? 'move'
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

    if (this.#innerEditor) {
      this.#innerEditor.off_(EditorEvent.SELECT, this.#onSelect, this)
      this.#innerEditor.off_(EditorEvent.BEFORE_SELECT, this.#onBeforeSelect, this)
      this.#innerEditor = null
    }
  }
}
