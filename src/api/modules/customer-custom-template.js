import { customerXiaoxiangClient } from '../clients/customer-xiaoxiang-client.js'
import { createCustomTemplateApi } from './custom-template.js'

const CUSTOMER_CUSTOM_TEMPLATE_ENDPOINT =
  import.meta.env?.VITE_CUSTOMER_CUSTOM_TEMPLATE_API_PATH || '/customer/api/customTemplate'

/** H5 生产页面使用的客户侧模板接口。 */
export const customerCustomTemplateApi = createCustomTemplateApi(
  CUSTOMER_CUSTOM_TEMPLATE_ENDPOINT,
  'customerCustomTemplate',
  customerXiaoxiangClient
)
