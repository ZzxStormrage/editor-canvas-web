/*
 * @Author: zzx 452436275@qq.com
 * @Date: 2026-07-16 18:15:25
 * @LastEditors: zzx 452436275@qq.com
 * @LastEditTime: 2026-07-16 18:15:34
 * @FilePath: /ele-editor-v2/src/router/index.js
 * @Description: 这是默认设置,请设置`customMade`, 打开koroFileHeader查看配置 进行设置: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/editor' },
  { path: '/editor/:id?', name: 'editor', component: () => import('../views/EditorPage.vue') },
  { path: '/h5-preview', name: 'h5-preview', component: () => import('../views/H5PreviewPage.vue') },
  {
    path: '/h5-page',
    component: () => import('../views/h5-page/index.vue'),
    children: [
      {
        path: 'hundred-family-surnames',
        name: 'hundred-family-surnames',
        component: () => import('../views/h5-page/hundredFamilySurnames.vue')
      },
      {
        path: 'chinese-zodiac',
        name: 'chinese-zodiac',
        component: () => import('../views/h5-page/chinese-zodiac.vue')
      },
      {
        path: 'original-image',
        name: 'original-image',
        component: () => import('../views/h5-page/original-image.vue')
      }
    ]
  },
  { path: '/docs', name: 'docs', component: () => import('../views/ApiDocsPage.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/editor' }
]

export const router = createRouter({
  history: createWebHashHistory(),
  routes
})
