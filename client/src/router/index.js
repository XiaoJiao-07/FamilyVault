import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/interview',
    name: 'Interview',
    component: () => import('@/pages/InterviewPage.vue'),
    meta: { title: 'AI 采访' }
  },
  {
    path: '/graph',
    name: 'Graph',
    component: () => import('@/pages/GraphPage.vue'),
    meta: { title: '家族图谱' }
  },
  {
    path: '/map',
    name: 'Map',
    component: () => import('@/pages/MapPage.vue'),
    meta: { title: '记忆地图' }
  },
  {
    path: '/capsule',
    name: 'Capsule',
    component: () => import('@/pages/CapsulePage.vue'),
    meta: { title: '时光胶囊' }
  },
  {
    path: '/heirloom',
    name: 'Heirloom',
    component: () => import('@/pages/HeirloomPage.vue'),
    meta: { title: '传家宝' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'FamilyVault'} · 家史馆`
  next()
})

export default router