/*
 * @Author: zzx 452436275@qq.com
 * @Date: 2024-04-29 14:38:47
 * @LastEditors: zzx 452436275@qq.com
 * @LastEditTime: 2026-03-13 12:00:29
 * @FilePath: /wufangzhai-custom/src/main.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */

import { createApp } from 'vue'
import './style.css'
import './style/index.scss'
import App from './App.vue'
import router from './router'
import store from './store'
import '@/style/index.scss'

import '@/assets/styles/reset.css' // 初始样式重置
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import {
  VueGesture,
  VueHammer,
  VueHammerPinch,
  HammerEvents,
  HammerPinchEvents,
  HammerRotateEvents,
  GestureEvents,
  VueHammerRotate
} from './utils/gesture'
import 'animate.css'

// 2. 引入组件样式
import 'vant/lib/index.css'
// 引入模块后自动生效 监听pc与 移动端的事件
import '@vant/touch-emulator'
import 'vant/es/toast/style'
import 'vant/es/dialog/style'
import qs from 'qs'

let Request = qs.parse(location.href.split('?')[1] || '')
localStorage.setItem('urlParams', JSON.stringify(Request))

const app = createApp(App)
app.use(router)
app.use(store)

// 设置全局错误处理器
app.config.errorHandler = (err, instance, info) => {
  // 输出到控制台
  console.error('捕获到全局错误：', err)
  console.error('错误组件实例：', instance)
  console.error('错误信息：', info)

  // 这里可以添加错误上报的逻辑，比如发送到后端服务器
}

// 为Vue添加手势事件
GestureEvents.forEach((item) => {
  app.directive(item, {
    created: function (el, binding) {
      VueGesture(el, item, binding.value)
    }
  })
})

HammerEvents.forEach((item) => {
  app.directive(item, {
    created: function (el, binding) {
      VueHammer(el, item, binding.value)
    }
  })
})

HammerPinchEvents.forEach((item) => {
  app.directive(item, {
    created: function (el, binding) {
      VueHammerPinch(el, item, binding.value)
    }
  })
})

HammerRotateEvents.forEach((item) => {
  app.directive(item, {
    created: function (el, binding) {
      VueHammerRotate(el, item, binding.value)
    }
  })
})

app.mount('#app')

// 解析 URL 参数并存储到 localStorage

function getQueryString(url) {
  const match = url.match(/\?(.*)/)
  return match ? match[1] : ''
}

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
