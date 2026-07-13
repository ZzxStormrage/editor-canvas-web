import { Text as LeaferText } from 'leafer-ui'
import { EditorEvent, EditorScaleEvent, InnerEditorEvent } from '@leafer-in/editor'

import { EditorError } from '../../../errors/editor-error.js'
import { getElementDataContainer } from '../../../utils/element-data.js'
import { normalizeTextOptions, isTextElement } from '../../../utils/text.js'
import { applyTextEditorStyleLater } from '../../../utils/dom.js'
import { installTextEditorAdapter } from './text-editor-adapter.js'

const RAW_TEXT_KEY = '__canvasEditorRawText'
const MIN_TEXT_PIXEL = 1
const VISUAL_ITALIC_KEY = '__canvasEditorVisualItalic'
const VISUAL_ITALIC_SKEW_X = -12
const DIMENSION_TEXT_KEYS = new Set([
  'text',
  'fontFamily',
  'fontSize',
  'fontWeight',
  'italic',
  'letterSpacing',
  'writingMode'
])

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
    installTextEditorAdapter()
    this._context = context
    context.innerEditor?.on_(EditorEvent.SELECT, this._handleSelect, this)
    context.innerEditor?.on_(EditorScaleEvent.SCALE, this._handleScale, this)
    context.innerEditor?.on_(InnerEditorEvent.CLOSE, this._handleInnerClose, this)
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
      const inputOptions = this._getAddInputOptions(content, options)
      const textOptions = this._normalizeAddOptions(inputOptions, state)
      const { renderOptions, rawText } = this._getRenderableTextOptions(textOptions)
      this._applyTextEditConfig(renderOptions)
      this._applyMeasuredAddWidth(renderOptions, rawText, inputOptions, state)
      const text = new LeaferText({
        draggable: true,
        editable: true,
        ...renderOptions
      })

      getElementDataContainer(text, true)
      this._setRawText(text, rawText)
      this._applyVisualItalic(text, renderOptions)
      text.forceUpdate?.()
      text.updateLayout?.()
      contentLayer.add(text)
      this._activeText = text
      this._context.innerEditor?.select(text)
      eventBus.emit('text:added', { text })
      this._emitSelected(text)

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

    const { renderOptions, rawText } = this._getRenderableTextOptions(normalizedOptions, text)
    this._applyTextEditConfig(renderOptions)
    this._applyMeasuredUpdateWidth(text, renderOptions, rawText, normalizedOptions)

    text.set?.(renderOptions)
    this._setRawText(text, rawText)
    this._applyTextPatchFallback(text, renderOptions)
    this._applyVisualItalic(text, renderOptions)
    text.forceUpdate?.()
    text.updateLayout?.()
    this._activeText = text
    this._context.innerEditor?.select(text)
    this._refreshSelectedEditBox()
    applyTextEditorStyleLater(this.getStyle(text))
    this._context.eventBus.emit('text:updated', { text, options: normalizedOptions })
    this._emitSelected(text)

    return text
  }

  /**
   * 打开文本编辑器。
   *
   * @param {LeaferText} [target] 指定文本节点，默认使用当前选中文本。
   * @returns {LeaferText | null} 进入编辑的文本节点。
   */
  edit(target) {
    this._assertReady()

    const text = target ?? this._getSelectedTextOnly()

    if (!text) {
      return null
    }

    this._activeText = text
    this._restoreRawTextForEditing(text)
    this._context.innerEditor?.openInnerEditor(text, 'TextEditor', true)
    applyTextEditorStyleLater(this.getStyle(text))

    return text
  }

  /**
   * 获取文本节点当前样式快照。
   *
   * @param {LeaferText} [target] 指定文本节点，默认使用当前或最近选中文本。
   * @returns {Object | null} 当前文本样式。
   */
  getStyle(target) {
    this._assertReady()

    const text = target ?? this.getSelected()

    if (!text) {
      return null
    }

    const data = text.__ ?? {}

    const options = TextPlugin.normalizeOptions({
      text: this._getRawText(text),
      fontFamily: this._stripFontFamilyQuotes(text.fontFamily ?? data.fontFamily),
      fontSize: this._normalizePixelValue(text.fontSize ?? data.fontSize),
      fontWeight: text.fontWeight ?? data.fontWeight,
      italic: Boolean(data.italic ?? text.italic),
      fill: typeof text.fill === 'string' ? text.fill : data.fill,
      textAlign: text.textAlign ?? data.textAlign,
      textDecoration: text.textDecoration ?? data.textDecoration,
      letterSpacing: this._normalizePixelValue(
        text.letterSpacing ?? data.letterSpacing ?? data.__letterSpacing,
        0
      ),
      lineHeight: this._normalizePixelValue(text.lineHeight ?? data.lineHeight ?? data.__lineHeight),
      writingMode: text.writingMode ?? data.writingMode,
      width: text.width ?? data.width,
      verticalAlign: text.verticalAlign ?? data.verticalAlign
    })

    return {
      ...options,
      fontFamily: this._stripFontFamilyQuotes(options.fontFamily)
    }
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
      this._ensureTextEditConfig(text)
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
    this._context?.innerEditor?.off_(EditorScaleEvent.SCALE, this._handleScale, this)
    this._context?.innerEditor?.off_(InnerEditorEvent.CLOSE, this._handleInnerClose, this)
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

  _getAddInputOptions(content, options) {
    return this._isOptionsObject(content)
      ? { ...content, ...(options ?? {}) }
      : { ...(options ?? {}), text: content }
  }

  _normalizeAddOptions(inputOptions, state) {
    const bounds = this._getOperationBounds(state)
    const addOptions = {
      ...state.textOptions,
      ...inputOptions
    }

    if (inputOptions.width === undefined) {
      delete addOptions.width
    }

    const normalizedOptions = TextPlugin.normalizeOptions({
      ...addOptions
    })
    const placementOptions = this._normalizePlacementOptions(inputOptions)
    const explicitWidth = normalizedOptions.width

    return {
      text: normalizedOptions.text ?? '',
      x: inputOptions.x ?? this._getDefaultTextX(bounds, explicitWidth),
      y: inputOptions.y ?? bounds.y + bounds.height / 2 - (normalizedOptions.fontSize ?? 32) / 2,
      ...normalizedOptions,
      ...placementOptions
    }
  }

  _getDefaultTextX(bounds, explicitWidth) {
    return explicitWidth === undefined ? bounds.x + bounds.width / 2 : bounds.x + (bounds.width - explicitWidth) / 2
  }

  _normalizePlacementOptions(options) {
    return Object.fromEntries(
      ['rotation', 'opacity', 'draggable', 'editable', 'locked']
        .filter((key) => options[key] !== undefined)
        .map((key) => [key, options[key]])
    )
  }

  /**
   * 新增文本时预先写入真实文本宽度，避免先渲染到画布中心再二次居中造成闪烁。
   *
   * @param {Object} renderOptions 即将传给 LeaferText 的渲染配置。
   * @param {string} rawText 未转换书写方向前的原始文本。
   * @param {Object} inputOptions 用户传入的新增配置。
   * @param {Object} state 编辑器状态。
   * @returns {void}
   */
  _applyMeasuredAddWidth(renderOptions, rawText, inputOptions, state) {
    if (inputOptions.width !== undefined) {
      return
    }

    const width = this._measureTextWidth(rawText, renderOptions)
    if (width <= 0) {
      return
    }

    renderOptions.width = width

    if (inputOptions.x === undefined) {
      const bounds = this._getOperationBounds(state)
      renderOptions.x = bounds.x + (bounds.width - width) / 2
    }
  }

  /**
   * 获取当前操作区域，优先使用白色画板。
   *
   * @param {Object} state 编辑器状态。
   * @returns {{ x: number, y: number, width: number, height: number }} 操作区域。
   * @private
   */
  _getOperationBounds(state) {
    return this._context?.artboard?.getContentBounds?.() ?? {
      x: 0,
      y: 0,
      width: state.width,
      height: state.height
    }
  }

  /**
   * 为 Text 节点设置官方编辑配置，使四角缩放时同步修改 fontSize。
   *
   * @param {Object} renderOptions 文本渲染配置。
   * @returns {void}
   */
  _applyTextEditConfig(renderOptions) {
    renderOptions.editConfig = {
      ...(renderOptions.editConfig ?? {}),
      editSize: 'font-size'
    }
  }

  /**
   * 使用浏览器 canvas 提前测量文本宽度。
   *
   * @param {string} rawText 原始文本内容。
   * @param {Object} options 文本样式配置。
   * @returns {number} 测量后的文本宽度。
   */
  _measureTextWidth(rawText, options) {
    const canvas = this._getMeasureCanvas()
    const context = canvas?.getContext?.('2d')

    if (!context) {
      return 0
    }

    const fontSize = options.fontSize ?? 12
    const fontFamily = options.fontFamily ?? 'caption'
    const fontWeight = options.fontWeight && options.fontWeight !== 'normal' ? `${options.fontWeight} ` : ''
    const italic = options.italic ? 'italic ' : ''
    const letterSpacing = options.letterSpacing ?? 0
    const lines = String(rawText ?? '').replace(/\r\n?/g, '\n').split('\n')
    const writingMode = options.writingMode ?? 'x'

    context.font = `${italic}${fontWeight}${fontSize}px ${fontFamily}`

    if (this._isVerticalWritingMode(writingMode)) {
      return Math.ceil(fontSize + Math.max(0, letterSpacing))
    }

    const widths = lines.map((line) => {
      return context.measureText(line).width + this._getLetterSpacingWidth(line, letterSpacing)
    })

    return Math.ceil(Math.max(...widths))
  }

  /**
   * 获取文本测量用 canvas。
   *
   * @returns {HTMLCanvasElement | OffscreenCanvas | null} 测量 canvas。
   */
  _getMeasureCanvas() {
    if (typeof document !== 'undefined' && document.createElement) {
      return document.createElement('canvas')
    }

    if (typeof OffscreenCanvas !== 'undefined') {
      return new OffscreenCanvas(1, 1)
    }

    return null
  }

  /**
   * 根据字符数量计算字间距额外宽度。
   *
   * @param {string} line 单行文本。
   * @param {number} letterSpacing 字间距。
   * @returns {number} 字间距额外宽度。
   */
  _getLetterSpacingWidth(line, letterSpacing) {
    const charCount = Array.from(String(line ?? '')).length
    return Math.max(0, charCount - 1) * Number(letterSpacing || 0)
  }

  /**
   * 文本尺寸相关样式变化时，同步更新文本节点宽度。
   *
   * 文本创建时会写入测量宽度来避免闪烁，后续字号、字重、字距等变化后，
   * Leafer 不会自动清掉这个固定宽度，所以需要重新测量并写回。
   *
   * @param {LeaferText} text 当前文本节点。
   * @param {Object} renderOptions 即将写入 Text 的渲染配置。
   * @param {string} rawText 原始文本。
   * @param {Object} normalizedOptions 本次更新配置。
   * @returns {void}
   * @private
   */
  _applyMeasuredUpdateWidth(text, renderOptions, rawText, normalizedOptions) {
    if (Object.prototype.hasOwnProperty.call(normalizedOptions, 'width')) {
      return
    }

    if (!this._hasDimensionTextChange(normalizedOptions)) {
      return
    }

    const measureOptions = {
      ...(this.getStyle(text) ?? {}),
      ...renderOptions
    }
    const width = this._measureTextWidth(rawText, measureOptions)

    if (width > 0) {
      renderOptions.width = width
    }
  }

  /**
   * 判断本次更新是否会影响文本外框尺寸。
   *
   * @param {Object} options 本次更新配置。
   * @returns {boolean} 是否影响文本尺寸。
   * @private
   */
  _hasDimensionTextChange(options) {
    return Object.keys(options ?? {}).some((key) => DIMENSION_TEXT_KEYS.has(key))
  }

  _getRenderableTextOptions(options, target) {
    const renderOptions = { ...options }
    const hasText = Object.prototype.hasOwnProperty.call(renderOptions, 'text')
    const hasWritingMode = Object.prototype.hasOwnProperty.call(renderOptions, 'writingMode')
    const writingMode = renderOptions.writingMode ?? target?.writingMode ?? target?.__?.writingMode ?? 'x'
    const rawText = hasText ? String(renderOptions.text ?? '') : this._getRawText(target)

    if (hasText || hasWritingMode || this._isVerticalWritingMode(writingMode)) {
      renderOptions.text = this._isVerticalWritingMode(writingMode) ? this._toVerticalText(rawText) : rawText
    }

    return { renderOptions, rawText }
  }

  /**
   * 当运行时缺少 Leafer set() 方法时，使用属性赋值兜底。
   *
   * Leafer 的 Text 字体属性需要走 set() 才能稳定触发内部字体缓存重算。
   * 这里仅保留极旧运行时的兜底逻辑，正常路径不会进入。
   *
   * @param {LeaferText} text 文本节点。
   * @param {Object} renderOptions 文本渲染配置。
   * @returns {void}
   * @private
   */
  _applyTextPatchFallback(text, renderOptions) {
    if (typeof text?.set === 'function') {
      return
    }

    Object.assign(text, renderOptions)
  }

  /**
   * 应用可见斜体效果。
   *
   * Leafer 官方 Text 使用 italic 写入 canvas font，但部分中文字体或系统字体在 canvas
   * 中不会合成可见斜体。这里保留官方 italic 字段，并额外使用可恢复的 skewX 做视觉兜底。
   *
   * @param {LeaferText} text 文本节点。
   * @param {Object} renderOptions 文本渲染配置。
   * @returns {void}
   * @private
   */
  _applyVisualItalic(text, renderOptions) {
    if (!isTextElement(text) || !Object.prototype.hasOwnProperty.call(renderOptions, 'italic')) {
      return
    }

    if (renderOptions.italic) {
      this._enableVisualItalic(text)
      return
    }

    this._disableVisualItalic(text)
  }

  /**
   * 开启视觉斜体兜底。
   *
   * @param {LeaferText} text 文本节点。
   * @returns {void}
   * @private
   */
  _enableVisualItalic(text) {
    if (text[VISUAL_ITALIC_KEY]) {
      return
    }

    const skewX = this._normalizeSkewValue(text.skewX ?? text.__?.skewX)
    text[VISUAL_ITALIC_KEY] = true
    text.set?.({ skewX: skewX + VISUAL_ITALIC_SKEW_X })
  }

  /**
   * 关闭视觉斜体兜底，只移除本插件追加的倾斜角度。
   *
   * @param {LeaferText} text 文本节点。
   * @returns {void}
   * @private
   */
  _disableVisualItalic(text) {
    if (!text[VISUAL_ITALIC_KEY]) {
      return
    }

    const skewX = this._normalizeSkewValue(text.skewX ?? text.__?.skewX)
    text.set?.({ skewX: skewX - VISUAL_ITALIC_SKEW_X })
    text[VISUAL_ITALIC_KEY] = false
  }

  /**
   * 归一化倾斜角度。
   *
   * @param {number | undefined} value 原始倾斜角度。
   * @returns {number} 可计算的倾斜角度。
   * @private
   */
  _normalizeSkewValue(value) {
    const number = Number(value)

    return Number.isFinite(number) ? number : 0
  }

  _restoreRawTextForEditing(text) {
    const rawText = this._getRawText(text)

    if (text.text !== rawText) {
      text.text = rawText
      text.forceUpdate?.()
    }
  }

  _applyWritingModeText(text) {
    const rawText = this._getRawText(text)
    const writingMode = text?.writingMode ?? text?.__?.writingMode ?? 'x'
    const renderText = this._isVerticalWritingMode(writingMode) ? this._toVerticalText(rawText) : rawText

    if (text.text !== renderText) {
      text.text = renderText
      text.forceUpdate?.()
    }
  }

  _getRawText(text) {
    if (!text) {
      return ''
    }

    if (typeof text[RAW_TEXT_KEY] === 'string') {
      return text[RAW_TEXT_KEY]
    }

    const value = text.text ?? text.__?.text ?? ''
    const writingMode = text.writingMode ?? text.__?.writingMode ?? 'x'

    return this._isVerticalWritingMode(writingMode) ? this._fromVerticalText(value) : String(value ?? '')
  }

  _setRawText(text, value) {
    if (text) {
      text[RAW_TEXT_KEY] = String(value ?? '')
    }
  }

  _isVerticalWritingMode(writingMode) {
    return writingMode === 'y' || writingMode === 'y-reverse'
  }

  _toVerticalText(value) {
    return String(value ?? '')
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => Array.from(line).join('\n'))
      .join('\n')
  }

  _fromVerticalText(value) {
    return String(value ?? '').replace(/[\r\n]/g, '')
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

  /**
   * 只获取当前真实选中的文本节点，不回退到最近选中过的文本。
   *
   * 双击画布空白时可能会调用无目标 edit()，此时不能使用 _activeText，
   * 否则会把上一次选中的文本重新打开编辑。
   *
   * @returns {LeaferText | null} 当前选中的文本节点。
   * @private
   */
  _getSelectedTextOnly() {
    const text = this._getSelectedElements().find(isTextElement) ?? null

    if (text) {
      this._activeText = text
    }

    return text
  }

  _handleSelect(event) {
    const selected = event?.list ?? this._getSelectedElements()
    const text = selected.find(isTextElement)

    if (text) {
      this._ensureTextEditConfig(text)
      this._activeText = text
      this._emitSelected(text)
    }
  }

  /**
   * 四角缩放文本时归整像素值，并实时通知外部 UI 刷新。
   *
   * 左右宽度控制点会在 action-buttons 中单独覆盖为 size 模式，
   * 不会改变 fontSize。
   *
   * @param {import('@leafer-in/interface').IEditorScaleEvent} event 缩放事件。
   * @returns {void}
   * @private
   */
  _handleScale(event) {
    const text = event?.target

    if (!isTextElement(text) || this._context?.innerEditor?.list?.length !== 1) {
      return
    }

    this._normalizeScaledTextPixels(text)
    this._activeText = text
    this._context?.innerEditor?.updateEditBox?.()
    this._emitSelected(text)
  }

  /**
   * 将官方 font-size 模式产生的小数像素归整为整数。
   *
   * @param {LeaferText} text 文本节点。
   * @returns {void}
   * @private
   */
  _normalizeScaledTextPixels(text) {
    const nextStyle = {
      fontSize: this._normalizePixelValue(text.fontSize ?? text.__?.fontSize)
    }
    const lineHeight = this._normalizePixelValue(text.lineHeight ?? text.__?.lineHeight)
    const letterSpacing = this._normalizePixelValue(text.letterSpacing ?? text.__?.letterSpacing, 0)

    if (lineHeight !== undefined) {
      nextStyle.lineHeight = lineHeight
    }

    if (letterSpacing !== undefined) {
      nextStyle.letterSpacing = letterSpacing
    }

    text.set?.(nextStyle)
    text.forceUpdate?.()
    text.updateLayout?.()
  }

  /**
   * 刷新官方选择框边界。
   *
   * 外部面板直接修改 fontSize / lineHeight 时，Text 节点尺寸会变化，
   * 但当前选区目标没有变化，官方 Editor 不一定触发一次新的选区计算。
   * 这里显式调用官方刷新方法，让选择框跟随文本尺寸同步更新。
   *
   * @returns {void}
   * @private
   */
  _refreshSelectedEditBox() {
    const innerEditor = this._context?.innerEditor

    innerEditor?.update?.()
    innerEditor?.updateEditBox?.()
    this._refreshSelectedEditBoxLater()
  }

  /**
   * 在 Leafer 完成文本布局后再次刷新选择框。
   *
   * fontSize / lineHeight 写入后，Text 的 worldBoxBounds 可能要到下一帧才更新。
   * 立即刷新只能拿到旧边界，所以需要等待浏览器帧回调后再刷新一次。
   *
   * @returns {void}
   * @private
   */
  _refreshSelectedEditBoxLater() {
    const schedule = typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame
      : (callback) => setTimeout(callback, 0)

    schedule(() => {
      const innerEditor = this._context?.innerEditor

      innerEditor?.update?.()
      innerEditor?.updateEditBox?.()
    })
  }

  /**
   * 归整像素值为整数。
   *
   * @param {number | undefined} value 原始像素值。
   * @param {number} [min=MIN_TEXT_PIXEL] 最小值。
   * @returns {number | undefined} 整数像素值。
   * @private
   */
  _normalizePixelValue(value, min = MIN_TEXT_PIXEL) {
    if (value === undefined || value === null) {
      return undefined
    }

    const number = Number(value)

    if (!Number.isFinite(number)) {
      return undefined
    }

    return Math.max(min, Math.round(number))
  }

  /**
   * 给已有 Text 节点补齐官方编辑配置。
   *
   * @param {LeaferText} text 文本节点。
   * @returns {void}
   * @private
   */
  _ensureTextEditConfig(text) {
    if (!isTextElement(text)) {
      return
    }

    text.editConfig = {
      ...(text.editConfig ?? {}),
      editSize: 'font-size'
    }
  }

  _handleInnerClose(event) {
    const text = event?.editTarget

    if (!isTextElement(text)) {
      return
    }

    this._setRawText(text, text.text ?? text.__?.text ?? '')

    if (this._isEmptyText(text)) {
      this._removeEmptyText(text)
      return
    }

    this._applyWritingModeText(text)
  }

  _emitSelected(text) {
    this._context?.eventBus.emit('text:selected', {
      text,
      options: this.getStyle(text)
    })
  }

  _stripFontFamilyQuotes(fontFamily) {
    return typeof fontFamily === 'string' ? fontFamily.replace(/^['"]|['"]$/g, '') : fontFamily
  }

  _isUsableText(text) {
    return isTextElement(text) && !text.destroyed && text.parent
  }

  _isEmptyText(text) {
    const value = this._getRawText(text)

    return this._normalizeTextContent(value).length === 0
  }

  _normalizeTextContent(value) {
    return String(value ?? '').replace(/[\s\u200b\ufeff]/g, '')
  }

  _removeEmptyText(text) {
    if (!this._isUsableText(text)) {
      return
    }

    if (this._context?.innerEditor?.hasItem?.(text)) {
      this._context.innerEditor.cancel()
    }

    text.remove()

    if (this._activeText === text) {
      this._activeText = null
    }
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
