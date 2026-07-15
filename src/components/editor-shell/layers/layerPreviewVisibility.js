const visibilityCallbacks = new WeakMap()
let sharedObserver = null

/**
 * 获取图层预览共用的可见性观察器。
 *
 * @returns {IntersectionObserver | null} 浏览器支持时返回共享观察器。
 */
function getSharedObserver() {
  if (typeof IntersectionObserver === 'undefined') {
    return null
  }

  if (!sharedObserver) {
    sharedObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            return
          }

          const callback = visibilityCallbacks.get(entry.target)
          sharedObserver.unobserve(entry.target)
          visibilityCallbacks.delete(entry.target)
          callback?.()
        })
      },
      { rootMargin: '120px 0px' }
    )
  }

  return sharedObserver
}

/**
 * 元素首次进入图层列表可视区域时执行回调。
 *
 * @param {Element} element 被观察的图层预览元素。
 * @param {() => void} callback 首次可见时执行的回调。
 * @returns {() => void} 取消观察函数。
 */
export function observeLayerPreviewOnce(element, callback) {
  const observer = getSharedObserver()

  if (!observer) {
    callback()
    return () => {}
  }

  visibilityCallbacks.set(element, callback)
  observer.observe(element)

  return () => {
    observer.unobserve(element)
    visibilityCallbacks.delete(element)
  }
}
