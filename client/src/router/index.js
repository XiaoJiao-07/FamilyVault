import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/welcome',
    name: 'Welcome',
    component: () => import('@/pages/WelcomePage.vue'),
    meta: { title: '欢迎' }
  },
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
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/pages/AboutPage.vue'),
    meta: { title: '关于' }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/pages/SearchPage.vue'),
    meta: { title: '搜索' }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  document.title = `${to.meta.title || 'FamilyVault'} · 家史馆`

  // 检查是否首次访问
  const welcomeShown = localStorage.getItem('welcomeShown')
  if (!welcomeShown && to.path !== '/welcome') {
    next('/welcome')
  } else {
    next()
  }
})

export default router