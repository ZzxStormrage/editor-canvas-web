import { Group, Image as LeaferImage, Rect, PointerEvent } from 'leafer-ui'
import { EditorEvent } from '@leafer-in/editor'

import copyIcon from '../assets/icons/copy.svg'
import deleteIcon from '../assets/icons/delete-themes.svg'
import lockIcon from '../assets/icons/lock.svg'
import unlockIcon from '../assets/icons/unlock.svg'

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

/** @type {Record<string, { icon: string, bg: string }>} */
const BTN_STYLE = {
  lock: { icon: lockIcon, bg: '#ffffff' },
  unlock: { icon: unlockIcon, bg: '#eff6ff' },
  copy: { icon: copyIcon, bg: '#ffffff' },
  delete: { icon: deleteIcon, bg: '#fef2f2' }
}

/** 禁用态样式 */
const DISABLED_STYLE = { bg: '#f5f6f8', stroke: '#e1e5eb', opacity: 0.6 }

const BTN_SIZE = 28
const ICON_SIZE = 24
const BTN_GAP = 6
const BTN_RADIUS = 6

export class EditorActionButtons {
  /** @type {import('@leafer-in/editor').Editor} */
  #innerEditor

  /** @type {import('leafer-ui').Group | null} */
  #btnGroup

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

    this.#innerEditor.on_(EditorEvent.SELECT, this.#onSelect, this)
    this.#innerEditor.on_(EditorEvent.BEFORE_SELECT, this.#onBeforeSelect, this)
  }

  // ────────── 事件处理 ──────────

  #onBeforeSelect() {
    if (this.#isTogglingLock) return
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

    // 移除旧的
    this.#removeButtons()

    // 判断是否全部锁定
    const allLocked = selected.every((item) => item.locked)

    // 按钮定义：[key, callback, disabled?]
    const btnDefs = [
      [allLocked ? 'unlock' : 'lock', () => this.#toggleLock(selected, allLocked), false],
      ['copy', () => this.#copySelected(selected), allLocked],
      ['delete', () => this.#deleteSelected(selected), allLocked]
    ]

    const btnGroup = new Group({ x: 0, y: 0 })
    const totalWidth = btnDefs.length * BTN_SIZE + (btnDefs.length - 1) * BTN_GAP
    let offsetX = -totalWidth / 2 // 居中（父容器 around: 'center'）

    for (const [key, onClick, disabled] of btnDefs) {
      const style = BTN_STYLE[key] || BTN_STYLE.lock
      const btn = disabled ? this.#createDisabledButton(key, offsetX) : this.#createButton(style, offsetX, onClick)
      btnGroup.add(btn)
      offsetX += BTN_SIZE + BTN_GAP
    }

    this.#btnGroup = btnGroup
    editBox.buttons.add(btnGroup)

    if (allLocked) {
      this.#showLockedEditBox(editBox)
    }
  }

  /**
   * @param {import('@leafer-in/interface').IEditBox} editBox
   */
  #showLockedEditBox(editBox) {
    editBox.visible = true
    editBox.rect.visible = true
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
   * @param {{ icon: string, bg: string }} style
   * @param {number} offsetX
   * @param {() => void} onClick
   * @returns {Group}
   */
  #createButton(style, offsetX, onClick) {
    const btn = new Group({ x: offsetX, y: 0, cursor: 'pointer' })

    // 背景
    const bg = new Rect({
      width: BTN_SIZE,
      height: BTN_SIZE,
      cornerRadius: BTN_RADIUS,
      fill: style.bg,
      stroke: '#d1d5db',
      strokeWidth: 1
    })

    const icon = this.#createIcon(style.icon)

    btn.addMany(bg, icon)

    // 交互效果
    btn.on(PointerEvent.ENTER, () => {
      bg.fill = '#f3f4f6'
    })
    btn.on(PointerEvent.LEAVE, () => {
      bg.fill = style.bg
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
    const btn = new Group({ x: offsetX, y: 0 })

    const bg = new Rect({
      width: BTN_SIZE,
      height: BTN_SIZE,
      cornerRadius: BTN_RADIUS,
      fill: DISABLED_STYLE.bg,
      stroke: DISABLED_STYLE.stroke,
      strokeWidth: 1
    })

    const icon = this.#createIcon(style.icon, DISABLED_STYLE.opacity)

    btn.addMany(bg, icon)
    // 不绑定任何点击事件 — 完全禁用

    return btn
  }

  /**
   * @param {string} url
   * @param {number} [opacity]
   * @returns {LeaferImage}
   */
  #createIcon(url, opacity = 1) {
    const offset = (BTN_SIZE - ICON_SIZE) / 2
    return new LeaferImage({
      url,
      x: offset,
      y: offset,
      width: ICON_SIZE,
      height: ICON_SIZE,
      opacity
    })
  }

  #removeButtons() {
    if (this.#btnGroup) {
      this.#btnGroup.remove()
      this.#btnGroup.destroy()
      this.#btnGroup = null
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

  // ────────── 生命周期 ──────────

  destroy() {
    if (this.#disposed) return
    this.#disposed = true

    this.#removeButtons()

    if (this.#innerEditor) {
      this.#innerEditor.off_(EditorEvent.SELECT, this.#onSelect, this)
      this.#innerEditor.off_(EditorEvent.BEFORE_SELECT, this.#onBeforeSelect, this)
      this.#innerEditor = null
    }
  }
}
