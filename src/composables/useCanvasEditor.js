import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

import { createEditor } from '../canvas-editor-core/src/index.js'
import { useArtboardControls } from './canvas-editor/useArtboardControls.js'
import { useAssetControls } from './canvas-editor/useAssetControls.js'
import { useElementDataControls } from './canvas-editor/useElementDataControls.js'
import { useImageControls } from './canvas-editor/useImageControls.js'
import { useLayerMenu } from './canvas-editor/useLayerMenu.js'
import { useLayerControls } from './canvas-editor/useLayerControls.js'
import { useSelectionToolbar } from './canvas-editor/useSelectionToolbar.js'
import { useTextControls } from './canvas-editor/useTextControls.js'

/**
 * 组合应用层编辑器能力。
 *
 * 本模块只负责三件事：创建 Editor 外观实例、连接 EventBus、组合各业务
 * composable。文字、素材、画板等具体业务不再堆积在生命周期控制器中。
 *
 * @param {Object} [options={}] 应用层配置。
 * @param {((message: string, type: 'success' | 'error') => void) | null} [options.onMessage]
 * 消息通知方法。
 * @returns {Object} 编辑器状态、DOM 引用和操作方法。
 */
export function useCanvasEditor(options = {}) {
  const canvasRef = ref(null)
  const zoom = ref(1)
  const zoomPercent = computed(() => Math.round(zoom.value * 100))
  let editor = null
  let unsubscribeEvents = []

  /** @returns {import('../canvas-editor-core/src/core/Editor.js').Editor | null} */
  function getEditor() {
    return editor
  }

  /** 将底层缩放状态同步到 Vue 控件。 */
  function syncZoom() {
    if (editor) {
      zoom.value = editor.state.zoom
    }
  }

  const notify = typeof options.onMessage === 'function' ? options.onMessage : null
  const textControls = useTextControls(getEditor)
  const artboardControls = useArtboardControls(getEditor, notify)
  const assetControls = useAssetControls(
    getEditor,
    artboardControls.getArtboardBounds,
    textControls.fontFamily,
    notify
  )
  const layerMenuControls = useLayerMenu(getEditor, canvasRef)
  const selectionToolbarControls = useSelectionToolbar(getEditor, canvasRef)
  const layerControls = useLayerControls(getEditor)
  const elementDataControls = useElementDataControls(getEditor)
  const imageControls = useImageControls(getEditor)

  /**
   * 初始化编辑器并建立应用层事件桥接。
   *
   * EventBus 是 UI 与 canvas-editor-core 的唯一反向通知通道，避免 UI 读取
   * TextPlugin、ViewportManager 等内部实现。
   */
  function initCanvas() {
    if (!canvasRef.value) {
      return
    }

    editor = createEditor({
      view: canvasRef.value,
      autoResize: true
    })

    unsubscribeEvents = [
      editor.eventBus.on('text:selected', ({ options }) => {
        if (!assetControls.isAddingWatermark()) {
          textControls.applyTextOptionsToUI(options)
        }
      }),
      editor.eventBus.on('selection:toolbar-changed', (state) => {
        selectionToolbarControls.syncSelectionToolbar(state)
        if (!state?.visible) {
          layerMenuControls.hideLayerMenu()
        }
      }),
      editor.eventBus.on('selection:layer-menu-close', layerMenuControls.hideLayerMenu),
      editor.eventBus.on('image:selection-changed', ({ properties }) => {
        imageControls.syncImageProperties(properties)
        selectionToolbarControls.syncSelectionToolbar()
      }),
      editor.eventBus.on('production:print-area-changed', ({ properties }) => {
        artboardControls.syncPrintAreaControls(properties)
      }),
      editor.eventBus.on('viewport:zoom-changed', ({ zoom: nextZoom }) => {
        zoom.value = nextZoom
        selectionToolbarControls.syncSelectionToolbar()
      }),
      editor.eventBus.on('viewport:transform-end', () => {
        selectionToolbarControls.syncSelectionToolbar()
      }),
      editor.eventBus.on('canvas:resized', () => {
        selectionToolbarControls.syncSelectionToolbar()
      }),
      editor.eventBus.on('artboard:resized', () => {
        artboardControls.syncArtboardControls()
        artboardControls.syncPrintAreaControls()
        imageControls.syncImageProperties()
      }),
      editor.eventBus.on('layers:changed', ({ layers }) => {
        layerControls.setLayers(layers)
        imageControls.syncImageProperties()
        selectionToolbarControls.syncSelectionToolbar()
      })
    ]

    selectionToolbarControls.startSelectionToolbar()
    syncZoom()
    artboardControls.syncArtboardControls()
    artboardControls.syncPrintAreaControls()
    layerControls.refreshLayers()
    imageControls.syncImageProperties()
  }

  /** 销毁事件桥接及 Editor 管理的全部 Leafer 资源。 */
  function destroyCanvas() {
    unsubscribeEvents.forEach((unsubscribe) => unsubscribe())
    unsubscribeEvents = []
    selectionToolbarControls.stopSelectionToolbar()
    editor?.destroy()
    editor = null
  }

  /** 放大画布。 */
  function zoomIn() {
    editor?.zoomIn()
    syncZoom()
  }

  /** 缩小画布。 */
  function zoomOut() {
    editor?.zoomOut()
    syncZoom()
  }

  /** 恢复默认缩放。 */
  function resetZoom() {
    editor?.resetZoom()
    syncZoom()
  }

  /** 不改变缩放，仅将画板移动到视口中心。 */
  function centerArtboard() {
    editor?.centerArtboard()
  }

  onMounted(initCanvas)
  onBeforeUnmount(destroyCanvas)

  return {
    getEditor,
    canvasRef,
    zoom,
    zoomPercent,
    textValue: textControls.textValue,
    fontFamily: textControls.fontFamily,
    fontSize: textControls.fontSize,
    fontWeight: textControls.fontWeight,
    textColor: textControls.textColor,
    textAlign: textControls.textAlign,
    letterSpacing: textControls.letterSpacing,
    lineHeight: textControls.lineHeight,
    italic: textControls.italic,
    underline: textControls.underline,
    lineThrough: textControls.lineThrough,
    writingMode: textControls.writingMode,
    fontOptions: textControls.fontOptions,
    addText: textControls.addText,
    handleCanvasDoubleClick: textControls.handleCanvasDoubleClick,
    backgroundInputRef: artboardControls.backgroundInputRef,
    backgroundUploading: artboardControls.backgroundUploading,
    maskInputRef: artboardControls.maskInputRef,
    maskUploading: artboardControls.maskUploading,
    printAreaDetecting: artboardControls.printAreaDetecting,
    artboardWidth: artboardControls.artboardWidth,
    artboardHeight: artboardControls.artboardHeight,
    printAreaX: artboardControls.printAreaX,
    printAreaY: artboardControls.printAreaY,
    printAreaWidth: artboardControls.printAreaWidth,
    printAreaHeight: artboardControls.printAreaHeight,
    artboardMillimeterSize: artboardControls.artboardMillimeterSize,
    printAreaMillimeterSize: artboardControls.printAreaMillimeterSize,
    updateArtboardSize: artboardControls.updateArtboardSize,
    openBackgroundImagePicker: artboardControls.openBackgroundImagePicker,
    handleBackgroundImageChange: artboardControls.handleBackgroundImageChange,
    openMaskImagePicker: artboardControls.openMaskImagePicker,
    handleMaskImageChange: artboardControls.handleMaskImageChange,
    addPrintArea: artboardControls.addPrintArea,
    deletePrintArea: artboardControls.deletePrintArea,
    detectPrintAreaFromMask: artboardControls.detectPrintAreaFromMask,
    capturePrintArea: artboardControls.capturePrintArea,
    imageInputRef: assetControls.imageInputRef,
    imageUploading: assetControls.imageUploading,
    imageProperties: imageControls.imageProperties,
    watermarkValue: assetControls.watermarkValue,
    openImagePicker: assetControls.openImagePicker,
    handleImageChange: assetControls.handleImageChange,
    updateSelectedImageProperties: imageControls.updateSelectedImageProperties,
    resetSelectedImageSize: imageControls.resetSelectedImageSize,
    addWatermark: assetControls.addWatermark,
    deleteWatermark: assetControls.deleteWatermark,
    layerMenu: layerMenuControls.layerMenu,
    selectionToolbar: selectionToolbarControls.selectionToolbar,
    toggleSelectionLock: selectionToolbarControls.toggleSelectionLock,
    duplicateSelection: selectionToolbarControls.duplicateSelection,
    deleteSelection: selectionToolbarControls.deleteSelection,
    groupSelection: selectionToolbarControls.groupSelection,
    ungroupSelection: selectionToolbarControls.ungroupSelection,
    toggleSelectionLayerMenu: layerMenuControls.toggleLayerMenu,
    runLayerAction: layerMenuControls.runLayerAction,
    closeLayerMenu: layerMenuControls.closeLayerMenu,
    layers: layerControls.layers,
    draggingLayer: layerControls.draggingLayer,
    startLayerDrag: layerControls.startLayerDrag,
    endLayerDrag: layerControls.endLayerDrag,
    selectLayer: layerControls.selectLayer,
    deleteLayer: layerControls.deleteLayer,
    toggleLayerLock: layerControls.toggleLayerLock,
    toggleLayerPointerThrough: layerControls.toggleLayerPointerThrough,
    hoverLayer: layerControls.hoverLayer,
    getSelectedElementAttributes: elementDataControls.getSelectedElementAttributes,
    setSelectedElementAttributes: elementDataControls.setSelectedElementAttributes,
    removeSelectedElementAttributes: elementDataControls.removeSelectedElementAttributes,
    clearSelectedElementAttributes: elementDataControls.clearSelectedElementAttributes,
    exportElementAttributes: elementDataControls.exportElementAttributes,
    getElementAttributesById: elementDataControls.getElementAttributesById,
    setElementAttributesById: elementDataControls.setElementAttributesById,
    removeElementAttributesById: elementDataControls.removeElementAttributesById,
    zoomIn,
    zoomOut,
    resetZoom,
    centerArtboard
  }
}
