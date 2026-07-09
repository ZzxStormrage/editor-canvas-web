import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { init } from '../canvas-editor-core/src/index.js'

const WATERMARK_NODE_KEY = '__eleEditorWatermark'

/**
 * 管理 canvas-editor-core 的实例、状态同步和业务操作。
 *
 * @returns {Object} 编辑器状态、DOM 引用和操作方法。
 */
export function useCanvasEditor() {
  const canvasRef = ref(null)
  const imageInputRef = ref(null)
  const zoom = ref(1)
  const textValue = ref('双击编辑文字')
  const watermarkValue = ref('')
  const artboardWidth = ref(375)
  const artboardHeight = ref(667)
  const fontFamily = ref('PingFang SC')
  const fontSize = ref(36)
  const fontWeight = ref('400')
  const textColor = ref('#1f2937')
  const textAlign = ref('center')
  const letterSpacing = ref(0)
  const lineHeight = ref(44)
  const italic = ref(false)
  const underline = ref(false)
  const lineThrough = ref(false)
  const writingMode = ref('x')
  const fontOptions = [
    'PingFang SC',
    'Microsoft YaHei',
    'Arial',
    'Helvetica',
    'Georgia',
    'Times New Roman',
    'Courier New'
  ]
  const zoomPercent = computed(() => Math.round(zoom.value * 100))
  let editor = null
  let unsubscribeTextSelected = null
  let isSyncingTextControls = false
  let isAddingWatermark = false

  /**
   * 初始化 Leafer 画布。
   *
   * @returns {void}
   */
  const initCanvas = () => {
    if (!canvasRef.value) {
      return
    }

    editor = init({
      view: canvasRef.value,
      autoResize: true
    })
    unsubscribeTextSelected = editor.eventBus.on('text:selected', ({ options }) => {
      if (isAddingWatermark) {
        return
      }

      applyTextOptionsToUI(options)
    })
    zoom.value = editor.state.zoom
    syncArtboardControls()
  }

  /**
   * 销毁 Leafer 画布。
   *
   * @returns {void}
   */
  const destroyCanvas = () => {
    unsubscribeTextSelected?.()
    unsubscribeTextSelected = null
    editor?.destroy()
    editor = null
  }

  /**
   * 打开图片文件选择器。
   *
   * @returns {void}
   */
  const openImagePicker = () => {
    imageInputRef.value?.click()
  }

  /**
   * 处理图片文件选择。
   *
   * @param {Event} event input change 事件。
   * @returns {Promise<void>}
   */
  const handleImageChange = async (event) => {
    const [file] = event.target.files ?? []

    if (!file || !editor) {
      return
    }

    await editor.image.add(file)
    event.target.value = ''
  }

  /**
   * 获取当前文字控件配置。
   *
   * @returns {Object} 文本样式配置。
   */
  const getTextOptions = () => ({
    fontFamily: fontFamily.value,
    fontSize: fontSize.value,
    fontWeight: Number(fontWeight.value),
    italic: italic.value,
    fill: textColor.value,
    textAlign: textAlign.value,
    textDecoration: getTextDecoration(),
    letterSpacing: letterSpacing.value,
    lineHeight: lineHeight.value,
    writingMode: writingMode.value
  })

  /**
   * 获取文字装饰线配置。
   *
   * @returns {string} Leafer 文本装饰线值。
   */
  const getTextDecoration = () => {
    if (underline.value && lineThrough.value) {
      return 'under-delete'
    }

    if (underline.value) {
      return 'under'
    }

    return lineThrough.value ? 'delete' : 'none'
  }

  /**
   * 将选中文本样式同步到 UI 控件。
   *
   * @param {Object} options 文本样式快照。
   * @returns {Promise<void>}
   */
  const applyTextOptionsToUI = async (options) => {
    if (!options) {
      return
    }

    isSyncingTextControls = true
    textValue.value = options.text ?? ''
    fontFamily.value = options.fontFamily ?? fontFamily.value
    fontSize.value = normalizePixelForUI(options.fontSize ?? fontSize.value)
    fontWeight.value = normalizeFontWeightForUI(options.fontWeight ?? fontWeight.value)
    textColor.value = typeof options.fill === 'string' ? options.fill : textColor.value
    textAlign.value = options.textAlign ?? textAlign.value
    letterSpacing.value = normalizePixelForUI(options.letterSpacing ?? 0, 0)
    lineHeight.value = normalizePixelForUI(
      options.lineHeight ?? Math.round((options.fontSize ?? fontSize.value) * 1.22)
    )
    italic.value = Boolean(options.italic)
    underline.value = options.textDecoration === 'under' || options.textDecoration === 'under-delete'
    lineThrough.value = options.textDecoration === 'delete' || options.textDecoration === 'under-delete'
    writingMode.value = options.writingMode ?? 'x'

    await nextTick()
    isSyncingTextControls = false
  }

  /**
   * 将字体字重归一化为 UI 使用的字符串。
   *
   * @param {string | number} value 原始字重。
   * @returns {string} UI 字重值。
   */
  const normalizeFontWeightForUI = (value) => {
    const weightMap = {
      normal: '400',
      regular: '400',
      medium: '500',
      bold: '700'
    }

    return weightMap[value] ?? String(value ?? '400')
  }

  /**
   * 将工具栏像素值归整为整数。
   *
   * @param {number} value 像素值。
   * @param {number} min 最小值。
   * @returns {number} 整数像素值。
   */
  const normalizePixelForUI = (value, min = 1) => {
    const number = Number(value)

    if (!Number.isFinite(number)) {
      return min
    }

    return Math.max(min, Math.round(number))
  }

  /**
   * 添加文本元素。
   *
   * @returns {Promise<void>}
   */
  const addText = async () => {
    if (!editor) {
      return
    }

    await editor.text.add(textValue.value || '双击编辑文字', getTextOptions())
  }

  /**
   * 添加铺满画板的水印文本。
   *
   * @returns {Promise<void>}
   */
  const addWatermark = async () => {
    if (!editor) {
      return
    }

    const content = watermarkValue.value?.trim() || '水印'
    const artboardBounds = getArtboardBounds()
    const watermarkFontSize = 28
    const watermarkWidth = Math.max(180, Math.min(360, content.length * watermarkFontSize * 1.4))
    const columnGap = watermarkWidth + 110
    const rowGap = 150
    const startX = artboardBounds.x - watermarkWidth
    const startY = artboardBounds.y - rowGap
    const tasks = []

    isAddingWatermark = true

    try {
      for (
        let y = startY, rowIndex = 0;
        y < artboardBounds.y + artboardBounds.height + rowGap;
        y += rowGap, rowIndex += 1
      ) {
        const offsetX = rowIndex % 2 === 0 ? 0 : columnGap / 2

        for (let x = startX - offsetX; x < artboardBounds.x + artboardBounds.width + columnGap; x += columnGap) {
          tasks.push(
            editor.text.add(content, {
              x,
              y,
              width: watermarkWidth,
              rotation: -28,
              fontFamily: fontFamily.value,
              fontSize: watermarkFontSize,
              fontWeight: 700,
              fill: 'rgba(255, 255, 255, 0.36)',
              textAlign: 'center',
              lineHeight: Math.round(watermarkFontSize * 1.25),
              letterSpacing: 2,
              textDecoration: 'none',
              writingMode: 'x',
              draggable: false,
              editable: false
            }).then(markWatermarkNode)
          )
        }
      }

      await Promise.all(tasks)
      editor.deselect()
    } finally {
      isAddingWatermark = false
    }
  }

  /**
   * 给水印节点打标记，方便后续批量删除。
   *
   * @param {Object} watermark 水印文本节点。
   * @returns {Object} 已打标记的水印节点。
   */
  const markWatermarkNode = (watermark) => {
    watermark[WATERMARK_NODE_KEY] = true
    return watermark
  }

  /**
   * 删除当前画布上的所有水印节点。
   *
   * @returns {void}
   */
  const deleteWatermark = () => {
    if (!editor) {
      return
    }

    const watermarks = (editor.contentLayer?.children ?? []).filter((child) => {
      return child?.[WATERMARK_NODE_KEY]
    })

    watermarks.forEach((watermark) => watermark.remove())
    editor.deselect()
  }

  /**
   * 同步画板宽高输入框。
   *
   * @returns {void}
   */
  const syncArtboardControls = () => {
    const bounds = getArtboardBounds()

    artboardWidth.value = normalizePixelForUI(bounds.width, 120)
    artboardHeight.value = normalizePixelForUI(bounds.height, 120)
  }

  /**
   * 获取当前白色画板边界。
   *
   * @returns {{ x: number, y: number, width: number, height: number }} 画板边界。
   */
  const getArtboardBounds = () => {
    return editor?.artboard?.getContentBounds?.() ?? {
      x: 0,
      y: 0,
      width: editor?.state?.width ?? 0,
      height: editor?.state?.height ?? 0
    }
  }

  /**
   * 更新白色画板尺寸。
   *
   * @returns {void}
   */
  const updateArtboardSize = () => {
    if (!editor) {
      return
    }

    editor.setArtboardSize(
      normalizePixelForUI(artboardWidth.value, 120),
      normalizePixelForUI(artboardHeight.value, 120)
    )
    syncArtboardControls()
  }

  /**
   * 将 UI 控件变化同步到当前选中文本。
   *
   * @returns {void}
   */
  const updateSelectedText = () => {
    if (!editor || isSyncingTextControls || !editor.text.getSelected()) {
      return
    }

    if ((textValue.value ?? '').trim() === '') {
      const text = editor.text.getSelected()

      if (text) {
        text.remove()
        editor.deselect()
      }
      return
    }

    editor.text.update({
      text: textValue.value,
      ...getTextOptions()
    })
  }

  /**
   * 处理 Mac 妙控板轻触双击的文本编辑兜底。
   *
   * @param {MouseEvent} event DOM 双击事件。
   * @returns {void}
   */
  const handleCanvasDoubleClick = (event) => {
    if (!editor || editor.editor?.innerEditing) {
      return
    }

    const text = getTextElementByDomPoint(event)

    if (text) {
      editor.text.edit(text)
    }
  }

  /**
   * 根据 DOM 双击坐标查找命中的文本节点。
   *
   * @param {MouseEvent} event DOM 双击事件。
   * @returns {Object | null} 命中的文本节点。
   */
  const getTextElementByDomPoint = (event) => {
    const worldPoint = getWorldPointFromDomEvent(event)

    if (!worldPoint) {
      return null
    }

    return findTopTextElementAtPoint(worldPoint)
  }

  /**
   * 把浏览器 DOM 坐标转换为 Leafer 世界坐标。
   *
   * @param {MouseEvent} event DOM 双击事件。
   * @returns {{ x: number, y: number } | null} Leafer 世界坐标。
   */
  const getWorldPointFromDomEvent = (event) => {
    const clientPoint = {
      clientX: event.clientX,
      clientY: event.clientY
    }
    const tree = editor?.leafer?.tree
    const worldPoint = tree?.getWorldPointByClient?.(clientPoint, true)

    if (worldPoint) {
      return worldPoint
    }

    return tree?.interaction?.getLocal?.(clientPoint, true) ?? null
  }

  /**
   * 查找指定世界坐标下最上层的文本元素。
   *
   * @param {{ x: number, y: number }} worldPoint Leafer 世界坐标。
   * @returns {Object | null} 文本节点。
   */
  const findTopTextElementAtPoint = (worldPoint) => {
    const children = editor?.contentLayer?.children ?? []

    for (let i = children.length - 1; i >= 0; i -= 1) {
      const child = children[i]

      if (isEditableTextElement(child) && isPointInElementBounds(child, worldPoint)) {
        return child
      }
    }

    return null
  }

  /**
   * 判断节点是否为可编辑文本元素。
   *
   * @param {Object} element Leafer 节点。
   * @returns {boolean} 是否为可编辑文本。
   */
  const isEditableTextElement = (element) => {
    return (element?.tag === 'Text' || element?.constructor?.name === 'Text') && element.editable !== false
  }

  /**
   * 判断世界坐标是否落在元素外框内。
   *
   * @param {Object} element Leafer 节点。
   * @param {{ x: number, y: number }} worldPoint Leafer 世界坐标。
   * @returns {boolean} 是否命中元素外框。
   */
  const isPointInElementBounds = (element, worldPoint) => {
    const bounds = element?.worldBoxBounds
    const tolerance = 6

    if (!bounds || !Number.isFinite(worldPoint?.x) || !Number.isFinite(worldPoint?.y)) {
      return false
    }

    return (
      worldPoint.x >= bounds.x - tolerance &&
      worldPoint.x <= bounds.x + bounds.width + tolerance &&
      worldPoint.y >= bounds.y - tolerance &&
      worldPoint.y <= bounds.y + bounds.height + tolerance
    )
  }

  /**
   * 同步缩放状态到 UI。
   *
   * @returns {void}
   */
  const syncZoom = () => {
    if (editor) {
      zoom.value = editor.state.zoom
    }
  }

  /**
   * 放大画布。
   *
   * @returns {void}
   */
  const zoomIn = () => {
    editor?.zoomIn()
    syncZoom()
  }

  /**
   * 缩小画布。
   *
   * @returns {void}
   */
  const zoomOut = () => {
    editor?.zoomOut()
    syncZoom()
  }

  /**
   * 重置画布缩放。
   *
   * @returns {void}
   */
  const resetZoom = () => {
    editor?.resetZoom()
    syncZoom()
  }

  onMounted(initCanvas)
  onBeforeUnmount(destroyCanvas)
  watch(
    [
      textValue,
      fontFamily,
      fontSize,
      fontWeight,
      textColor,
      textAlign,
      letterSpacing,
      lineHeight,
      italic,
      underline,
      lineThrough,
      writingMode
    ],
    updateSelectedText
  )

  return {
    canvasRef,
    imageInputRef,
    zoom,
    zoomPercent,
    textValue,
    watermarkValue,
    artboardWidth,
    artboardHeight,
    fontFamily,
    fontSize,
    fontWeight,
    textColor,
    textAlign,
    letterSpacing,
    lineHeight,
    italic,
    underline,
    lineThrough,
    writingMode,
    fontOptions,
    openImagePicker,
    handleImageChange,
    addText,
    addWatermark,
    deleteWatermark,
    updateArtboardSize,
    handleCanvasDoubleClick,
    zoomIn,
    zoomOut,
    resetZoom
  }
}
