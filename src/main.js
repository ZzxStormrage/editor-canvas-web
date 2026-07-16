import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { configureApiClient } from './api/index.js'
import { createVuetifyPlugin } from './plugins/vuetify.js'
import { router } from './router/index.js'
import { clearAccessToken, getAccessToken, installAuthTokenBridge, notifyAuthExpired } from './services/auth-token.js'
import { MESSAGE_TYPES, postBridgeMessage, startMessageBridge } from './services/message-bridge.js'

configureApiClient({
  getAccessToken,
  onUnauthorized(error) {
    clearAccessToken()
    notifyAuthExpired(error)
  }
})
installAuthTokenBridge()
startMessageBridge()
postBridgeMessage(MESSAGE_TYPES.EDITOR_READY, {
  capabilities: [
    MESSAGE_TYPES.EDITOR_INITIALIZED,
    MESSAGE_TYPES.AUTH_TOKEN,
    MESSAGE_TYPES.AUTH_EXPIRED,
    MESSAGE_TYPES.TEMPLATE_LOADING,
    MESSAGE_TYPES.TEMPLATE_LOADED,
    MESSAGE_TYPES.TEMPLATE_LOAD_FAILED,
    MESSAGE_TYPES.TEMPLATE_SAVING,
    MESSAGE_TYPES.TEMPLATE_SAVED,
    MESSAGE_TYPES.TEMPLATE_SAVE_FAILED,
    MESSAGE_TYPES.H5_PAGE_SAVED
  ]
})

const app = createApp(App)
const vuetify = createVuetifyPlugin()

app.use(vuetify)
app.use(router)

// 捕获未处理的 Promise 错误
window.addEventListener('unhandledrejection', (event) => {
  console.error('❌ 未处理的 Promise 错误:', event.reason)
  console.error('Promise:', event.promise)
  console.trace()
})

// 捕获全局错误
window.addEventListener('error', (event) => {
  console.error('❌ 全局错误:', event.error)
  console.error('文件:', event.filename)
  console.error('行:', event.lineno, '列:', event.colno)
  console.trace()
})

// Vue 运行时错误统一从一个入口记录，避免重复赋值覆盖处理器。
app.config.errorHandler = (err, instance, info) => {
  console.error('❌ Vue 错误:', err)
  console.error('组件:', instance)
  console.error('错误信息:', info)
  console.trace()
}

app.mount('#app')
