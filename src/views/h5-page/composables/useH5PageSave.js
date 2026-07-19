import { ref } from 'vue'

import { MESSAGE_TYPES, postBridgeMessage } from '../../../services/message-bridge.js'
import { saveH5CustomDesign } from '../services/custom-design.js'
import {
  navigateToH5RedirectPath,
  readH5RedirectPath,
  readRouteValue
} from '../services/route-navigation.js'
import { wxAPI } from '../services/wx-api.js'

/**
 * 统一管理 H5 页面保存、宿主通信和保存后跳转。
 *
 * @param {Object} options 保存流程配置。
 * @param {Object} options.route Vue Router 当前路由。
 * @param {Object} options.router Vue Router 实例。
 * @param {string} options.pageId 页面业务标识。
 * @param {string} options.defaultDesignName 默认设计名称。
 * @param {() => Object | null} options.getEditor 获取核心编辑器实例的方法。
 * @returns {Object} 保存状态和操作方法。
 */
export function useH5PageSave(options) {
  const saving = ref(false)
  const saveStatus = ref({ type: 'success', text: '' })

  /** @returns {void} 清空保存结果提示。 */
  function resetSaveStatus() {
    saveStatus.value = { type: 'success', text: '' }
  }

  /**
   * 保存当前设计并执行页面离开流程。
   *
   * @returns {Promise<Object | null>} 保存结果；未执行或失败时返回 null。
   */
  async function savePage() {
    if (saving.value) {
      return null
    }

    saving.value = true
    resetSaveStatus()
    try {
      const payload = await createSavePayload(options)
      const bridgeResult = postSaveMessage(options, payload)

      // 用户设计可能包含完整文档和图片地址，仅在开发环境输出诊断数据。
      if (import.meta.env.DEV) {
        console.log(`${options.pageId} save result:`, JSON.stringify(payload, null, 2))
      }
      if (await leavePageAfterSave(options, bridgeResult)) {
        return payload
      }

      saveStatus.value = { type: 'success', text: '保存数据已生成' }
      return payload
    } catch (error) {
      console.error(`${options.pageId} save failed.`, error)
      saveStatus.value = { type: 'error', text: error.message || '保存失败，请稍后重试。' }
      return null
    } finally {
      saving.value = false
    }
  }

  return {
    saving,
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
    partnerId: options.route.query.partnerId
  })
}

/**
 * @param {Object} options 页面配置。
 * @param {Object} payload 保存数据。
 * @returns {{ message: Object, channels: string[] }} 通信结果。
 */
function postSaveMessage(options, payload) {
  return postBridgeMessage(
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
 * @param {{ channels: string[] }} bridgeResult 通信结果。
 * @returns {Promise<boolean>} 是否已离开当前页面。
 */
async function leavePageAfterSave(options, bridgeResult) {
  if (await navigateToH5RedirectPath(readH5RedirectPath(options.route), options.router)) {
    return true
  }
  if (!bridgeResult.channels.includes('mini-program') || !wxAPI.isSupported()) {
    return false
  }

  options.onBeforeNavigateBack?.()
  return wxAPI.navigateBack({ delta: 1 })
}
