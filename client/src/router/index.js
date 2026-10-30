import { createRouter, createWebHistory } from 'vue-router'
import { authAPI } from '@/utils/api'

const routes = [
  {
    path: '/welcome',
    name: 'Welcome',
    component: () => import('@/pages/WelcomePage.vue'),
    meta: { title: '欢迎', requiresAuth: false }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/pages/LoginPage.vue'),
    meta: { title: '登录', requiresAuth: false }
  },
  {
    path: '/',
    name: 'Home',
    component: () => import('@/pages/HomePage.vue'),
    meta: { title: '首页', requiresAuth: true }
  },
  {
    path: '/interview',
    name: 'Interview',
    component: () => import('@/pages/InterviewPage.vue'),
    meta: { title: '采访', requiresAuth: true }
  },
  {
    path: '/graph',
    name: 'Graph',
    component: () => import('@/pages/GraphPage.vue'),
    meta: { title: '家族图谱', requiresAuth: true }
  },
  {
    path: '/map',
    name: 'Map',
    component: () => import('@/pages/MapPage.vue'),
    meta: { title: '记忆地图', requiresAuth: true }
  },
  {
    path: '/capsule',
    name: 'Capsule',
    component: () => import('@/pages/CapsulePage.vue'),
    meta: { title: '时光胶囊', requiresAuth: true }
  },
  {
    path: '/heirloom',
    name: 'Heirloom',
    component: () => import('@/pages/HeirloomPage.vue'),
    meta: { title: '传家宝', requiresAuth: true }
  },
  {
    path: '/about',
    name: 'About',
    component: () => import('@/pages/AboutPage.vue'),
    meta: { title: '关于', requiresAuth: false }
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('@/pages/SearchPage.vue'),
    meta: { title: '搜索', requiresAuth: true }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach(async (to, from, next) => {
  document.title = `${to.meta.title || 'FamilyVault'} · 家史馆`

  // 检查是否首次访问
  const welcomeShown = localStorage.getItem('welcomeShown')
  if (!welcomeShown && to.path !== '/welcome') {
    return next('/welcome')
  }

  // 检查登录状态
  const requiresAuth = to.meta.requiresAuth !== false
  if (requiresAuth) {
    const authResult = await authAPI.checkAuth()
    if (!authResult.loggedIn) {
      return next('/login')
    }
  }

  next()
})

export default router