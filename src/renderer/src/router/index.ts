import { createRouter, createWebHashHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/views/Home/index.vue'),
    redirect: '/notes',
    children: [
      {
        path: 'notes',
        name: 'Notes',
        component: () => import('@/views/Note/index.vue')
      },
      {
        path: 'video-learning',
        name: 'VideoLearning',
        component: () => import('@/views/VideoLearning/index.vue')
      },
      {
        path: 'document-learning',
        name: 'DocumentLearning',
        component: () => import('@/views/DocumentLearning/index.vue')
      },
      {
        path: 'settings',
        name: 'Settings',
        component: () => import('@/views/Settings/index.vue')
      }
    ]
  }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes
})

export default router
