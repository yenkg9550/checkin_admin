import { createRouter, createWebHashHistory } from 'vue-router'
import Login         from '@/views/Login.vue'
import Layout        from '@/views/Layout.vue'
import DashboardHome from '@/views/DashboardHome.vue'
import Employees     from '@/views/Employees.vue'
import Settings      from '@/views/Settings.vue'
import Admins        from '@/views/Admins.vue'
import Export        from '@/views/Export.vue'

const routes = [
  { path: '/',     redirect: '/dashboard' },
  { path: '/login', name: 'login', component: Login, meta: { public: true } },
  {
    path: '/',
    component: Layout,
    children: [
      { path: 'dashboard', name: 'dashboard',  component: DashboardHome, meta: { title: '出勤管理' } },
      { path: 'employees', name: 'employees',  component: Employees,     meta: { title: '員工管理' } },
      { path: 'settings',  name: 'settings',   component: Settings,      meta: { title: 'GPS 設定' } },
      { path: 'export',    name: 'export',     component: Export,        meta: { title: '匯出記錄' } },
      { path: 'admins',    name: 'admins',     component: Admins,        meta: { title: '管理設定' } },
    ],
  },
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  const token = sessionStorage.getItem('admin_token')
  let user = null
  try { user = JSON.parse(sessionStorage.getItem('admin_user') || 'null') } catch {}

  const isAdmin = ['admin', 'super_admin'].includes(user?.role)

  if (!to.meta.public && !token)    return { name: 'login' }
  if (to.name === 'login' && token) return { name: 'dashboard' }
  if (!to.meta.public && !isAdmin)  return { name: 'login' }
})

export default router
