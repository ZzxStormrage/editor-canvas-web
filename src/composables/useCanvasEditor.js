import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Rect } from 'leafer-ui'

import { init } from '../canvas-editor-core/src/index.js'
import { formatMillimeter, pixelToMillimeter } from '../canvas-editor-core/src/utils/unit.js'

const WATERMARK_NODE_KEY = '__eleEditorWatermark'
const MASK_NODE_KEY = '__eleEditorMask'
const MASK_NODE_LABEL = '遮罩图'
const PRINT_AREA_NODE_KEY = '__eleEditorPrintArea'
const PRINT_AREA_NODE_LABEL = '打印区域'
const MASK_MAX_PIXEL_SIZE = 2500
const MASK_MAX_FILE_SIZE = 2 * 1024 * 1024

/**
 * 管理 canvas-editor-core 的实例、状态同步和业务操作。
 *
 * @returns {Object} 编辑器状态、DOM 引用和操作方法。
 */
export function useCanvasEditor() {
  const canvasRef = ref(null)
  const imageInputRef = ref(null)
  const maskInputRef = ref(null)
  const zoom = ref(1)
  const textValue = ref('双击编辑文字')
  const watermarkValue = ref('')
  const artboardWidth = ref(375)
  const artboardHeight = ref(667)
  const printAreaWidth = ref(300)
  const printAreaHeight = ref(200)
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
  const layerMenu = ref({
    visible: false,
    x: 0,
    y: 0,
    actions: []
  })
  const maskConfirmDialog = ref({
    visible: false,
    file: null,
    width: 0,
    height: 0,
    size: 0
  })
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
  const artboardMillimeterSize = computed(() => {
    const width = formatMillimeter(pixelToMillimeter(artboardWidth.value))
    const height = formatMillimeter(pixelToMillimeter(artboardHeight.value))

    return `${width} x ${height} mm`
  })
  const maskConfirmSizeText = computed(() => {
    const payload = maskConfirmDialog.value
    const fileSize = formatFileSize(payload.size)

    return `${payload.width} x ${payload.height} px / ${fileSize}`
  })
  const printAreaMillimeterSize = computed(() => {
    const width = formatMillimeter(pixelToMillimeter(printAreaWidth.value))
    const height = formatMillimeter(pixelToMillimeter(printAreaHeight.value))

    return `${width} x ${height} mm`
  })
  let editor = null
  let activePrintArea = null
  let unsubscribeTextSelected = null
  let unsubscribeLayerMenuOpen = null
  let unsubscribeLayerMenuClose = null
  let unsubscribeZoomChanged = null
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
    unsubscribeLayerMenuOpen = editor.eventBus.on('selection:layer-menu-open', showLayerMenu)
    unsubscribeLayerMenuClose = editor.eventBus.on('selection:layer-menu-close', hideLayerMenu)
    unsubscribeZoomChanged = editor.eventBus.on('viewport:zoom-changed', ({ zoom: nextZoom }) => {
      zoom.value = nextZoom
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
    unsubscribeLayerMenuOpen?.()
    unsubscribeLayerMenuClose?.()
    unsubscribeZoomChanged?.()
    unsubscribeTextSelected = null
    unsubscribeLayerMenuOpen = null
    unsubscribeLayerMenuClose = null
    unsubscribeZoomChanged = null
    editor?.destroy()
    editor = null
  }

  /**
   * 显示 Vue 选区层级菜单。
   *
   * @param {{ x: number, y: number, actions: Array }} payload 菜单位置和动作列表。
   * @returns {void}
   */
  const showLayerMenu = (payload) => {
    const position = clampLayerMenuPosition(payload)

    layerMenu.value = {
      visible: true,
      x: position.x,
      y: position.y,
      actions: payload?.actions ?? []
    }
  }

  /**
   * 限制层级菜单在画布容器内部显示。
   *
   * @param {{ x: number, y: number }} payload 原始菜单坐标。
   * @returns {{ x: number, y: number }} 约束后的菜单坐标。
   */
  const clampLayerMenuPosition = (payload) => {
    const hostBounds = canvasRef.value?.getBoundingClientRect?.()
    const menuWidth = 138
    const menuHeight = 146
    const padding = 6
    const rawX = payload?.x ?? 0
    const rawY = payload?.y ?? 0

    if (!hostBounds) {
      return { x: rawX, y: rawY }
    }

    return {
      x: Math.min(Math.max(rawX, padding), hostBounds.width - menuWidth - padding),
      y: Math.min(Math.max(rawY, padding), hostBounds.height - menuHeight - padding)
    }
  }

  /**
   * 隐藏 Vue 选区层级菜单。
   *
   * @returns {void}
   */
  const hideLayerMenu = () => {
    layerMenu.value = {
      ...layerMenu.value,
      visible: false
    }
  }

  /**
   * 执行选区层级操作。
   *
   * @param {'front' | 'forward' | 'backward' | 'back'} action 层级动作。
   * @returns {void}
   */
  const runLayerAction = (action) => {
    editor?.runLayerAction(action)
  }

  /**
   * 关闭选区层级菜单。
   *
   * @returns {void}
   */
  const closeLayerMenu = () => {
    editor?.closeLayerMenu()
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
   * 打开遮罩图文件选择器。
   *
   * @returns {void}
   */
  const openMaskImagePicker = () => {
    maskInputRef.value?.click()
  }

  /**
   * 处理遮罩图文件选择。
   *
   * @param {Event} event input change 事件。
   * @returns {Promise<void>}
   */
  const handleMaskImageChange = async (event) => {
    const [file] = event.target.files ?? []

    event.target.value = ''

    if (!file || !editor) {
      return
    }

    const imageInfo = await readImageFileInfo(file)

    if (shouldConfirmMaskImage(imageInfo)) {
      maskConfirmDialog.value = {
        visible: true,
        file,
        ...imageInfo
      }
      return
    }

    await addMaskImage(file, imageInfo)
  }

  /**
   * 确认添加超大遮罩图。
   *
   * @returns {Promise<void>}
   */
  const confirmAddMaskImage = async () => {
    const payload = maskConfirmDialog.value

    maskConfirmDialog.value = {
      ...payload,
      visible: false
    }

    if (!payload.file) {
      return
    }

    await addMaskImage(payload.file, payload)
    clearMaskConfirmDialog()
  }

  /**
   * 取消添加遮罩图。
   *
   * @returns {void}
   */
  const cancelAddMaskImage = () => {
    clearMaskConfirmDialog()
  }

  /**
   * 清空遮罩图确认弹窗状态。
   *
   * @returns {void}
   */
  const clearMaskConfirmDialog = () => {
    maskConfirmDialog.value = {
      visible: false,
      file: null,
      width: 0,
      height: 0,
      size: 0
    }
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
   * 根据字号计算默认行高。
   *
   * @param {number} value 字号。
   * @returns {number} 默认行高。
   */
  const getDefaultLineHeight = (value) => {
    return normalizePixelForUI(Number(value) * 1.22)
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
   * 读取图片文件的真实像素尺寸。
   *
   * @param {File} file 图片文件。
   * @returns {Promise<{ width: number, height: number, size: number }>} 图片信息。
   */
  const readImageFileInfo = (file) => {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const image = new Image()

      image.onload = () => {
        URL.revokeObjectURL(url)
        resolve({
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
          size: file.size
        })
      }
      image.onerror = () => {
        URL.revokeObjectURL(url)
        reject(new Error('读取图片尺寸失败'))
      }
      image.src = url
    })
  }

  /**
   * 判断遮罩图是否需要用户二次确认。
   *
   * @param {{ width: number, height: number, size: number }} imageInfo 图片信息。
   * @returns {boolean} 是否需要确认。
   */
  const shouldConfirmMaskImage = (imageInfo) => {
    return (
      imageInfo.width > MASK_MAX_PIXEL_SIZE ||
      imageInfo.height > MASK_MAX_PIXEL_SIZE ||
      imageInfo.size > MASK_MAX_FILE_SIZE
    )
  }

  /**
   * 添加遮罩图并同步画板尺寸。
   *
   * @param {File} file 图片文件。
   * @param {{ width: number, height: number }} imageInfo 图片尺寸。
   * @returns {Promise<void>}
   */
  const addMaskImage = async (file, imageInfo) => {
    if (!editor) {
      return
    }

    removeMaskImages()
    editor.setArtboardSize(imageInfo.width, imageInfo.height)
    syncArtboardControls()

    const bounds = getArtboardBounds()
    const maskImage = await editor.image.add(file, {
      x: bounds.x,
      y: bounds.y,
      width: bounds.width,
      height: bounds.height,
      lockRatio: false
    })

    markMaskNode(maskImage)
    moveElementToBottom(maskImage)
    editor.deselect()
    editor.artboard?.syncAllElements?.()
    editor.fitArtboardToView()
    syncZoom()
  }

  /**
   * 给遮罩图节点打标记并锁定。
   *
   * @param {Object} maskImage 遮罩图节点。
   * @returns {Object} 已处理节点。
   */
  const markMaskNode = (maskImage) => {
    maskImage[MASK_NODE_KEY] = true
    maskImage.customType = MASK_NODE_LABEL
    maskImage.name = MASK_NODE_LABEL
    maskImage.set?.({
      locked: true,
      editable: false,
      draggable: false,
      hittable: false,
      hitSelf: false,
      hitChildren: false
    })

    return maskImage
  }

  /**
   * 删除旧遮罩图，保证画布中只有一张底图遮罩。
   *
   * @returns {void}
   */
  const removeMaskImages = () => {
    const masks = (editor?.contentLayer?.children ?? []).filter((child) => child?.[MASK_NODE_KEY])

    masks.forEach((mask) => mask.remove())
  }

  /**
   * 将元素移动到内容层最底部。
   *
   * @param {Object} element Leafer 元素。
   * @returns {void}
   */
  const moveElementToBottom = (element) => {
    const parent = element?.parent

    if (parent?.add) {
      parent.add(element, 0)
    }
  }

  /**
   * 格式化文件大小。
   *
   * @param {number} size 文件大小，单位 byte。
   * @returns {string} 文件大小文本。
   */
  const formatFileSize = (size) => {
    const megabyte = Number(size) / 1024 / 1024

    if (!Number.isFinite(megabyte)) {
      return '0 MB'
    }

    return `${megabyte.toFixed(2)} MB`
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
   * 添加生产文件打印区域框。
   *
   * @returns {void}
   */
  const addPrintArea = () => {
    if (!editor) {
      return
    }

    const bounds = getArtboardBounds()
    const width = Math.min(normalizePixelForUI(printAreaWidth.value, 1), bounds.width)
    const height = Math.min(normalizePixelForUI(printAreaHeight.value, 1), bounds.height)
    const printArea = new Rect({
      x: bounds.x + (bounds.width - width) / 2,
      y: bounds.y + (bounds.height - height) / 2,
      width,
      height,
      fill: 'rgba(124, 58, 237, 0.16)',
      stroke: '#7c3aed',
      strokeWidth: 2,
      editable: true,
      draggable: true,
      lockRatio: false
    })

    printArea[PRINT_AREA_NODE_KEY] = true
    printArea.customType = PRINT_AREA_NODE_LABEL
    printArea.name = PRINT_AREA_NODE_LABEL
    editor.contentLayer?.add(printArea)
    activePrintArea = printArea
    syncPrintAreaControls(printArea)
    editor.select(printArea)
    editor.artboard?.syncAllElements?.()
  }

  /**
   * 删除当前画布中的打印区域框。
   *
   * @returns {void}
   */
  const deletePrintArea = () => {
    if (!editor) {
      return
    }

    const printAreas = (editor.contentLayer?.children ?? []).filter((child) => {
      return child?.[PRINT_AREA_NODE_KEY]
    })

    printAreas.forEach((printArea) => printArea.remove())
    activePrintArea = null
    editor.deselect()
    editor.artboard?.syncAllElements?.()
  }

  /**
   * 将输入框中的像素尺寸同步到当前打印区域框。
   *
   * @returns {void}
   */
  const updatePrintAreaSize = () => {
    if (!activePrintArea?.parent) {
      return
    }

    activePrintArea.set?.({
      width: normalizePixelForUI(printAreaWidth.value, 1),
      height: normalizePixelForUI(printAreaHeight.value, 1)
    })
    activePrintArea.forceUpdate?.()
    activePrintArea.updateLayout?.()
    editor?.select(activePrintArea)
    editor?.artboard?.syncAllElements?.()
  }

  /**
   * 根据打印区域节点同步工具面板输入。
   *
   * @param {Object} printArea 打印区域节点。
   * @returns {void}
   */
  const syncPrintAreaControls = (printArea) => {
    printAreaWidth.value = normalizePixelForUI(printArea.width ?? printArea.__?.width, 1)
    printAreaHeight.value = normalizePixelForUI(printArea.height ?? printArea.__?.height, 1)
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

  /**
   * 将画板垂直/水平居中到当前可视区域。
   *
   * @returns {void}
   */
  const centerArtboard = () => {
    editor?.centerArtboard()
  }

  onMounted(initCanvas)
  onBeforeUnmount(destroyCanvas)
  watch(fontSize, (nextFontSize, previousFontSize) => {
    if (isSyncingTextControls) {
      return
    }

    if (lineHeight.value === getDefaultLineHeight(previousFontSize)) {
      lineHeight.value = getDefaultLineHeight(nextFontSize)
    }
  })
  watch([printAreaWidth, printAreaHeight], updatePrintAreaSize)
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
    maskInputRef,
    zoom,
    zoomPercent,
    textValue,
    watermarkValue,
    artboardWidth,
    artboardHeight,
    printAreaWidth,
    printAreaHeight,
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
    layerMenu,
    maskConfirmDialog,
    maskConfirmSizeText,
    artboardMillimeterSize,
    printAreaMillimeterSize,
    fontOptions,
    openImagePicker,
    handleImageChange,
    openMaskImagePicker,
    handleMaskImageChange,
    confirmAddMaskImage,
    cancelAddMaskImage,
    addText,
    addPrintArea,
    deletePrintArea,
    addWatermark,
    deleteWatermark,
    updateArtboardSize,
    handleCanvasDoubleClick,
    runLayerAction,
    closeLayerMenu,
    zoomIn,
    zoomOut,
    resetZoom,
    centerArtboard
  }
}
