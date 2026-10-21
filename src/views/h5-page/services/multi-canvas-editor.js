import { toRaw } from 'vue'
import { resolveLinkedImageTargets } from '../../../services/image-replacement-groups.js'

/**
 * 将节点操作路由到所属画布，并将同组替换作为一次操作执行。
 * @param {() => Object[]} getCanvases 部件及其实例。
 * @param {() => Object} getActiveEditor 当前可见编辑器。
 * @param {boolean} multi 是否为多部件文档。
 * @returns {Object} H5 编辑器外观。
 */
export function createMultiCanvasEditor(getCanvases, getActiveEditor, multi = false) {
  const editors = () => getCanvases().map((canvas) => canvas.editor).filter(Boolean)
  const owner = (node) => editors().find((editor) => editor.getElementsByType('image').includes(toRaw(node))
    || editor.getElementsByType('text').includes(toRaw(node)))
  const readAttributes = (node) => owner(node)?.elementData?.get(toRaw(node)) ?? {}
  const pending = new Map()
  const keys = new WeakMap()
  let nextKey = 0
  const api = {
    getCanvasEditors: () => getCanvases(),
    getElementsByType: (...args) => editors().flatMap((editor) => editor.getElementsByType(...args)),
    getElementsByAttribute: (...args) => editors().flatMap((editor) => editor.getElementsByAttribute(...args)),
    getElementsByRole: (...args) => editors().flatMap((editor) => editor.getElementsByRole(...args)),
    elementData: {
      get: readAttributes,
      getId: (node) => owner(node)?.elementData?.getId(node),
      export: (...args) => editors().flatMap((editor) => editor.elementData.export(...args))
    },
    image: {
      getSource: (node) => owner(node)?.image?.getSource(toRaw(node)),
      getFit: (node) => owner(node)?.image?.getFit(toRaw(node))
    },
    replaceTextWithRules: (node, ...args) => owner(node)?.replaceTextWithRules(toRaw(node), ...args),
    replaceImage(node, url, options = {}) {
      node = toRaw(node)
      const groupId = readAttributes(node).image?.replacementGroupId
      if (!keys.has(node)) keys.set(node, ++nextKey)
      const key = JSON.stringify([groupId ? `group:${groupId}` : keys.get(node), url, options])
      if (pending.has(key)) return pending.get(key)
      const targets = resolveLinkedImageTargets(facade, [node])
      const snapshots = groupId ? targets.map((target) => ({
        target,
        editor: owner(target),
        url: owner(target).image.getSource(target),
        fit: owner(target).image.getFit(target)
      })) : []
      const task = Promise.allSettled(targets.map((target) => {
        const editor = owner(target)
        return editor.replaceImage(target, url, {
          ...options,
          ...(groupId ? { fit: editor.image.getFit(target) || options.fit || 'contain', preserveFrame: true } : {})
        })
      })).then(async (results) => {
        const failure = results.find((result) => result.status === 'rejected')
        if (failure) {
          await Promise.allSettled(snapshots.map((snapshot) => snapshot.editor.replaceImage(snapshot.target, snapshot.url, {
            fit: snapshot.fit,
            allowLocked: true,
            preserveFrame: true
          })))
          throw failure.reason
        }
        return results[0]?.value
      }).finally(() => pending.delete(key))
      pending.set(key, task)
      return task
    },
    exportDocument() {
      if (!multi) return getActiveEditor()?.exportDocument()
      return {
        version: 2,
        canvases: getCanvases().map(({ id, name, editor }) => ({ id, name, document: editor.exportDocument() }))
      }
    }
  }
  const facade = new Proxy(api, {
    get(target, property) {
      if (property in target) return target[property]
      const editor = getActiveEditor()
      const value = editor?.[property]
      return typeof value === 'function' ? value.bind(editor) : value
    }
  })
  return facade
}
