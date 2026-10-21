import { parseEditorDocument } from '../../../canvas-editor-core/src/utils/editor-document.js'

/**
 * 校验 H5 单画布和多部件模板，部件 ID 必须唯一。
 * @param {string | Object} value 模板 content。
 * @returns {Object} 文档副本。
 */
export function parseCustomizationDocument(value) {
  const document = typeof value === 'string' ? JSON.parse(value) : value
  if (document?.version !== 2) return parseEditorDocument(document)
  if (!Array.isArray(document.canvases) || !document.canvases.length) throw new Error('多部件模板没有可用画布。')
  const seen = new Set()
  return {
    ...document,
    canvases: document.canvases.map((canvas, index) => {
      const id = String(canvas.id || `canvas-${index + 1}`)
      if (seen.has(id)) throw new Error('多部件模板中存在重复的部件 ID。')
      seen.add(id)
      return { ...canvas, id, name: canvas.name || `部件 ${index + 1}`, document: parseEditorDocument(canvas.document) }
    })
  }
}
