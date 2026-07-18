/**
 * 创建容器尺寸监听器。
 *
 * @author zzx
 * @since 2026-06-30
 * @param {HTMLElement | HTMLCanvasElement} view 画布挂载容器。
 * @param {Object} editor 编辑器实例上下文。
 * @returns {ResizeObserver | null} 尺寸监听器，环境不支持 ResizeObserver 时返回 null。
 */
export function createResizeObserver(view, editor) {
  if (typeof ResizeObserver === 'undefined') {
    return null
  }

  const observer = new ResizeObserver(([entry]) => {
    if (editor?.state?.destroyed) {
      return
    }

    const { width, height } = entry.contentRect

    if (width > 0 && height > 0) {
      editor.resize(width, height)
    }
  })

  observer.observe(view)
  return observer
}
