import { ref } from 'vue'

import { pictureApi } from '../../api/index.js'

const WATERMARK_NODE_KEY = '__eleEditorWatermark'

/**
 * 管理普通图片和水印等素材业务。
 *
 * @param {() => import('../../canvas-editor-core/src/core/Editor.js').Editor | null} getEditor 获取编辑器实例。
 * @param {() => { x: number, y: number, width: number, height: number }} getArtboardBounds 获取画板边界。
 * @param {import('vue').Ref<string>} fontFamily 当前字体。
 * @param {((message: string, type: 'success' | 'error') => void) | null} notify 消息通知方法。
 * @returns {Object} 素材状态和操作。
 */
export function useAssetControls(getEditor, getArtboardBounds, fontFamily, notify = null) {
  const imageInputRef = ref(null)
  const imageUploading = ref(false)
  const watermarkValue = ref('')
  let addingWatermark = false

  /** @returns {boolean} 是否正在批量创建水印。 */
  function isAddingWatermark() {
    return addingWatermark
  }

  /** @returns {void} */
  function openImagePicker() {
    if (!imageUploading.value) {
      imageInputRef.value?.click()
    }
  }

  /**
   * @param {Event} event 文件选择事件。
   * @returns {Promise<void>}
   */
  async function handleImageChange(event) {
    const [file] = event.target.files ?? []
    const editor = getEditor()

    event.target.value = ''

    if (!file || !editor || imageUploading.value) {
      return
    }

    imageUploading.value = true

    try {
      const imageUrl = await pictureApi.upload(file)
      await editor.image.add(imageUrl)
      notify?.('图片上传成功', 'success')
    } catch (error) {
      console.error('Image upload failed.', error)
      notify?.(error.message || '图片上传失败。', 'error')
    } finally {
      imageUploading.value = false
    }
  }

  /**
   * 创建覆盖画板的不可编辑水印节点。
   *
   * @returns {Promise<void>}
   */
  async function addWatermark() {
    const editor = getEditor()

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

    addingWatermark = true

    try {
      for (
        let y = startY, rowIndex = 0;
        y < artboardBounds.y + artboardBounds.height + rowGap;
        y += rowGap, rowIndex += 1
      ) {
        const offsetX = rowIndex % 2 === 0 ? 0 : columnGap / 2

        for (let x = startX - offsetX; x < artboardBounds.x + artboardBounds.width + columnGap; x += columnGap) {
          tasks.push(
            editor.text
              .add(content, {
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
              })
              .then(markWatermarkNode)
          )
        }
      }

      await Promise.all(tasks)
      editor.deselect()
    } finally {
      addingWatermark = false
    }
  }

  /** @returns {void} */
  function deleteWatermark() {
    const editor = getEditor()

    if (!editor) {
      return
    }

    const watermarks = (editor.contentLayer?.children ?? []).filter((child) => child?.[WATERMARK_NODE_KEY])

    watermarks.forEach((watermark) => watermark.remove())
    editor.deselect()
  }

  return {
    imageInputRef,
    imageUploading,
    watermarkValue,
    isAddingWatermark,
    openImagePicker,
    handleImageChange,
    addWatermark,
    deleteWatermark
  }
}

/**
 * 给水印节点打业务标记，便于批量删除。
 *
 * @param {Object} watermark Leafer 文本节点。
 * @returns {Object} 原节点。
 */
function markWatermarkNode(watermark) {
  watermark[WATERMARK_NODE_KEY] = true
  return watermark
}
