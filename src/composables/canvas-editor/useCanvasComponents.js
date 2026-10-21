import { computed, ref } from 'vue'

const MULTI_CANVAS_VERSION = 2

/**
 * 管理 editor-custom 的多部件画布。
 *
 * 核心编辑器仍保持单画布实例；这里保存每个部件的文档快照，切换时替换当前场景。
 * @param {Object} editor canvas editor facade。
 * @param {(message: string, type: 'success' | 'error') => void} [notify] 通知回调。
 * @returns {Object} 部件状态与操作。
 */
export function useCanvasComponents(editor, notify = () => {}) {
  const components = ref([createComponent('部件 1')])
  const activeComponentId = ref(components.value[0].id)
  const switching = ref(false)

  const activeComponent = computed(
    () => components.value.find((component) => component.id === activeComponentId.value) ?? null
  )

  /** @returns {Object | null} 当前编辑器快照。 */
  function captureActiveDocument() {
    const document = editor.exportDocument?.()
    if (document && activeComponent.value) {
      activeComponent.value.document = clone(document)
    }
    return document
  }

  /**
   * 从旧单画布或多部件 payload 加载。
   * @param {*} value 宿主传入的内容。
   * @returns {Promise<Object | null>} 当前部件文档。
   */
  async function load(value) {
    const normalized = normalizeComponents(value)
    components.value = normalized.components
    activeComponentId.value = normalized.activeId
    const current = activeComponent.value
    await replaceEditorDocument(current?.document ?? null)
    return current?.document ?? null
  }

  /** @returns {void} 重置为空的默认部件。 */
  function reset() {
    const component = createComponent('部件 1')
    components.value = [component]
    activeComponentId.value = component.id
  }

  /** @param {string} id 部件 ID。 @returns {Promise<boolean>} 是否切换成功。 */
  async function select(id) {
    if (id === activeComponentId.value || switching.value) return false
    const target = components.value.find((component) => component.id === id)
    if (!target) return false

    captureActiveDocument()
    switching.value = true
    try {
      await nextFrame()
      activeComponentId.value = id
      await replaceEditorDocument(target.document)
      editor.fitArtboardToView?.()
      await nextFrame()
      return true
    } catch (error) {
      notify(error?.message || '部件画布切换失败。', 'error')
      return false
    } finally {
      switching.value = false
    }
  }

  /** @returns {Promise<Object>} 新增的部件。 */
  async function add() {
    captureActiveDocument()
    const component = createComponent(`部件 ${components.value.length + 1}`, createBlankDocument())
    components.value.push(component)
    await select(component.id)
    notify('已新增部件画布。', 'success')
    return component
  }

  /** @returns {Promise<Object | null>} 复制出的部件。 */
  async function duplicate() {
    const source = activeComponent.value
    if (!source) return null
    captureActiveDocument()
    const component = createComponent(`部件 ${components.value.length + 1}`, clone(source.document))
    components.value.push(component)
    await select(component.id)
    notify('已复制当前部件。', 'success')
    return component
  }

  /** @returns {Promise<boolean>} 是否删除成功。 */
  async function remove() {
    if (components.value.length <= 1) {
      notify('至少需要保留一个部件画布。', 'error')
      return false
    }
    const index = components.value.findIndex((component) => component.id === activeComponentId.value)
    if (index < 0) return false
    components.value.splice(index, 1)
    const next = components.value[Math.min(index, components.value.length - 1)]
    switching.value = true
    try {
      await nextFrame()
      activeComponentId.value = next.id
      await replaceEditorDocument(next.document)
      editor.fitArtboardToView?.()
      await nextFrame()
      notify('已删除当前部件。', 'success')
      return true
    } finally {
      switching.value = false
    }
  }

  /** @returns {Object} 可保存的多部件文档。 */
  function exportDocument() {
    captureActiveDocument()
    return {
      version: MULTI_CANVAS_VERSION,
      canvases: components.value.map((component) => ({
        id: component.id,
        name: component.name,
        document: clone(component.document) ?? createBlankDocument()
      }))
    }
  }

  /** @returns {Object} 包含当前实时画布的只读快照，用于跨部件定制配置。 */
  function getCustomizationDocument() {
    return {
      version: MULTI_CANVAS_VERSION,
      canvases: components.value.map((component) => ({
        id: component.id,
        name: component.name,
        document: component.id === activeComponentId.value
          ? editor.exportDocument()
          : component.document
      }))
    }
  }

  /** @param {Object | null} document 文档。 @returns {Object} 空文档。 */
  function createBlankDocument(document = editor.exportDocument?.()) {
    const canvas = document?.canvas ?? { width: 750, height: 1334, background: '#ffffff' }
    return { version: 1, canvas: clone(canvas), elements: [] }
  }

  return {
    components,
    activeComponent,
    activeComponentId,
    switching,
    load,
    reset,
    select,
    add,
    duplicate,
    remove,
    exportDocument,
    getCustomizationDocument
  }

  async function replaceEditorDocument(document) {
    editor.getEditor?.()?.clearDocument?.()
    if (document) {
      await editor.loadDocument(document)
    }
  }
}

function normalizeComponents(value) {
  const parsed = parseValue(value)
  if (parsed?.version === MULTI_CANVAS_VERSION && Array.isArray(parsed.canvases) && parsed.canvases.length) {
    const normalized = parsed.canvases.map((canvas, index) => createComponent(
      canvas.name || `部件 ${index + 1}`,
      canvas.document ?? canvas,
      canvas.id
    ))
    return { components: normalized, activeId: normalized[0].id }
  }

  const component = createComponent('部件 1', parsed?.version ? parsed : null)
  return { components: [component], activeId: component.id }
}

function createComponent(name, document = null, id = null) {
  return {
    id: id || `component-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    document: clone(document)
  }
}

function parseValue(value) {
  if (!value) return null
  if (typeof value === 'string') {
    try { return JSON.parse(value) } catch { return null }
  }
  return value
}

function clone(value) {
  return value === null || value === undefined ? value : JSON.parse(JSON.stringify(value))
}

function nextFrame() {
  return new Promise((resolve) => {
    if (typeof globalThis.requestAnimationFrame === 'function') {
      globalThis.requestAnimationFrame(() => resolve())
    } else {
      globalThis.setTimeout(resolve, 16)
    }
  })
}
