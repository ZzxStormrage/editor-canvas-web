import { Rect } from 'leafer-ui'
import { computed, ref, watch } from 'vue'

import { pictureApi } from '../../api/index.js'
import { formatMillimeter, pixelToMillimeter } from '../../canvas-editor-core/src/utils/unit.js'
import { normalizePixelForUI } from './editor-ui-utils.js'

const BACKGROUND_NODE_KEY = '__eleEditorBackground'
const LEGACY_MASK_NODE_KEY = '__eleEditorMask'
const BACKGROUND_NODE_LABEL = '背景图'
const BACKGROUND_VIEWPORT_RATIO = 0.8
const PRINT_AREA_NODE_KEY = '__eleEditorPrintArea'
const PRINT_AREA_NODE_LABEL = '打印区域'

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
  const artboardWidth = ref(375)
  const artboardHeight = ref(667)
  const printAreaWidth = ref(300)
  const printAreaHeight = ref(200)
  let activePrintArea = null

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

    event.target.value = ''

    if (!file || !editor || backgroundUploading.value) {
      return
    }

    backgroundUploading.value = true

    try {
      await addBackgroundImage(file)
      notify?.('背景图上传成功', 'success')
    } catch (error) {
      console.error('Background image upload failed.', error)
      notify?.(error.message || '背景图上传失败。', 'error')
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
  function addPrintArea() {
    const editor = getEditor()

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
    editor.elementData?.set(printArea, {})
    editor.contentLayer?.add(printArea)
    activePrintArea = printArea
    syncPrintAreaControls(printArea)
    editor.select(printArea)
    editor.artboard?.syncAllElements?.()
  }

  /** @returns {void} */
  function deletePrintArea() {
    const editor = getEditor()

    if (!editor) {
      return
    }

    const printAreas = (editor.contentLayer?.children ?? []).filter((child) => child?.[PRINT_AREA_NODE_KEY])

    printAreas.forEach((printArea) => printArea.remove())
    activePrintArea = null
    editor.deselect()
    editor.artboard?.syncAllElements?.()
  }

  /** @returns {void} */
  function updatePrintAreaSize() {
    if (!activePrintArea?.parent) {
      return
    }

    activePrintArea.set?.({
      width: normalizePixelForUI(printAreaWidth.value, 1),
      height: normalizePixelForUI(printAreaHeight.value, 1)
    })
    activePrintArea.forceUpdate?.()
    activePrintArea.updateLayout?.()
    getEditor()?.select(activePrintArea)
    getEditor()?.artboard?.syncAllElements?.()
  }

  /** @param {Object} printArea 打印区域节点。 */
  function syncPrintAreaControls(printArea) {
    printAreaWidth.value = normalizePixelForUI(printArea.width ?? printArea.__?.width, 1)
    printAreaHeight.value = normalizePixelForUI(printArea.height ?? printArea.__?.height, 1)
  }

  watch([printAreaWidth, printAreaHeight], updatePrintAreaSize)

  return {
    backgroundInputRef,
    backgroundUploading,
    artboardWidth,
    artboardHeight,
    printAreaWidth,
    printAreaHeight,
    artboardMillimeterSize,
    printAreaMillimeterSize,
    getArtboardBounds,
    syncArtboardControls,
    updateArtboardSize,
    openBackgroundImagePicker,
    handleBackgroundImageChange,
    addPrintArea,
    deletePrintArea
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
  return `${formatMillimeter(pixelToMillimeter(width))} x ${formatMillimeter(pixelToMillimeter(height))} mm`
}
