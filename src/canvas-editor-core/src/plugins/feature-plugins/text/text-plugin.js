import { Text as LeaferText } from 'leafer-ui'
import { EditorEvent, EditorScaleEvent, InnerEditorEvent } from '@leafer-in/editor'
import '@leafer-in/text-editor'

import { EditorError } from '../../../errors/editor-error.js'
import { getElementDataContainer } from '../../../utils/element-data.js'
import { loadFontFace } from '../../../utils/font.js'
import { normalizeTextOptions, isTextElement } from '../../../utils/text.js'
import { applyTextInputRules, normalizeTextInputRules } from '../../../utils/text-input-rules.js'
import {
  normalizeSingleLineText,
  normalizeTextLayout,
  resolveSingleLineFontSize
} from '../../../utils/text-layout.js'

const FONT_URL_KEY = '__canvasEditorFontUrl'
const RAW_TEXT_KEY = '__canvasEditorRawText'
const INITIAL_TEXT_GEOMETRY_KEY = '__canvasEditorInitialTextGeometry'
const VERTICAL_FONT_CENTER_KEY = '__canvasEditorVerticalFontCenter'
const TEXT_LAYOUT_BASELINE_KEY = '__canvasEditorTextLayoutBaseline'
const MIN_TEXT_PIXEL = 1
const VISUAL_ITALIC_KEY = '__canvasEditorVisualItalic'
const VISUAL_ITALIC_SKEW_X = -12
const NATIVE_DOUBLE_CLICK_TOLERANCE = 4
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
    /** @private @type {HTMLElement | HTMLCanvasElement | null} */
    this._view = null
    this._handleNativeDoubleClick = this._handleNativeDoubleClick.bind(this)
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
    this._view = context.leafer?.view ?? null
    context.innerEditor?.on_(EditorEvent.SELECT, this._handleSelect, this)
    context.innerEditor?.on_(EditorScaleEvent.SCALE, this._handleScale, this)
    context.innerEditor?.on_(InnerEditorEvent.OPEN, this._handleInnerOpen, this)
    context.innerEditor?.on_(InnerEditorEvent.CLOSE, this._handleInnerClose, this)
    this._view?.addEventListener('dblclick', this._handleNativeDoubleClick)
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
      await loadFontFace(textOptions.fontFamily, textOptions.fontUrl)
      const { renderOptions, rawText } = this._getRenderableTextOptions(textOptions)
      this._applyTextEditConfig(renderOptions)
      this._applyMeasuredAddWidth(renderOptions, rawText, inputOptions, state)
      const text = new LeaferText({
        draggable: true,
        editable: true,
        ...renderOptions
      })

      getElementDataContainer(text, true)
      this._setFontUrl(text, textOptions.fontUrl)
      this._setRawText(text, rawText)
      this._applyVisualItalic(text, renderOptions)
      text.forceUpdate?.()
      text.updateLayout?.()
      contentLayer.add(text)
      this._captureInitialTextGeometry(text)
      this._captureTextLayoutBaseline(text)
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
   * @param {{ select?: boolean }} [behavior={}] 更新后的选区行为。
   * @returns {LeaferText} 更新后的文本节点。
   * @throws {EditorError} 当没有可更新文本节点或配置非法时抛出。
   */
  update(target, options, behavior = {}) {
    this._assertReady()

    const text = this._resolveUpdateTarget(target, options)
    const updateOptions = options === undefined ? target : options
    const normalizedOptions = TextPlugin.normalizeOptions(updateOptions ?? {})
    const previousFontFamily = text.fontFamily ?? text.__?.fontFamily
    const textCenter = this._getOrCreateVerticalFontCenter(text, normalizedOptions)

    const { renderOptions, rawText } = this._getRenderableTextOptions(normalizedOptions, text)
    this._applyTextEditConfig(renderOptions)
    this._applyMeasuredUpdateWidth(text, renderOptions, rawText, normalizedOptions)

    text.set?.(renderOptions)
    this._syncFontUrl(text, normalizedOptions, previousFontFamily)
    this._setRawText(text, rawText)
    this._applyTextPatchFallback(text, renderOptions)
    this._applyVisualItalic(text, renderOptions)
    text.forceUpdate?.()
    text.updateLayout?.()
    this._restoreTextCenter(text, textCenter)

    if (behavior.select !== false) {
      this._activeText = text
      this._context.innerEditor?.select(text)
      this._refreshSelectedEditBox()
    }

    this._context.eventBus.emit('text:updated', { text, options: normalizedOptions })
    this._refreshAfterFontLoad(text, normalizedOptions, textCenter)

    if (behavior.select !== false) {
      this._emitSelected(text)
    }

    return text
  }

  /**
   * 恢复文档文本的编辑器运行时状态。
   *
   * @param {Object} target Leafer 文本节点。
   * @param {Object} source 文档文本数据。
   * @returns {Object} 原文本节点。
   */
  restoreDocumentState(target, source) {
    if (!isTextElement(target)) {
      return target
    }

    this._setRawText(target, source.text ?? target.text ?? '')
    this._setFontUrl(target, source.fontUrl)
    this._ensureTextEditConfig(target)

    // Capture the document's first measurable bounds before any external
    // content or font replacement can resize the node. Vertical text uses
    // this geometry directly; keeping it for all text nodes also makes a
    // later writing-mode change deterministic.
    this._captureInitialTextGeometry(target)
    this._captureTextLayoutBaseline(target)

    return target
  }

  /**
   * 替换指定文本节点的内容，并保留原节点样式、位置和固定宽度。
   *
   * @param {LeaferText} target 指定文本节点。
   * @param {string | number} content 新文本内容。
   * @param {{ select?: boolean }} [options={}] 是否在替换后选中节点。
   * @returns {LeaferText} 已替换内容的原文本节点。
   * @throws {EditorError} 目标不是文本节点时抛出。
   */
  replace(target, content, options = {}) {
    this._assertReady()

    if (!isTextElement(target)) {
      throw new EditorError('text.replace(target, content) requires a Text node.', 'TEXT_TARGET_INVALID')
    }

    const writingMode = target.writingMode ?? target.__?.writingMode
    const width = Number(target.width ?? target.__?.width)
    const preserveWidth = !this._isVerticalWritingMode(writingMode)
    const updateOptions = {
      text: content ?? '',
      ...(preserveWidth && Number.isFinite(width) && width > 0 ? { width } : {})
    }
    const updatedText = this.update(target, updateOptions, { select: options.select === true })

    this._context.eventBus.emit('text:replaced', {
      text: updatedText,
      content: String(content ?? '')
    })
    return updatedText
  }

  /**
   * 按元素 textLayout 属性替换文字。
   *
   * 单行适配保持模板宽度和中心点，从模板字号向下缩小；竖排显示会清除主动换行并
   * 强制使用竖排方向。未配置特殊显示策略时与 replace() 行为一致。
   *
   * @param {LeaferText} target 指定文本节点。
   * @param {string | number} content 新文本内容。
   * @param {{ select?: boolean, layout?: Object }} [options={}] 替换配置。
   * @returns {LeaferText} 已替换内容的原文本节点。
   */
  replaceWithLayout(target, content, options = {}) {
    this._assertReady()

    if (!isTextElement(target)) {
      throw new EditorError('text.replaceWithLayout requires a Text node.', 'TEXT_TARGET_INVALID')
    }
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new EditorError('text layout options must be an object.', 'TEXT_LAYOUT_OPTIONS_INVALID')
    }

    const layout = normalizeTextLayout(options.layout ?? this._getConfiguredTextLayout(target))
    if (layout.mode === 'single-line') {
      return this._replaceSingleLine(target, content, layout, options)
    }
    if (layout.mode === 'vertical') {
      return this._replaceVertical(target, content, layout, options)
    }

    return this.replace(target, content, { select: options.select === true })
  }

  /**
   * 按元素 textInput 和 textLayout 属性替换文字。
   *
   * @param {LeaferText} target 指定文本节点。
   * @param {string | number} content 原始用户输入。
   * @param {{ select?: boolean, rules?: Object, layout?: Object }} [options={}] 规则覆盖值。
   * @returns {LeaferText} 已替换内容的原文本节点。
   */
  replaceWithRules(target, content, options = {}) {
    this._assertReady()

    if (!isTextElement(target)) {
      throw new EditorError('text.replaceWithRules requires a Text node.', 'TEXT_TARGET_INVALID')
    }
    if (!options || typeof options !== 'object' || Array.isArray(options)) {
      throw new EditorError('text rule options must be an object.', 'TEXT_RULE_OPTIONS_INVALID')
    }

    const attributes = getElementDataContainer(target)?.attributes ?? {}
    const rules = normalizeTextInputRules(options.rules ?? attributes.textInput)
    const normalizedContent = applyTextInputRules(content, rules)
    if (rules.enabled && rules.singleVerticalLine) {
      return this.replaceWithLayout(target, normalizedContent, {
        ...options,
        layout: { mode: 'vertical' }
      })
    }

    return this.replaceWithLayout(target, normalizedContent, options)
  }

  /**
   * 替换当前严格单选文本的内容，并保留原节点样式、位置和固定宽度。
   *
   * @param {string | number} content 新文本内容。
   * @returns {LeaferText} 已替换内容的原文本节点。
   * @throws {EditorError} 当前不是严格单选文本时抛出。
   */
  replaceSelected(content) {
    this._assertReady()
    const selected = this._getSelectedElements()
    const text = selected.length === 1 && isTextElement(selected[0]) ? selected[0] : null

    if (!text) {
      throw new EditorError('Select one text element before replacing it.', 'TEXT_SELECTION_REQUIRED')
    }

    return this.replace(text, content, { select: true })
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
      fontUrl: this.getFontUrl(text) ?? undefined,
      fontSize: this._normalizePixelValue(text.fontSize ?? data.fontSize),
      fontWeight: text.fontWeight ?? data.fontWeight,
      italic: Boolean(data.italic ?? text.italic),
      fill: typeof text.fill === 'string' ? text.fill : data.fill,
      textAlign: text.textAlign ?? data.textAlign,
      textDecoration: text.textDecoration ?? data.textDecoration,
      letterSpacing: this._normalizePixelValue(text.letterSpacing ?? data.letterSpacing ?? data.__letterSpacing, 0),
      lineHeight: this._normalizePixelValue(text.lineHeight ?? data.lineHeight ?? data.__lineHeight),
      writingMode: text.writingMode ?? data.writingMode,
      width: text.width ?? data.width,
      verticalAlign: text.verticalAlign ?? data.verticalAlign,
      textWrap: text.textWrap ?? data.textWrap,
      textOverflow: text.textOverflow ?? data.textOverflow
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
   * 获取文本节点关联的远程字体地址。
   *
   * @param {LeaferText} target 文本节点。
   * @returns {string | null} 字体地址；系统字体或非文本节点返回 null。
   */
  getFontUrl(target) {
    if (!isTextElement(target)) {
      return null
    }

    const fontUrl = target[FONT_URL_KEY]
    return typeof fontUrl === 'string' && fontUrl.trim() ? fontUrl : null
  }

  /**
   * 销毁插件。
   *
   * @returns {void}
   */
  destroy() {
    this._view?.removeEventListener('dblclick', this._handleNativeDoubleClick)
    this._context?.innerEditor?.off_(EditorEvent.SELECT, this._handleSelect, this)
    this._context?.innerEditor?.off_(EditorScaleEvent.SCALE, this._handleScale, this)
    this._context?.innerEditor?.off_(InnerEditorEvent.OPEN, this._handleInnerOpen, this)
    this._context?.innerEditor?.off_(InnerEditorEvent.CLOSE, this._handleInnerClose, this)
    this._context = null
    this._activeText = null
    this._view = null
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
    return this._isOptionsObject(content) ? { ...content, ...(options ?? {}) } : { ...(options ?? {}), text: content }
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
    return (
      this._context?.artboard?.getContentBounds?.() ?? {
        x: 0,
        y: 0,
        width: state.width,
        height: state.height
      }
    )
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
   * 使用固定模板宽度执行单行替换。
   *
   * @private
   * @param {LeaferText} text 文本节点。
   * @param {string | number} content 新文本内容。
   * @param {{ minFontSize: number | null }} layout 显示策略。
   * @param {{ select?: boolean }} options 替换配置。
   * @returns {LeaferText} 更新后的文本节点。
   */
  _replaceSingleLine(text, content, layout, options) {
    const baseline = this._captureTextLayoutBaseline(text)
    const singleLineText = normalizeSingleLineText(content)
    const style = this.getStyle(text) ?? {}
    const fontSize = resolveSingleLineFontSize({
      frameWidth: baseline.width,
      baseFontSize: baseline.fontSize,
      minFontSize: layout.minFontSize,
      measureWidth: (candidate) => this._measureTextWidth(singleLineText, {
        ...style,
        fontSize: candidate
      })
    })
    const updateOptions = this._createSingleLineUpdateOptions(
      singleLineText,
      baseline,
      fontSize
    )
    const updatedText = this.update(text, updateOptions, {
      select: options.select === true,
      preserveLayoutBaseline: true
    })

    this._context.eventBus.emit('text:replaced', {
      text: updatedText,
      content: singleLineText,
      layout: { ...layout, appliedFontSize: fontSize }
    })
    return updatedText
  }

  /**
   * 清理主动换行并强制使用竖排方向替换文字。
   *
   * @private
   * @param {LeaferText} text 文本节点。
   * @param {string | number} content 新文本内容。
   * @param {Object} layout 显示策略。
   * @param {{ select?: boolean }} options 替换配置。
   * @returns {LeaferText} 更新后的文本节点。
   */
  _replaceVertical(text, content, layout, options) {
    const baseline = this._captureTextLayoutBaseline(text)
    const verticalText = normalizeSingleLineText(content)
    const updateOptions = {
      text: verticalText,
      fontSize: baseline.fontSize,
      writingMode: 'y',
      textWrap: 'none',
      textOverflow: 'show'
    }
    if (baseline.lineHeight) {
      updateOptions.lineHeight = baseline.lineHeight
    }
    const updatedText = this.update(text, updateOptions, {
      select: options.select === true,
      preserveLayoutBaseline: true
    })

    this._context.eventBus.emit('text:replaced', {
      text: updatedText,
      content: verticalText,
      layout: { ...layout }
    })
    return updatedText
  }

  /**
   * 生成单行替换所需的渲染属性。
   *
   * @private
   * @param {string} content 单行文字。
   * @param {Object} baseline 模板基准样式。
   * @param {number} fontSize 应用字号。
   * @returns {Object} 文本更新属性。
   */
  _createSingleLineUpdateOptions(content, baseline, fontSize) {
    const options = {
      text: content,
      width: baseline.width,
      fontSize,
      writingMode: 'x',
      textWrap: 'none',
      textOverflow: 'show'
    }

    if (baseline.lineHeight) {
      options.lineHeight = this._roundPixel(
        baseline.lineHeight * fontSize / baseline.fontSize
      )
    }

    return options
  }

  /**
   * 获取元素显式配置的文本显示策略。
   *
   * @private
   * @param {LeaferText} text 文本节点。
   * @returns {Object} 原始 textLayout 属性。
   */
  _getConfiguredTextLayout(text) {
    return getElementDataContainer(text)?.attributes?.textLayout ?? {}
  }

  /**
   * 保存模板初始宽度、字号和行高，防止连续输入后累计缩小。
   *
   * @private
   * @param {LeaferText} text 文本节点。
   * @returns {{ width: number, fontSize: number, lineHeight: number | null }} 模板基准。
   */
  _captureTextLayoutBaseline(text) {
    const existing = text?.[TEXT_LAYOUT_BASELINE_KEY]
    if (existing && [existing.width, existing.fontSize].every(this._isPositiveNumber)) {
      return existing
    }

    const geometry = this._captureInitialTextGeometry(text)
    const style = this.getStyle(text) ?? {}
    const baseline = {
      width: this._positiveNumber(geometry?.width ?? style.width, 1),
      fontSize: this._positiveNumber(style.fontSize, 12),
      lineHeight: this._nullablePositiveNumber(style.lineHeight)
    }

    text[TEXT_LAYOUT_BASELINE_KEY] = baseline
    return baseline
  }

  /** @private @param {*} value 输入值。 @returns {boolean} 是否为正数。 */
  _isPositiveNumber(value) {
    return Number.isFinite(Number(value)) && Number(value) > 0
  }

  /** @private @param {*} value 输入值。 @param {number} fallback 默认值。 @returns {number} 正数。 */
  _positiveNumber(value, fallback) {
    return this._isPositiveNumber(value) ? Number(value) : fallback
  }

  /** @private @param {*} value 输入值。 @returns {number | null} 正数或 null。 */
  _nullablePositiveNumber(value) {
    return this._isPositiveNumber(value) ? Number(value) : null
  }

  /** @private @param {number} value 像素值。 @returns {number} 两位小数像素值。 */
  _roundPixel(value) {
    return Number(Number(value).toFixed(2))
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
    const lines = String(rawText ?? '')
      .replace(/\r\n?/g, '\n')
      .split('\n')
    const writingMode = options.writingMode ?? 'x'

    context.font = `${italic}${fontWeight}${fontSize}px ${fontFamily}`

    if (this._isVerticalWritingMode(writingMode)) {
      const glyphWidths = lines.flatMap((line) =>
        Array.from(line).map((character) => {
          const metrics = context.measureText(character)
          const actualWidth =
            Math.abs(metrics.actualBoundingBoxLeft ?? 0) + Math.abs(metrics.actualBoundingBoxRight ?? 0)
          return actualWidth > 0 ? actualWidth : metrics.width
        })
      )
      const measuredWidth = Math.max(...glyphWidths, 0)

      return Math.ceil(measuredWidth || fontSize)
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
    delete renderOptions.fontUrl
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
   * 根据更新参数同步文本字体地址。
   *
   * @private
   * @param {LeaferText} text 文本节点。
   * @param {Object} options 本次归一化配置。
   * @param {string | undefined} previousFontFamily 更新前字体名称。
   * @returns {void}
   */
  _syncFontUrl(text, options, previousFontFamily) {
    if (Object.prototype.hasOwnProperty.call(options, 'fontUrl')) {
      this._setFontUrl(text, options.fontUrl)
      return
    }

    if (
      Object.prototype.hasOwnProperty.call(options, 'fontFamily') &&
      this._stripFontFamilyQuotes(options.fontFamily) !== this._stripFontFamilyQuotes(previousFontFamily)
    ) {
      this._setFontUrl(text, null)
    }
  }

  /**
   * 字体异步注册完成后刷新文本尺寸和选区。
   *
   * @private
   * @param {LeaferText} text 文本节点。
   * @param {Object} options 本次归一化配置。
   * @param {{ x: number, y: number } | null} [textCenter] 字体更新前保存的中心点。
   * @returns {void}
   */
  _refreshAfterFontLoad(text, options, textCenter = null) {
    if (!options.fontUrl) {
      return
    }

    void loadFontFace(options.fontFamily ?? text.fontFamily, options.fontUrl)
      .then(() => {
        if (!this._isUsableText(text)) {
          return
        }

        if (normalizeTextLayout(this._getConfiguredTextLayout(text)).mode !== 'wrap') {
          this.replaceWithLayout(text, this._getRawText(text))
          return
        }

        const width = this._measureTextWidth(this._getRawText(text), this.getStyle(text) ?? {})
        if (width > 0) {
          text.set?.({ width })
        }
        text.forceUpdate?.()
        text.updateLayout?.()
        this._restoreTextCenter(text, textCenter)
        this._refreshSelectedEditBox()
      })
      .catch((error) => {
        console.warn(`Font loading failed: ${options.fontFamily ?? text.fontFamily}`, error)
      })
  }

  _shouldKeepVerticalCenter(text, options) {
    const changesLayout =
      Object.keys(options ?? {}).some((key) => DIMENSION_TEXT_KEYS.has(key)) ||
      Object.prototype.hasOwnProperty.call(options, 'fontUrl')

    // Keep the historical method name for compatibility, but center every
    // text node whose font/content update can change its measured bounds.
    return changesLayout
  }

  _getOrCreateVerticalFontCenter(text, options) {
    if (!this._shouldKeepVerticalCenter(text, options)) {
      return null
    }

    const savedCenter = text?.[VERTICAL_FONT_CENTER_KEY]
    if ([savedCenter?.x, savedCenter?.y].every(Number.isFinite)) {
      this._captureInitialTextGeometry(text, savedCenter)
      return savedCenter
    }

    const center = this._captureInitialTextGeometry(text)?.center ?? this._getTextCenter(text)
    if (center && text) {
      text[VERTICAL_FONT_CENTER_KEY] = center
    }

    return center
  }

  _getTextCenter(text) {
    return this._getTextGeometry(text)?.center ?? null
  }

  _getTextGeometry(text) {
    const x = Number(text?.x)
    const y = Number(text?.y)
    const width = Number(text?.width)
    const height = Number(text?.height)

    if (![x, y, width, height].every(Number.isFinite)) {
      return null
    }

    return {
      x,
      y,
      width,
      height,
      center: {
        x: x + width / 2,
        y: y + height / 2
      }
    }
  }

  /**
   * Capture the first usable text bounds and keep them for the lifetime of
   * the node. Font and content changes may resize a Text node, but they must
   * always be positioned from this initial geometry instead of the previous
   * update's geometry.
   *
   * @param {LeaferText} text Text node.
   * @param {{ x: number, y: number }} [centerOverride] Optional center supplied
   * by a document restoration flow.
   * @returns {{ x: number, y: number, width: number, height: number, center: { x: number, y: number } } | null}
   * Initial text geometry, or null when the node has no measurable bounds yet.
   * @private
   */
  _captureInitialTextGeometry(text, centerOverride = null) {
    if (!isTextElement(text)) {
      return null
    }

    const existing = text[INITIAL_TEXT_GEOMETRY_KEY]
    if (
      existing &&
      [existing.x, existing.y, existing.width, existing.height, existing.center?.x, existing.center?.y].every(
        Number.isFinite
      )
    ) {
      return existing
    }

    const geometry = this._getTextGeometry(text)
    if (!geometry) {
      return null
    }

    const center = [centerOverride?.x, centerOverride?.y].every(Number.isFinite)
      ? { x: Number(centerOverride.x), y: Number(centerOverride.y) }
      : geometry.center
    const initialGeometry = {
      x: geometry.x,
      y: geometry.y,
      width: geometry.width,
      height: geometry.height,
      center
    }

    text[INITIAL_TEXT_GEOMETRY_KEY] = initialGeometry
    text[VERTICAL_FONT_CENTER_KEY] = center

    return initialGeometry
  }

  _restoreTextCenter(text, center) {
    if (!center) {
      return
    }

    const width = Number(text?.width)
    const height = Number(text?.height)

    if (![width, height].every(Number.isFinite)) {
      return
    }

    text.set?.({
      x: center.x - width / 2,
      y: center.y - height / 2
    })
  }

  /**
   * 保存不属于 Leafer 渲染属性的字体地址。
   *
   * @private
   * @param {LeaferText} text 文本节点。
   * @param {string | null | undefined} fontUrl 字体地址。
   * @returns {void}
   */
  _setFontUrl(text, fontUrl) {
    if (text) {
      text[FONT_URL_KEY] = typeof fontUrl === 'string' && fontUrl.trim() ? fontUrl.trim() : null
    }
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
    const schedule =
      typeof requestAnimationFrame === 'function' ? requestAnimationFrame : (callback) => setTimeout(callback, 0)

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

  /**
   * 使用浏览器原生 dblclick 补足触控板双击事件。
   *
   * Leafer 仍负责常规 double_tap；仅当它尚未打开内部编辑器时，才使用
   * 当前单选文本和官方 EditBox 边界进入编辑，避免外部视图层参与画布命中。
   *
   * @param {MouseEvent} event 浏览器双击事件。
   * @returns {void}
   * @private
   */
  _handleNativeDoubleClick(event) {
    const innerEditor = this._context?.innerEditor
    const text = this._getSelectedTextOnly()

    if (innerEditor?.innerEditing || event.button !== 0 || !text || text.locked) {
      return
    }

    if (this._isPointInsideEditBox(event.clientX, event.clientY)) {
      this.edit(text)
    }
  }

  /**
   * 判断浏览器坐标是否位于官方 EditBox 内。
   *
   * @param {number} clientX 浏览器横坐标。
   * @param {number} clientY 浏览器纵坐标。
   * @returns {boolean} 是否位于当前选区。
   * @private
   */
  _isPointInsideEditBox(clientX, clientY) {
    const worldPoint = this._context?.skyLeafer?.getWorldPointByClient?.({ clientX, clientY }, true)
    const editBounds = this._context?.innerEditor?.editBox?.rect?.worldBoxBounds

    if (!worldPoint || !editBounds) {
      return false
    }

    const gap = NATIVE_DOUBLE_CLICK_TOLERANCE

    return (
      worldPoint.x >= editBounds.x - gap &&
      worldPoint.x <= editBounds.x + editBounds.width + gap &&
      worldPoint.y >= editBounds.y - gap &&
      worldPoint.y <= editBounds.y + editBounds.height + gap
    )
  }

  /**
   * 打开官方 TextEditor 后确保输入层获得焦点。
   *
   * @param {import('@leafer-in/interface').IInnerEditorEvent} event 内部编辑器事件。
   * @returns {void}
   * @private
   */
  _handleInnerOpen(event) {
    const text = event?.editTarget

    if (!isTextElement(text)) {
      return
    }

    this._activeText = text
    this._getOrCreateVerticalFontCenter(text, { text: this._getRawText(text) })
    event.innerEditor?.editDom?.focus?.({ preventScroll: true })
  }

  /**
   * 提交官方 TextEditor 的输入结果并同步编辑器状态。
   *
   * @param {import('@leafer-in/interface').IInnerEditorEvent} event 内部编辑器关闭事件。
   * @returns {void}
   * @private
   */
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

    const writingMode = text.writingMode ?? text.__?.writingMode
    if (this._isVerticalWritingMode(writingMode)) {
      this.update(text, { text: this._getRawText(text) }, { select: false })
      this._emitSelected(text)
      return
    }

    this._applyWritingModeText(text)
    this._context?.eventBus.emit('text:updated', {
      text,
      options: { text: this._getRawText(text) }
    })
    this._emitSelected(text)
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
