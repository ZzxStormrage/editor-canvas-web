/*
 * @Author: zzx 452436275@qq.com
 * @Date: 2024-04-29 14:38:47
 * @LastEditors: zzx 452436275@qq.com
 * @LastEditTime: 2026-06-10 10:48:10
 * @FilePath: /wufangzhai-custom/src/main.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { createApp } from 'vue'
import './style.css'
import App from './App.vue'
import { createVuetifyPlugin } from './plugins/vuetify.js'

const app = createApp(App)
const vuetify = createVuetifyPlugin()

// 设置全局错误处理器
app.config.errorHandler = (err, instance, info) => {
  // 输出到控制台
  console.error('捕获到全局错误：', err)
  console.error('错误组件实例：', instance)
  console.error('错误信息：', info)

  // 这里可以添加错误上报的逻辑，比如发送到后端服务器
}

app.use(vuetify).mount('#app')

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

// Vue 错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('❌ Vue 错误:', err)
  console.error('组件:', instance)
  console.error('错误信息:', info)
  console.trace()
}

// 使用方法：window.parseUrlParams()，会将参数存入localStorage.uslParams
