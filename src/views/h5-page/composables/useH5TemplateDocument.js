import { onBeforeUnmount, ref, shallowRef } from 'vue'

import { loadH5TemplateDocument } from '../services/template-document.js'
import { readRouteTemplateId, readRouteValue } from '../services/route-navigation.js'

/**
 * 管理 H5 页面模板请求和统一状态。
 *
 * @param {{ errorLabel?: string }} [options={}] 状态配置。
 * @returns {Object} 模板文档状态与操作方法。
 */
export function useH5TemplateDocument(options = {}) {
  const documentData = shallowRef(null)
  const templateLoading = ref(false)
  const templateError = ref('')
  let requestId = 0

  /**
   * 根据路由参数加载模板。
   *
   * @param {Object} query Vue Router 查询参数。
   * @returns {Promise<Object | null>} 已加载模板结果。
   */
  async function loadTemplateFromRoute(query = {}) {
    const currentRequestId = ++requestId
    const rawTemplateId = readRouteValue(query.templateId)
    const templateId = readRouteTemplateId(query.templateId)

    clearState()
    if (rawTemplateId === null || rawTemplateId === '') {
      templateError.value = '缺少模板 ID。'
      return null
    }
    if (!templateId) {
      templateError.value = '模板 ID 必须是正整数。'
      return null
    }

    templateLoading.value = true
    try {
      const result = await loadH5TemplateDocument(templateId, {
        partnerId: readRouteValue(query.partnerId),
        skuId: readRouteValue(query.skuId)
      })
      if (currentRequestId !== requestId) {
        return null
      }

      documentData.value = result.document
      return result
    } catch (error) {
      if (currentRequestId !== requestId) {
        return null
      }

      console.error(`${options.errorLabel || 'H5'} template load failed.`, error)
      templateError.value = error.message || '模板加载失败。'
      return null
    } finally {
      if (currentRequestId === requestId) {
        templateLoading.value = false
      }
    }
  }

  /** @returns {void} 清空当前模板状态。 */
  function clearState() {
    documentData.value = null
    templateError.value = ''
    templateLoading.value = false
  }

  /** @returns {void} 取消当前请求并重置模板状态。 */
  function reset() {
    requestId += 1
    clearState()
  }

  /** @param {*} error 画布加载错误。 @returns {void} */
  function handleCanvasError(error) {
    documentData.value = null
    templateError.value = error?.message || '画布加载失败。'
  }

  onBeforeUnmount(() => {
    requestId += 1
  })

  return {
    documentData,
    templateError,
    templateLoading,
    handleCanvasError,
    loadTemplateFromRoute,
    reset
  }
}
