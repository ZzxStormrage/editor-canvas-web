import { TextEditor as LeaferTextEditor } from '@leafer-in/text-editor'

import { prepareTextEditorInput, stopEventPropagation } from '../../../utils/dom.js'

const INPUT_EVENTS = ['pointerdown', 'mousedown', 'click', 'dblclick', 'touchstart']

/**
 * 安装 Leafer TextEditor 兼容适配。
 *
 * 修复官方 TextEditor 在 focus 晚到、编辑层点击冒泡等生命周期边界下的问题。
 *
 * @returns {void}
 */
export function installTextEditorAdapter() {
  if (LeaferTextEditor.prototype.__editorLifecyclePatched) {
    return
  }

  const onLoad = LeaferTextEditor.prototype.onLoad
  const onFocus = LeaferTextEditor.prototype.onFocus
  const onUpdate = LeaferTextEditor.prototype.onUpdate
  const onUnload = LeaferTextEditor.prototype.onUnload

  LeaferTextEditor.prototype.onLoad = function safeOnLoad(...args) {
    const result = onLoad.apply(this, args)

    prepareTextEditorInput(this.editDom)
    this.__editorInputEvents = INPUT_EVENTS
    this.__editorInputEvents.forEach((type) => {
      this.editDom?.addEventListener(type, stopEventPropagation)
    })

    return result
  }

  LeaferTextEditor.prototype.onFocus = function safeOnFocus(...args) {
    if (!this.editDom) {
      return
    }

    return onFocus.apply(this, args)
  }

  LeaferTextEditor.prototype.onUpdate = function safeOnUpdate(...args) {
    const result = onUpdate.apply(this, args)

    prepareTextEditorInput(this.editDom)

    return result
  }

  LeaferTextEditor.prototype.onUnload = function safeOnUnload(...args) {
    this.__editorInputEvents?.forEach((type) => {
      this.editDom?.removeEventListener(type, stopEventPropagation)
    })
    this.__editorInputEvents = undefined

    return onUnload.apply(this, args)
  }

  LeaferTextEditor.prototype.__editorLifecyclePatched = true
}
