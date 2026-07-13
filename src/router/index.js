import { createRouter, createWebHashHistory } from 'vue-router';

const routes = [
  { path: '/', redirect: '/editor' },
  { path: '/editor', name: 'editor', component: () => import('../views/EditorPage.vue') },
  { path: '/h5-preview', name: 'h5-preview', component: () => import('../views/H5PreviewPage.vue') },
  { path: '/docs', name: 'docs', component: () => import('../views/ApiDocsPage.vue') },
  { path: '/:pathMatch(.*)*', redirect: '/editor' }
];

export const router = createRouter({
  history: createWebHashHistory(),
  routes
});
