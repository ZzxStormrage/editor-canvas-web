import { xiaoxiangClient } from '../clients/xiaoxiang-client.js'

const CUSTOM_FONT_LIST_PATH = '/admin/api/customFont/list'

/**
 * 自定义字体接口模块。
 */
export const customFontApi = Object.freeze({
  /**
   * 获取当前账号可用的自定义字体列表。
   *
   * 暂时保留服务端原始响应，确认字段结构后再在应用层转换为字体选项。
   *
   * @returns {import('alova').Method} Alova Method 实例。
   */
  list() {
    return xiaoxiangClient.Get(CUSTOM_FONT_LIST_PATH, {
      name: 'customFont.list'
    })
  }
})
