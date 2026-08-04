import { createAlovaClient } from '../../../api/core/alova-client.js'
import { createCustomMaterialGroupApi } from '../../../api/modules/custom-material-group.js'
import {
  clearH5AccessToken,
  notifyH5AuthExpired,
  waitForH5AccessToken
} from '../services/auth-token.js'

export const MINI_PROGRAM_MATERIAL_API_BASE_URL = '/'
const CUSTOMER_MATERIAL_GROUP_ENDPOINT =
  import.meta.env?.VITE_CUSTOMER_MATERIAL_GROUP_API_PATH || '/customer/api/customMaterialGroup'

// Use the mini-program service directly while retaining its token passed into H5.
export const miniProgramMaterialClient = createAlovaClient({
  baseURL: MINI_PROGRAM_MATERIAL_API_BASE_URL,
  getAccessToken: waitForH5AccessToken,
  onUnauthorized(error) {
    clearH5AccessToken()
    notifyH5AuthExpired(error)
  }
})

/** H5 material API backed by the mini-program service. */
export const customerMaterialGroupApi = createCustomMaterialGroupApi(
  CUSTOMER_MATERIAL_GROUP_ENDPOINT,
  miniProgramMaterialClient
)
