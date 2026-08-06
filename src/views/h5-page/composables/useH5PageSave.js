import { computed, ref } from 'vue'

import { MESSAGE_TYPES, postBridgeMessage } from '../../../services/message-bridge.js'
import { saveH5CustomDesign } from '../services/custom-design.js'
import {
  navigateToH5RedirectPath,
  readH5RedirectPath,
  readRouteValue
} from '../services/route-navigation.js'

/**
 * 统一管理 H5 页面保存、宿主通信和保存后跳转。
 *
 * @param {Object} options 保存流程配置。
 * @param {Object} options.route Vue Router 当前路由。
 * @param {string} options.pageId 页面业务标识。
 * @param {string} options.defaultDesignName 默认设计名称。
 * @param {() => Object | null} options.getEditor 获取核心编辑器实例的方法。
 * @returns {Object} 保存状态和操作方法。
 */
export function useH5PageSave(options) {
  const saving = ref(false)
  const redirecting = ref(false)
  const saveStatus = ref({ type: 'success', text: '' })
  const saveProgressText = computed(() => {
    return redirecting.value ? '保存成功，正在进入订单页' : '正在保存...'
  })

  /** @returns {void} 重置保存和跳转状态。 */
  function resetSaveStatus() {
    redirecting.value = false
    saveStatus.value = { type: 'success', text: '' }
  }

  /**
   * 保存当前设计并执行页面离开流程。
   *
   * @returns {Promise<Object | null>} 保存结果；未执行或失败时返回 null。
   */
  async function savePage() {
    if (saving.value || redirecting.value) {
      return null
    }

    saving.value = true
    resetSaveStatus()
    try {
      const payload = await createSavePayload(options)
      postSaveMessage(options, payload)

      // 用户设计可能包含完整文档和图片地址，仅在开发环境输出诊断数据。
      if (import.meta.env.DEV) {
        console.log(`${options.pageId} save result:`, JSON.stringify(payload, null, 2))
      }
      leavePageAfterSave(options, payload, () => {
        // 在调用 wx.miniProgram.redirectTo 前切换 Loading 文案，
        // 并保持遮罩直到当前 WebView 被订单页替换。
        redirecting.value = true
      })
      return payload
    } catch (error) {
      redirecting.value = false
      console.error(`${options.pageId} save failed.`, error)
      saveStatus.value = { type: 'error', text: error.message || '保存失败，请稍后重试。' }
      return null
    } finally {
      saving.value = false
    }
  }

  return {
    redirecting,
    saving,
    saveProgressText,
    saveStatus,
    resetSaveStatus,
    savePage
  }
}

/** @param {Object} options 保存配置。 @returns {Promise<Object>} 保存数据。 */
function createSavePayload(options) {
  return saveH5CustomDesign(options.getEditor?.(), {
    templateId: options.route.query.templateId,
    designName: readRouteValue(options.route.query.designName) || options.defaultDesignName,
    partnerId: options.route.query.partnerId,
    skuId: readRouteValue(options.route.query.skuId)
  })
}

/**
 * @param {Object} options 页面配置。
 * @param {Object} payload 保存数据。
 * @returns {void}
 */
function postSaveMessage(options, payload) {
  postBridgeMessage(
    MESSAGE_TYPES.H5_PAGE_SAVED,
    {
      page: options.pageId,
      templateId: readRouteValue(options.route.query.templateId),
      json: payload.editorJson,
      previewImgUrl: payload.previewImgUrl,
      productImgUrl: payload.productImgUrl,
      printAreaImage: payload.productImgUrl,
      design: payload.response
    },
    { target: 'mini-program', sender: 'h5-page' }
  )
}

/**
 * @param {Object} options 页面配置。
 * @param {Object} payload 设计保存结果。
 * @param {Function} markRedirecting 调用宿主替换跳转前的内部状态回调。
 * @returns {void}
 */
function leavePageAfterSave(options, payload, markRedirecting) {
  const redirectPath = appendSavedDesignQuery(readH5RedirectPath(options.route), payload)
  if (!redirectPath) {
    throw new Error('缺少订单跳转路径，请返回商品页重新定制。')
  }

  // 先更新 Loading 文案，再由 wx.miniProgram.redirectTo 替换当前 WebView。
  // 此处故意不提供 navigateBack 回退，避免宿主页闪现和重复跳转。
  markRedirecting()
  if (!navigateToH5RedirectPath(redirectPath)) {
    throw new Error('微信小程序页面跳转失败，请重试。')
  }
}

/** @param {string | null} path 小程序回调路径。 @param {Object} payload 保存结果。 @returns {string | null} */
function appendSavedDesignQuery(path, payload) {
  if (!path) return null
  const response = payload?.response
  const designId = response?.designId ?? response?.id ??
    response?.data?.designId ?? response?.data?.id ??
    response?.data?.data?.designId ?? response?.data?.data?.id
  if (designId === undefined || designId === null || designId === '') {
    throw new Error('设计保存成功但未返回 designId。')
  }

  const [basePath, rawQuery = ''] = path.split('?')
  const query = new URLSearchParams(rawQuery)
  query.set('designId', String(designId))
  query.set('source', query.get('source') || 'SERIES')
  const previewImgUrl = payload?.previewImgUrl || payload?.productImgUrl
  if (previewImgUrl) query.set('previewImgUrl', previewImgUrl)
  return `${basePath}?${query.toString()}`
}
