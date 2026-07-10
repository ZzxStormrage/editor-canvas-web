import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createVuetifyPlugin } from './plugins/vuetify.js'

const app = createApp(App)
const vuetify = createVuetifyPlugin()

app.use(vuetify)

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
