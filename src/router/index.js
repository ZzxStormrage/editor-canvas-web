import { createRouter, createWebHashHistory } from 'vue-router'

const routes = [
  { path: '/', redirect: '/editor' },
  { path: '/editor', name: 'editor', component: () => import('../views/EditorPage.vue') },
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
