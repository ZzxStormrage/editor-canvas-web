import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

import { createEditor } from '../canvas-editor-core/src/index.js'
import { useArtboardControls } from './canvas-editor/useArtboardControls.js'
import { useAssetControls } from './canvas-editor/useAssetControls.js'
import { useCanvasPan } from './canvas-editor/useCanvasPan.js'
import { useElementDataControls } from './canvas-editor/useElementDataControls.js'
import { useImageControls } from './canvas-editor/useImageControls.js'
import { useLayerMenu } from './canvas-editor/useLayerMenu.js'
import { useLayerControls } from './canvas-editor/useLayerControls.js'
import { useMaterialGroupControls } from './canvas-editor/useMaterialGroupControls.js'
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
  const ready = ref(false)
  const initializationError = ref(null)
  const zoom = ref(1)
  const zoomPercent = computed(() => Math.round(zoom.value * 100))
  const canUndo = ref(false)
  const canRedo = ref(false)
  const historyBusy = ref(false)
  const activeAttributeElementId = ref(null)
  let editor = null
  let unsubscribeEvents = []
  const readyWaiters = new Set()

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

  /** @param {{ canUndo?: boolean, canRedo?: boolean, restoring?: boolean }} state 历史状态。 */
  function syncHistoryState(state = {}) {
    canUndo.value = state.canUndo === true
    canRedo.value = state.canRedo === true
    historyBusy.value = state.restoring === true
  }

  const notify = typeof options.onMessage === 'function' ? options.onMessage : null
  const textControls = useTextControls(getEditor)
  const artboardControls = useArtboardControls(getEditor, notify)
  const assetControls = useAssetControls(getEditor, artboardControls.getArtboardBounds, textControls.fontFamily, notify)
  const materialGroupControls = useMaterialGroupControls(getEditor, notify)
  const layerMenuControls = useLayerMenu(getEditor, canvasRef)
  const selectionToolbarControls = useSelectionToolbar(getEditor, canvasRef)
  const layerControls = useLayerControls(getEditor)
  const elementDataControls = useElementDataControls(getEditor)
  const imageControls = useImageControls(getEditor)
  const canvasPanControls = useCanvasPan(getEditor)

  /**
   * 请求打开当前单选文字或图片的图层属性。
   *
   * @returns {boolean} 是否成功打开属性抽屉。
   */
  function openSelectedElementAttributes() {
    layerControls.refreshLayers()
    const selectedLayers = layerControls.layers.value.filter((layer) => layer.selected)
    const layer = selectedLayers.length === 1 ? selectedLayers[0] : null

    if (!layer || (layer.type !== 'text' && layer.type !== 'image')) {
      return false
    }

    if (activeAttributeElementId.value === layer.elementId) {
      closeElementAttributes()
      return true
    }

    activeAttributeElementId.value = layer.elementId
    layerMenuControls.hideLayerMenu()
    return true
  }

  /**
   * 从图层列表选中目标并打开属性抽屉。
   *
   * @param {string} layerId 图层 ID。
   * @returns {boolean} 是否成功打开属性抽屉。
   */
  function openLayerElementAttributes(layerId) {
    layerControls.selectLayer(layerId)
    return openSelectedElementAttributes()
  }

  /** @returns {void} 关闭右侧属性抽屉。 */
  function closeElementAttributes() {
    activeAttributeElementId.value = null
  }

  /**
   * 初始化编辑器并建立应用层事件桥接。
   *
   * EventBus 是 UI 与 canvas-editor-core 的唯一反向通知通道，避免 UI 读取
   * TextPlugin、ViewportManager 等内部实现。
   */
  function initCanvas() {
    if (editor || !canvasRef.value) {
      return editor
    }

    initializationError.value = null

    try {
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
        editor.eventBus.on('production:area-preview-changed', ({ enabled }) => {
          artboardControls.syncProductionAreaPreview(enabled)
        }),
        editor.eventBus.on('production:selection-aligned', () => {
          imageControls.syncImageProperties()
          selectionToolbarControls.syncSelectionToolbar()
          layerControls.refreshLayers()
        }),
        editor.eventBus.on('viewport:zoom-changed', ({ zoom: nextZoom }) => {
          zoom.value = nextZoom
          selectionToolbarControls.syncSelectionToolbar()
        }),
        editor.eventBus.on('viewport:transform-end', () => {
          selectionToolbarControls.syncSelectionToolbar()
        }),
        editor.eventBus.on('viewport:pan-changed', () => {
          selectionToolbarControls.syncSelectionToolbar()
        }),
        editor.eventBus.on('history:changed', syncHistoryState),
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
      artboardControls.syncProductionAreaPreview()
      layerControls.refreshLayers()
      imageControls.syncImageProperties()
      ready.value = true
      settleReadyWaiters('resolve', editor)
      return editor
    } catch (error) {
      unsubscribeEvents.forEach((unsubscribe) => unsubscribe())
      unsubscribeEvents = []
      selectionToolbarControls.stopSelectionToolbar()
      editor?.destroy?.()
      editor = null
      ready.value = false
      initializationError.value = error
      settleReadyWaiters('reject', error)
      notify?.(error?.message || '编辑器初始化失败。', 'error')
      return null
    }
  }

  /**
   * 等待核心编辑器完成初始化，供 iframe 消息和模板持久化流程消除挂载竞态。
   *
   * @param {number} [timeout=8000] 最长等待时间，单位毫秒。
   * @returns {Promise<import('../canvas-editor-core/src/core/Editor.js').Editor>}
   */
  function whenReady(timeout = 8000) {
    const instance = initCanvas()

    if (instance && ready.value) {
      return Promise.resolve(instance)
    }
    if (initializationError.value) {
      return Promise.reject(initializationError.value)
    }

    return new Promise((resolve, reject) => {
      const waiter = { resolve, reject, timer: 0 }
      waiter.timer = window.setTimeout(() => {
        readyWaiters.delete(waiter)
        reject(new Error('编辑器初始化超时，请确认 iframe 已显示并刷新后重试。'))
      }, timeout)
      readyWaiters.add(waiter)
    })
  }

  /** @param {'resolve' | 'reject'} action 完成方式。 @param {*} value 返回值。 */
  function settleReadyWaiters(action, value) {
    readyWaiters.forEach((waiter) => {
      window.clearTimeout(waiter.timer)
      waiter[action](value)
    })
    readyWaiters.clear()
  }

  /** 销毁事件桥接及 Editor 管理的全部 Leafer 资源。 */
  function destroyCanvas() {
    unsubscribeEvents.forEach((unsubscribe) => unsubscribe())
    unsubscribeEvents = []
    selectionToolbarControls.stopSelectionToolbar()
    editor?.destroy()
    editor = null
    ready.value = false
    syncHistoryState()
    settleReadyWaiters('reject', new Error('编辑器页面已关闭。'))
  }

  /** 同步历史恢复后的全部编辑器面板。 */
  function syncEditorPanels() {
    syncZoom()
    artboardControls.syncArtboardControls()
    artboardControls.syncPrintAreaControls()
    artboardControls.syncProductionAreaPreview()
    layerControls.refreshLayers()
    imageControls.syncImageProperties()
    selectionToolbarControls.syncSelectionToolbar()
    layerMenuControls.hideLayerMenu()
  }

  /**
   * 执行撤销或重做并同步 Vue 面板。
   *
   * @param {'undo' | 'redo'} action 历史动作。
   * @returns {Promise<boolean>} 是否恢复了一步历史。
   */
  async function runHistoryAction(action) {
    if (!editor || historyBusy.value) {
      return false
    }

    try {
      const changed = await editor[action]()
      if (changed) {
        syncEditorPanels()
      }
      return changed
    } catch (error) {
      notify?.(error?.message || '历史恢复失败。', 'error')
      return false
    }
  }

  /** @returns {Promise<boolean>} 是否撤销了一步。 */
  function undo() {
    return runHistoryAction('undo')
  }

  /** @returns {Promise<boolean>} 是否重做了一步。 */
  function redo() {
    return runHistoryAction('redo')
  }

  /**
   * 处理画布工作区快捷键。
   *
   * @param {KeyboardEvent} event 键盘事件。
   * @returns {void}
   */
  function handleWorkspaceShortcut(event) {
    if ((!event.metaKey && !event.ctrlKey) || event.altKey || isEditableTarget(event.target)) {
      return
    }

    const action = resolveWorkspaceShortcut(event)
    if (!action) {
      return
    }

    event.preventDefault()
    if (action === 'undo' || action === 'redo') {
      void (action === 'undo' ? undo() : redo())
      return
    }

    if (action === 'zoomIn') {
      zoomIn()
    } else if (action === 'zoomOut') {
      zoomOut()
    } else {
      resetZoom()
    }
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

  /**
   * 按当前容器适配并居中画板。
   *
   * @param {number | Object} [fitOptions] 画板适配选项。
   * @returns {void}
   */
  function fitArtboardToView(fitOptions) {
    editor?.fitArtboardToView(fitOptions)
    syncZoom()
  }

  /**
   * 通过核心文档插件加载统一 JSON。
   *
   * @param {string | Object} document JSON 字符串或文档对象。
   * @param {Object} [loadOptions={}] 核心加载选项。
   * @returns {Promise<Object | null>} 已加载文档。
   */
  async function loadDocument(document, loadOptions = {}) {
    if (!editor) {
      return null
    }

    const loadedDocument = await editor.loadDocument(document, loadOptions)
    syncEditorPanels()
    return loadedDocument
  }

  /** @returns {Object | null} 当前统一编辑器文档。 */
  function exportDocument() {
    return editor?.exportDocument() ?? null
  }

  watch(
    canvasRef,
    (view) => {
      canvasPanControls.setView(view)
      if (view && !editor) {
        initCanvas()
      }
    },
    { flush: 'post' }
  )

  onMounted(() => {
    canvasPanControls.start()
    initCanvas()
    window.addEventListener('keydown', handleWorkspaceShortcut)
  })
  onBeforeUnmount(() => {
    window.removeEventListener('keydown', handleWorkspaceShortcut)
    canvasPanControls.stop()
    destroyCanvas()
  })

  return {
    getEditor,
    canvasRef,
    ready,
    initializationError,
    whenReady,
    zoom,
    zoomPercent,
    canUndo,
    canRedo,
    historyBusy,
    canvasPanReady: canvasPanControls.panReady,
    canvasPanning: canvasPanControls.panning,
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
    fontListLoading: textControls.fontListLoading,
    fontOptions: textControls.fontOptions,
    loadFontList: textControls.loadFontList,
    addText: textControls.addText,
    backgroundInputRef: artboardControls.backgroundInputRef,
    backgroundUploading: artboardControls.backgroundUploading,
    maskInputRef: artboardControls.maskInputRef,
    maskUploading: artboardControls.maskUploading,
    printAreaDetecting: artboardControls.printAreaDetecting,
    printAreaAvailable: artboardControls.printAreaAvailable,
    productionAreaPreviewEnabled: artboardControls.productionAreaPreviewEnabled,
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
    openRoleImageReplacementPicker: artboardControls.openRoleImageReplacementPicker,
    addPrintArea: artboardControls.addPrintArea,
    deletePrintArea: artboardControls.deletePrintArea,
    toggleProductionAreaPreview: artboardControls.toggleProductionAreaPreview,
    alignSelectedToPrintArea: artboardControls.alignSelectedToPrintArea,
    detectPrintAreaFromMask: artboardControls.detectPrintAreaFromMask,
    capturePrintArea: artboardControls.capturePrintArea,
    captureCanvas: artboardControls.captureCanvas,
    imageInputRef: assetControls.imageInputRef,
    imageUploading: assetControls.imageUploading,
    materialGroups: materialGroupControls.materialGroups,
    activeMaterialGroupId: materialGroupControls.activeMaterialGroupId,
    activeMaterialGroup: materialGroupControls.activeMaterialGroup,
    materials: materialGroupControls.materials,
    materialTotal: materialGroupControls.materialTotal,
    materialLoading: materialGroupControls.materialLoading,
    materialLoadingMore: materialGroupControls.materialLoadingMore,
    materialHasMore: materialGroupControls.materialHasMore,
    materialError: materialGroupControls.materialError,
    addingMaterialId: materialGroupControls.addingMaterialId,
    imageReplacementInputRef: assetControls.imageReplacementInputRef,
    imageReplacing: assetControls.imageReplacing,
    imageProperties: imageControls.imageProperties,
    watermarkValue: assetControls.watermarkValue,
    openImagePicker: assetControls.openImagePicker,
    handleImageChange: assetControls.handleImageChange,
    setMaterialGroups: materialGroupControls.setMaterialGroups,
    selectMaterialGroup: materialGroupControls.selectMaterialGroup,
    loadMoreMaterials: materialGroupControls.loadMoreMaterials,
    retryMaterials: materialGroupControls.retryMaterials,
    addMaterialToCanvas: materialGroupControls.addMaterialToCanvas,
    openSelectedImageReplacementPicker: assetControls.openSelectedImageReplacementPicker,
    handleSelectedImageReplacementChange: assetControls.handleSelectedImageReplacementChange,
    updateSelectedImageProperties: imageControls.updateSelectedImageProperties,
    resetSelectedImageSize: imageControls.resetSelectedImageSize,
    addWatermark: assetControls.addWatermark,
    deleteWatermark: assetControls.deleteWatermark,
    layerMenu: layerMenuControls.layerMenu,
    selectionToolbar: selectionToolbarControls.selectionToolbar,
    activeAttributeElementId,
    openSelectedElementAttributes,
    openLayerElementAttributes,
    closeElementAttributes,
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
    toggleLayerVisibility: layerControls.toggleLayerVisibility,
    toggleLayerPointerThrough: layerControls.toggleLayerPointerThrough,
    moveLayerUp: layerControls.moveLayerUp,
    moveLayerDown: layerControls.moveLayerDown,
    moveLayerToFront: layerControls.moveLayerToFront,
    hoverLayer: layerControls.hoverLayer,
    getLayerThumbnail: layerControls.getLayerThumbnail,
    getSelectedElementAttributes: elementDataControls.getSelectedElementAttributes,
    setSelectedElementAttributes: elementDataControls.setSelectedElementAttributes,
    removeSelectedElementAttributes: elementDataControls.removeSelectedElementAttributes,
    clearSelectedElementAttributes: elementDataControls.clearSelectedElementAttributes,
    exportElementAttributes: elementDataControls.exportElementAttributes,
    getElementAttributesById: elementDataControls.getElementAttributesById,
    setElementAttributesById: elementDataControls.setElementAttributesById,
    removeElementAttributesById: elementDataControls.removeElementAttributesById,
    getElementsByAttribute: elementDataControls.getElementsByAttribute,
    setElementsVisibilityByAttribute: elementDataControls.setElementsVisibilityByAttribute,
    loadDocument,
    exportDocument,
    undo,
    redo,
    zoomIn,
    zoomOut,
    resetZoom,
    centerArtboard,
    fitArtboardToView
  }
}

/** @param {EventTarget | null} target 键盘事件目标。 @returns {boolean} 是否正在输入内容。 */
function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) {
    return false
  }

  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/**
 * 解析工作区快捷键对应的操作。
 *
 * @param {KeyboardEvent} event 键盘事件。
 * @returns {'undo' | 'redo' | 'zoomIn' | 'zoomOut' | 'resetZoom' | null} 操作名称。
 */
function resolveWorkspaceShortcut(event) {
  const key = event.key.toLowerCase()

  if (key === 'z') {
    return event.shiftKey ? 'redo' : 'undo'
  }
  if (key === 'y') {
    return 'redo'
  }
  if (key === '+' || key === '=' || event.code === 'NumpadAdd') {
    return 'zoomIn'
  }
  if (key === '-' || key === '_' || event.code === 'NumpadSubtract') {
    return 'zoomOut'
  }
  if (key === '0' || event.code === 'Numpad0') {
    return 'resetZoom'
  }
  return null
}
