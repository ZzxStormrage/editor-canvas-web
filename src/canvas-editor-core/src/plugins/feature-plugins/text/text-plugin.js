import { Text as LeaferText } from 'leafer-ui'
import { EditorEvent } from '@leafer-in/editor'

import { EditorError } from '../../../errors/editor-error.js'
import { normalizeTextOptions, isTextElement } from '../../../utils/text.js'

/**
 * 文本插件 —— 基于 leafer-ui 原生 Text 节点提供文本添加与样式更新能力。
 *
 * @author zzx
 * @since 2026-07-01
 */
export class TextPlugin {
  constructor() {
    /** @private @type {Object | null} */
    this._context = null
    /** @private @type {LeaferText | null} */
    this._activeText = null
  }

  /**
   * 插件唯一标识。
   *
   * @returns {string} 插件 ID。
   */
  get id() {
    return 'text'
  }

  /**
   * 插件显示名称。
   *
   * @returns {string} 插件名称。
   */
  get name() {
    return 'Text'
  }

  /**
   * 插件依赖。
   *
   * @returns {string[]} 依赖插件 ID 列表。
   */
  get dependencies() {
    return []
  }

  /**
   * 初始化插件。
   *
   * @param {Object} context 编辑器上下文。
   * @returns {void}
   */
  bootstrap(context) {
    this._context = context
    context.innerEditor?.on_(EditorEvent.SELECT, this._handleSelect, this)
  }

  /**
   * 添加文本到内容图层。
   *
   * @param {string | number | Object} content 文本内容或完整文本配置。
   * @param {Object} [options={}] 文本样式与放置配置。
   * @returns {Promise<LeaferText>} 文本节点。
   * @throws {EditorError} 当创建文本失败时抛出。
   */
  async add(content = '', options = {}) {
    this._assertReady()

    try {
      const { contentLayer, eventBus, state } = this._context
      const textOptions = this._normalizeAddOptions(content, options, state)
      const text = new LeaferText({
        draggable: true,
        editable: true,
        ...textOptions
      })

      contentLayer.add(text)
      await new Promise((resolve) => requestAnimationFrame(resolve))
      this._activeText = text
      this._context.innerEditor?.select(text)
      eventBus.emit('text:added', { text })

      return text
    } catch (error) {
      if (error instanceof EditorError) {
        throw error
      }

      throw new EditorError(error.message || 'Add text failed.', 'TEXT_ADD_FAILED')
    }
  }

  /**
   * 更新文本节点内容与字体样式。
   *
   * target 为空时默认更新当前选中的文本节点。
   *
   * @param {LeaferText | Object} [target] 文本节点或更新配置。
   * @param {Object} [options] 更新配置。
   * @returns {LeaferText} 更新后的文本节点。
   * @throws {EditorError} 当没有可更新文本节点或配置非法时抛出。
   */
  update(target, options) {
    this._assertReady()

    const text = this._resolveUpdateTarget(target, options)
    const updateOptions = options === undefined ? target : options
    const normalizedOptions = TextPlugin.normalizeOptions(updateOptions ?? {})

    Object.assign(text, normalizedOptions)
    text.forceUpdate?.()
    this._activeText = text
    this._context.innerEditor?.select(text)
    this._context.eventBus.emit('text:updated', { text, options: normalizedOptions })

    return text
  }

  /**
   * 打开文本编辑器。
   *
   * @param {LeaferText} [target] 指定文本节点，默认使用当前或最近选中文本。
   * @returns {LeaferText | null} 进入编辑的文本节点。
   */
  edit(target) {
    this._assertReady()

    const text = target ?? this.getSelected()

    if (!text) {
      return null
    }

    this._activeText = text
    this._context.innerEditor?.openInnerEditor(text, 'TextEditor', true)

    return text
  }

  /**
   * 获取当前选中的文本节点。
   *
   * @returns {LeaferText | null} 当前文本节点。
   */
  getSelected() {
    this._assertReady()

    const selected = this._getSelectedElements()

    const text = selected.find(isTextElement) ?? null

    if (text) {
      this._activeText = text
      return text
    }

    return this._isUsableText(this._activeText) ? this._activeText : null
  }

  /**
   * 销毁插件。
   *
   * @returns {void}
   */
  destroy() {
    this._context?.innerEditor?.off_(EditorEvent.SELECT, this._handleSelect, this)
    this._context = null
    this._activeText = null
  }

  /**
   * 归一化文本插件配置。
   *
   * @param {Object} [text] 外部传入配置。
   * @param {Object} [baseText] 基础配置。
   * @returns {Object} 归一化后的配置。
   */
  static normalizeOptions(text = {}, baseText = {}) {
    return normalizeTextOptions(text, baseText)
  }

  _normalizeAddOptions(content, options, state) {
    const inputOptions = this._isOptionsObject(content)
      ? { ...content, ...(options ?? {}) }
      : { ...(options ?? {}), text: content }
    const normalizedOptions = TextPlugin.normalizeOptions({
      ...state.textOptions,
      ...inputOptions
    })
    const width = normalizedOptions.width ?? Math.min(state.width * 0.7, 420)

    return {
      text: normalizedOptions.text ?? '',
      x: inputOptions.x ?? (state.width - width) / 2,
      y: inputOptions.y ?? state.height / 2 - (normalizedOptions.fontSize ?? 32) / 2,
      ...normalizedOptions,
      width
    }
  }

  _resolveUpdateTarget(target, options) {
    if (options !== undefined) {
      if (!isTextElement(target)) {
        throw new EditorError('text.update(target, options) requires a Text node.', 'TEXT_TARGET_INVALID')
      }

      return target
    }

    const selected = this.getSelected()

    if (!selected) {
      throw new EditorError('No selected text element to update.', 'TEXT_SELECTION_REQUIRED')
    }

    return selected
  }

  _getSelectedElements() {
    const list = this._context.innerEditor?.list

    if (Array.isArray(list)) {
      return list
    }

    const single = this._context.innerEditor?.target

    return single ? [single] : []
  }

  _handleSelect(event) {
    const selected = event?.list ?? this._getSelectedElements()
    const text = selected.find(isTextElement)

    if (text) {
      this._activeText = text
    }
  }

  _isUsableText(text) {
    return isTextElement(text) && !text.destroyed && text.parent
  }

  _isOptionsObject(value) {
    return value !== null && typeof value === 'object' && !(value instanceof Number)
  }

  _assertReady() {
    if (!this._context) {
      throw new EditorError('Text plugin has not been initialized.', 'TEXT_PLUGIN_NOT_READY')
    }
  }
}
