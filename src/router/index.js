import { createRouter, createWebHashHistory } from 'vue-router'
import Login      from '@/views/Login.vue'
import Dashboard  from '@/views/Dashboard.vue'
import Employees  from '@/views/Employees.vue'
import Settings   from '@/views/Settings.vue'

const routes = [
  { path: '/',          redirect: '/dashboard' },
  { path: '/login',     name: 'login',      component: Login,     meta: { public: true } },
  { path: '/dashboard', name: 'dashboard',  component: Dashboard, meta: { title: '出勤管理' } },
  { path: '/employees', name: 'employees',  component: Employees, meta: { title: '員工管理' } },
  { path: '/settings',  name: 'settings',   component: Settings,  meta: { title: '系統設定' } },
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  const token = sessionStorage.getItem('admin_token')
  if (!to.meta.public && !token) return { name: 'login' }
  if (to.name === 'login' && token) return { name: 'dashboard' }
})

export default router
