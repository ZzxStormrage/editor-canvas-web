import { computed, ref, watch } from 'vue'

import { pictureApi } from '../../api/index.js'
import { formatMillimeter, pixelToMillimeter } from '../../canvas-editor-core/src/utils/unit.js'
import { resolveContainedImagePlacement } from './artboard-image-placement.js'
import { normalizePixelForUI } from './editor-ui-utils.js'

const BACKGROUND_NODE_KEY = '__eleEditorBackground'
const LEGACY_MASK_NODE_KEY = '__eleEditorMask'
const BACKGROUND_NODE_LABEL = '背景图'
const BACKGROUND_VIEWPORT_RATIO = 0.8

/**
 * 管理画板尺寸、背景图和打印区域。
 *
 * 业务节点仍通过 Editor 外观提供的 contentLayer、artboard 和 image API 创建，
 * 不跨层引用底层插件实现。
 *
 * @param {() => import('../../canvas-editor-core/src/core/Editor.js').Editor | null} getEditor 获取编辑器实例。
 * @param {((message: string, type: 'success' | 'error') => void) | null} notify
 * 消息通知方法。
 * @returns {Object} 画板状态和操作。
 */
export function useArtboardControls(getEditor, notify = null) {
  const backgroundInputRef = ref(null)
  const backgroundUploading = ref(false)
  const maskInputRef = ref(null)
  const maskUploading = ref(false)
  const printAreaDetecting = ref(false)
  const printAreaAvailable = ref(false)
  const productionAreaPreviewEnabled = ref(false)
  const artboardWidth = ref(375)
  const artboardHeight = ref(667)
  const printAreaX = ref(38)
  const printAreaY = ref(234)
  const printAreaWidth = ref(300)
  const printAreaHeight = ref(200)
  let isSyncingPrintArea = false
  let roleImageReplacement = null

  const artboardMillimeterSize = computed(() => formatMillimeterSize(artboardWidth.value, artboardHeight.value))
  const printAreaMillimeterSize = computed(() => formatMillimeterSize(printAreaWidth.value, printAreaHeight.value))

  /** @returns {{ x: number, y: number, width: number, height: number }} */
  function getArtboardBounds() {
    const editor = getEditor()

    return editor?.artboard?.getContentBounds?.() ?? {
      x: 0,
      y: 0,
      width: editor?.state?.width ?? 0,
      height: editor?.state?.height ?? 0
    }
  }

  /** @returns {void} */
  function syncArtboardControls() {
    const bounds = getArtboardBounds()

    artboardWidth.value = normalizePixelForUI(bounds.width, 120)
    artboardHeight.value = normalizePixelForUI(bounds.height, 120)
  }

  /** @returns {void} */
  function updateArtboardSize() {
    const editor = getEditor()

    if (!editor) {
      return
    }

    editor.setArtboardSize(
      normalizePixelForUI(artboardWidth.value, 120),
      normalizePixelForUI(artboardHeight.value, 120)
    )
    syncArtboardControls()
  }

  /** @returns {void} */
  function openBackgroundImagePicker() {
    if (!backgroundUploading.value) {
      roleImageReplacement = null
      backgroundInputRef.value?.click()
    }
  }

  /**
   * @param {Event} event 文件选择事件。
   * @returns {Promise<void>}
   */
  async function handleBackgroundImageChange(event) {
    const [file] = event.target.files ?? []
    const editor = getEditor()
    const replacement = takeRoleImageReplacement('background')

    event.target.value = ''

    if (!file || !editor || backgroundUploading.value) {
      return
    }

    backgroundUploading.value = true

    try {
      if (replacement) {
        await replaceRoleImage(file, replacement)
      } else {
        await addBackgroundImage(file)
      }
      notify?.(`背景图${replacement ? '替换' : '上传'}成功`, 'success')
    } catch (error) {
      console.error('Background image upload failed.', error)
      notify?.(error.message || `背景图${replacement ? '替换' : '上传'}失败。`, 'error')
    } finally {
      backgroundUploading.value = false
    }
  }

  /**
   * 背景图使用图片原始像素作为画板尺寸，并占当前工作区可用区域的 80% 居中显示。
   *
   * @param {File} file 图片文件。
   * @returns {Promise<void>}
   */
  async function addBackgroundImage(file) {
    const editor = getEditor()

    if (!editor) {
      return
    }

    const imageSize = await editor.image.getSize(file)
    const imageUrl = await pictureApi.upload(file)
    const currentBounds = getArtboardBounds()
    const backgroundImage = await editor.image.add(imageUrl, {
      x: currentBounds.x,
      y: currentBounds.y,
      width: imageSize.width,
      height: imageSize.height,
      lockRatio: false,
      visible: false,
      select: false
    })

    editor.setArtboardSize(imageSize.width, imageSize.height)
    syncArtboardControls()

    const backgroundBounds = getArtboardBounds()
    backgroundImage.set?.({
      x: backgroundBounds.x,
      y: backgroundBounds.y,
      width: backgroundBounds.width,
      height: backgroundBounds.height,
      lockRatio: false,
      visible: false
    })

    markBackgroundNode(editor, backgroundImage)
    moveElementToBottom(backgroundImage)
    editor.deselect()
    editor.fitArtboardToView({
      viewportRatio: BACKGROUND_VIEWPORT_RATIO,
      expandZoomRange: true
    })
    removeBackgroundImages(editor, backgroundImage)
    backgroundImage.visible = true
    backgroundImage.forceUpdate?.()
    backgroundImage.updateLayout?.()
    editor.artboard?.syncAllElements?.()
  }

  /** @returns {void} */
  function openMaskImagePicker() {
    if (!maskUploading.value) {
      roleImageReplacement = null
      maskInputRef.value?.click()
    }
  }

  /**
   * 上传遮罩图并自动写入 image.role = mask 自定义属性。
   *
   * @param {Event} event 文件选择事件。
   * @returns {Promise<void>}
   */
  async function handleMaskImageChange(event) {
    const [file] = event.target.files ?? []
    const replacement = takeRoleImageReplacement('mask')

    event.target.value = ''
    if (!file || maskUploading.value || !getEditor()) {
      return
    }

    maskUploading.value = true
    try {
      if (replacement) {
        await replaceRoleImage(file, replacement)
      } else {
        await addMaskImage(file)
      }
      notify?.(`遮罩图${replacement ? '替换' : '上传'}成功`, 'success')
    } catch (error) {
      console.error('Mask image upload failed.', error)
      notify?.(error.message || `遮罩图${replacement ? '替换' : '上传'}失败。`, 'error')
    } finally {
      maskUploading.value = false
    }
  }

  /**
   * 遮罩图等比完整放入当前画板并居中，不改变画板尺寸或图片比例。
   *
   * @param {File} file 遮罩图片文件。
   * @returns {Promise<void>}
   */
  async function addMaskImage(file) {
    const editor = getEditor()

    if (!editor) {
      return
    }

    const imageSize = await editor.image.getSize(file)
    const imageUrl = await pictureApi.upload(file)
    const bounds = getArtboardBounds()
    const placement = resolveContainedImagePlacement(imageSize, bounds)
    const maskImage = await editor.image.add(imageUrl, {
      ...placement,
      lockRatio: true,
      visible: false,
      select: false
    })

    editor.markImageAsMask(maskImage, file)
    maskImage.visible = true
    maskImage.forceUpdate?.()
    maskImage.updateLayout?.()
    editor.select(maskImage)
    editor.artboard?.syncAllElements?.()
  }

  /**
   * 打开已配置背景图或遮罩图的替换选择器。
   *
   * 替换入口保持原节点、层级、尺寸和业务属性，不复用“重新上传并新建节点”的流程。
   *
   * @param {'background' | 'mask'} role 图片用途。
   * @returns {boolean} 是否成功打开文件选择器。
   */
  function openRoleImageReplacementPicker(role) {
    const editor = getEditor()
    const target = editor?.getElementsByRole?.(role)?.at(-1) ?? null
    const input = role === 'background' ? backgroundInputRef.value : maskInputRef.value
    const uploading = role === 'background' ? backgroundUploading.value : maskUploading.value

    if (!target || !input || uploading || !['background', 'mask'].includes(role)) {
      return false
    }

    roleImageReplacement = { role, target }
    input.click()
    return true
  }

  /**
   * 上传并替换指定生产图片。背景图保持原外框；遮罩图按新图比例等比适配原外框。
   *
   * @param {File} file 新图片文件。
   * @param {{ role: 'background' | 'mask', target: Object }} replacement 替换目标。
   * @returns {Promise<void>}
   */
  async function replaceRoleImage(file, replacement) {
    const editor = getEditor()

    if (!editor) {
      return
    }

    const imageUrl = await pictureApi.upload(file)
    const isMask = replacement.role === 'mask'
    await editor.replaceImage(replacement.target, imageUrl, {
      allowLocked: true,
      fit: isMask ? 'contain' : 'stretch',
      preserveFrame: !isMask
    })

    if (isMask) {
      editor.markImageAsMask(replacement.target, file)
    }
  }

  /**
   * 取出当前角色的替换任务，文件选择完成后立即清空，避免后续上传误替换。
   *
   * @param {'background' | 'mask'} role 图片用途。
   * @returns {{ role: 'background' | 'mask', target: Object } | null} 替换任务。
   */
  function takeRoleImageReplacement(role) {
    const replacement = roleImageReplacement?.role === role ? roleImageReplacement : null
    roleImageReplacement = null
    return replacement
  }

  /** @returns {void} */
  function addPrintArea() {
    const editor = getEditor()

    if (!editor) {
      return
    }

    editor.createPrintArea({
      x: normalizeFiniteForUI(printAreaX.value, 0),
      y: normalizeFiniteForUI(printAreaY.value, 0),
      width: normalizePixelForUI(printAreaWidth.value, 1),
      height: normalizePixelForUI(printAreaHeight.value, 1)
    })
    syncPrintAreaControls()
  }

  /** @returns {void} */
  function deletePrintArea() {
    const editor = getEditor()

    if (!editor) {
      return
    }

    editor.removePrintArea()
  }

  /**
   * 切换仅查看生产文件区域的非破坏预览。
   *
   * @returns {boolean} 切换后的开启状态。
   */
  function toggleProductionAreaPreview() {
    const editor = getEditor()

    if (!editor || !printAreaAvailable.value) {
      notify?.('请先创建生产文件区域。', 'error')
      return false
    }

    try {
      editor.toggleProductionAreaPreview()
      syncProductionAreaPreview()
      return productionAreaPreviewEnabled.value
    } catch (error) {
      console.error('Production area preview toggle failed.', error)
      notify?.(error.message || '生产文件区域预览切换失败。', 'error')
      return false
    }
  }

  /**
   * 同步生产文件区域预览开关。
   *
   * @param {boolean} [enabled] 事件提供的最新状态。
   * @returns {void}
   */
  function syncProductionAreaPreview(enabled) {
    productionAreaPreviewEnabled.value = arguments.length > 0
      ? enabled === true
      : getEditor()?.isProductionAreaPreviewEnabled?.() === true
  }

  /**
   * 将当前单选图片或文字对齐到打印区域。
   *
   * @param {'left' | 'horizontal-center' | 'right' | 'top' | 'vertical-center' | 'bottom'} alignment
   * 对齐方式。
   * @returns {boolean} 是否执行了对齐。
   */
  function alignSelectedToPrintArea(alignment) {
    const editor = getEditor()

    if (!editor || !printAreaAvailable.value) {
      notify?.('请先在画布面板创建生产文件区域。', 'error')
      return false
    }

    try {
      editor.alignSelectionToPrintArea(alignment)
      return true
    } catch (error) {
      console.error('Print area alignment failed.', error)
      notify?.(error.message || '元素对齐失败。', 'error')
      return false
    }
  }

  /**
   * 根据遮罩透明区域自动创建或更新打印区域。
   *
   * @returns {Promise<void>}
   */
  async function detectPrintAreaFromMask() {
    const editor = getEditor()

    if (!editor || printAreaDetecting.value) {
      return
    }

    printAreaDetecting.value = true
    try {
      const properties = await editor.detectPrintAreaFromMask({ alphaThreshold: 10 })
      syncPrintAreaControls(properties)
      notify?.('生产文件区域识别完成', 'success')
    } catch (error) {
      console.error('Mask detection failed.', error)
      notify?.(error.message || '生产文件区域识别失败。', 'error')
    } finally {
      printAreaDetecting.value = false
    }
  }

  /**
   * 截取打印区域，转成 File，通过图片接口上传并返回接口结果。
   *
   * @param {Object} [options={}] 截图选项，默认排除背景图和遮罩图。
   * @returns {Promise<*>} 图片上传接口结果。
   */
  async function capturePrintArea(options = {}) {
    const editor = getEditor()

    if (!editor) {
      throw new Error('编辑器尚未初始化。')
    }

    return editor.capturePrintArea({
      includeBackground: false,
      includeMask: false,
      type: 'image/png',
      quality: 1,
      ...options,
      upload: options.upload ?? pictureApi.upload
    })
  }

  /**
   * 截取完整画板，转成 File，通过图片接口上传并返回接口结果。
   *
   * @param {Object} [options={}] 截图选项，默认包含背景图和遮罩图。
   * @returns {Promise<*>} 图片上传接口结果。
   */
  async function captureCanvas(options = {}) {
    const editor = getEditor()

    if (!editor) {
      throw new Error('编辑器尚未初始化。')
    }

    return editor.captureCanvas({
      includeBackground: true,
      includeMask: true,
      type: 'image/png',
      quality: 1,
      ...options,
      upload: options.upload ?? pictureApi.upload
    })
  }

  /** @returns {void} */
  function updatePrintArea() {
    const editor = getEditor()

    if (!editor || isSyncingPrintArea || !editor.getPrintAreaProperties()) {
      return
    }

    editor.updatePrintArea({
      x: normalizeFiniteForUI(printAreaX.value, 0),
      y: normalizeFiniteForUI(printAreaY.value, 0),
      width: normalizePixelForUI(printAreaWidth.value, 1),
      height: normalizePixelForUI(printAreaHeight.value, 1)
    })
  }

  /**
   * 同步打印区域表单。
   *
   * @param {{ x: number, y: number, width: number, height: number } | null} [properties]
   * 打印区域属性。
   * @returns {void}
   */
  function syncPrintAreaControls(properties) {
    const editor = getEditor()
    const currentProperties = arguments.length > 0
      ? properties
      : editor?.getPrintAreaProperties?.() ?? null

    printAreaAvailable.value = Boolean(currentProperties)

    if (!currentProperties) {
      productionAreaPreviewEnabled.value = false
      return
    }

    isSyncingPrintArea = true
    printAreaX.value = normalizeFiniteForUI(currentProperties.x, 0)
    printAreaY.value = normalizeFiniteForUI(currentProperties.y, 0)
    printAreaWidth.value = normalizePixelForUI(currentProperties.width, 1)
    printAreaHeight.value = normalizePixelForUI(currentProperties.height, 1)
    isSyncingPrintArea = false
  }

  watch(
    [printAreaX, printAreaY, printAreaWidth, printAreaHeight],
    updatePrintArea,
    { flush: 'sync' }
  )

  return {
    backgroundInputRef,
    backgroundUploading,
    maskInputRef,
    maskUploading,
    printAreaDetecting,
    printAreaAvailable,
    productionAreaPreviewEnabled,
    artboardWidth,
    artboardHeight,
    printAreaX,
    printAreaY,
    printAreaWidth,
    printAreaHeight,
    artboardMillimeterSize,
    printAreaMillimeterSize,
    getArtboardBounds,
    syncArtboardControls,
    updateArtboardSize,
    openBackgroundImagePicker,
    handleBackgroundImageChange,
    openMaskImagePicker,
    handleMaskImageChange,
    openRoleImageReplacementPicker,
    addPrintArea,
    deletePrintArea,
    toggleProductionAreaPreview,
    syncProductionAreaPreview,
    alignSelectedToPrintArea,
    detectPrintAreaFromMask,
    capturePrintArea,
    captureCanvas,
    syncPrintAreaControls
  }
}

/**
 * @param {Object} editor Editor 外观实例。
 * @param {Object} backgroundImage Leafer 图片节点。
 */
function markBackgroundNode(editor, backgroundImage) {
  backgroundImage[BACKGROUND_NODE_KEY] = true
  backgroundImage.customType = BACKGROUND_NODE_LABEL
  backgroundImage.name = BACKGROUND_NODE_LABEL
  backgroundImage.set?.({
    locked: true,
    hittable: false,
    hitSelf: false,
    hitChildren: false
  })

  const attributes = editor.elementData?.get(backgroundImage) ?? {}
  editor.elementData?.set(backgroundImage, {
    ...attributes,
    image: {
      ...(attributes.image ?? {}),
      role: 'background'
    }
  }, { replace: true })
}

/**
 * @param {Object} editor Editor 外观实例。
 * @param {Object} [keep] 本次新建的背景图。
 */
function removeBackgroundImages(editor, keep) {
  const backgrounds = (editor.contentLayer?.children ?? []).filter((child) => {
    if (child === keep) {
      return false
    }

    const attributes = editor.elementData?.get(child) ?? {}
    return child?.[BACKGROUND_NODE_KEY]
      || child?.[LEGACY_MASK_NODE_KEY]
      || attributes.image?.role === 'background'
  })

  backgrounds.forEach((background) => background.remove())
}

/** @param {Object} element Leafer 元素。 */
function moveElementToBottom(element) {
  element?.parent?.add?.(element, 0)
}

/** @returns {string} */
function formatMillimeterSize(width, height) {
  return `${formatMillimeter(pixelToMillimeter(width))} × ${formatMillimeter(pixelToMillimeter(height))} mm`
}

/** @returns {number} */
function normalizeFiniteForUI(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Number(number.toFixed(2)) : fallback
}
