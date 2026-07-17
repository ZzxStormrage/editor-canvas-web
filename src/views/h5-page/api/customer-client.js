import { createAlovaClient } from '../../../api/core/alova-client.js'
import { XIAOXIANG_API_BASE_URL } from '../../../api/clients/xiaoxiang-client.js'
import {
  clearH5AccessToken,
  notifyH5AuthExpired,
  waitForH5AccessToken
} from '../services/auth-token.js'

/** H5 customer 接口客户端，只读取独立的 H5 Token。 */
export const customerClient = createAlovaClient({
  baseURL: XIAOXIANG_API_BASE_URL,
  getAccessToken: waitForH5AccessToken,
  onUnauthorized(error) {
    clearH5AccessToken()
    notifyH5AuthExpired(error)
  }
})
