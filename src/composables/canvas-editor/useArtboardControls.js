import { Rect } from 'leafer-ui'
import { computed, ref, watch } from 'vue'

import { formatMillimeter, pixelToMillimeter } from '../../canvas-editor-core/src/utils/unit.js'
import { normalizePixelForUI } from './editor-ui-utils.js'

const MASK_NODE_KEY = '__eleEditorMask'
const MASK_NODE_LABEL = '遮罩图'
const PRINT_AREA_NODE_KEY = '__eleEditorPrintArea'
const PRINT_AREA_NODE_LABEL = '打印区域'

/**
 * 管理画板尺寸、遮罩底图和打印区域。
 *
 * 业务节点仍通过 Editor 外观提供的 contentLayer、artboard 和 image API 创建，
 * 不跨层引用底层插件实现。
 *
 * @param {() => import('../../canvas-editor-core/src/core/Editor.js').Editor | null} getEditor 获取编辑器实例。
 * @returns {Object} 画板状态和操作。
 */
export function useArtboardControls(getEditor) {
  const maskInputRef = ref(null)
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
  function openMaskImagePicker() {
    maskInputRef.value?.click()
  }

  /**
   * @param {Event} event 文件选择事件。
   * @returns {Promise<void>}
   */
  async function handleMaskImageChange(event) {
    const [file] = event.target.files ?? []

    event.target.value = ''

    if (!file || !getEditor()) {
      return
    }

    await addMaskImage(file)
  }

  /**
   * 遮罩图属于画板背景业务节点：替换旧节点、铺满当前画板、锁定并置底。
   *
   * @param {File} file 图片文件。
   * @returns {Promise<void>}
   */
  async function addMaskImage(file) {
    const editor = getEditor()

    if (!editor) {
      return
    }

    removeMaskImages(editor)
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
    maskInputRef,
    artboardWidth,
    artboardHeight,
    printAreaWidth,
    printAreaHeight,
    artboardMillimeterSize,
    printAreaMillimeterSize,
    getArtboardBounds,
    syncArtboardControls,
    updateArtboardSize,
    openMaskImagePicker,
    handleMaskImageChange,
    addPrintArea,
    deletePrintArea
  }
}

/** @param {Object} maskImage Leafer 图片节点。 */
function markMaskNode(maskImage) {
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
}

/** @param {Object} editor Editor 外观实例。 */
function removeMaskImages(editor) {
  const masks = (editor.contentLayer?.children ?? []).filter((child) => child?.[MASK_NODE_KEY])

  masks.forEach((mask) => mask.remove())
}

/** @param {Object} element Leafer 元素。 */
function moveElementToBottom(element) {
  element?.parent?.add?.(element, 0)
}

/** @returns {string} */
function formatMillimeterSize(width, height) {
  return `${formatMillimeter(pixelToMillimeter(width))} x ${formatMillimeter(pixelToMillimeter(height))} mm`
}
