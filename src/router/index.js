import { createRouter, createWebHashHistory } from 'vue-router'
import Login         from '@/views/Login.vue'
import Layout        from '@/views/Layout.vue'
import DashboardHome from '@/views/DashboardHome.vue'
import Employees     from '@/views/Employees.vue'
import Settings      from '@/views/Settings.vue'
import Admins        from '@/views/Admins.vue'
import Export        from '@/views/Export.vue'
import Schedule      from '@/views/Schedule.vue'
import SalaryConfig  from '@/views/SalaryConfig.vue'
import Payroll       from '@/views/Payroll.vue'
import LeaveType        from '@/views/LeaveType.vue'
import OverrideRecords  from '@/views/OverrideRecords.vue'
import PayrollExport    from '@/views/PayrollExport.vue'
import Positions        from '@/views/Positions.vue'
import PayrollDetail    from '@/views/PayrollDetail.vue'
import AnomalyReport    from '@/views/AnomalyReport.vue'
import AttendanceList   from '@/views/AttendanceList.vue'
import PunchRequests    from '@/views/PunchRequests.vue'
import LeaveRequests    from '@/views/LeaveRequests.vue'
import ResetData        from '@/views/ResetData.vue'

// permission key 對應到各路由（super_admin 不受限制）
const ROUTE_PERMISSION = {
  dashboard:      'attendance',
  employees:      'employees',
  leaveTypes:     'employees',
  schedule:       'schedule',
  export:         'export',
  settings:       'settings',
  salaryConfig:    'salary',
  payroll:         'salary',
  overrideRecords: 'employees',
  punchRequests:   'attendance',
  leaveRequests:   'employees',
  payrollExport:   'salary',
  payrollDetail:   'salary',
  positions:       'employees',
  anomalyReport:   'attendance',
  attendanceList:  'attendance',
  // admins 頁僅 super_admin 可見（不在此表，由 isSuperAdmin 判斷）
}

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
      { path: 'export',    name: 'export',     component: Export,        meta: { title: '出勤匯出' } },
      { path: 'admins',    name: 'admins',     component: Admins,        meta: { title: '管理設定' } },
      { path: 'schedule',      name: 'schedule',      component: Schedule,      meta: { title: '排班管理' } },
      { path: 'leave-types',   name: 'leaveTypes',    component: LeaveType,     meta: { title: '假別設定' } },
      { path: 'salary-config', name: 'salaryConfig',  component: SalaryConfig,  meta: { title: '薪資設定' } },
      { path: 'payroll',          name: 'payroll',          component: Payroll,          meta: { title: '薪資報表' } },
      { path: 'override-records', name: 'overrideRecords',  component: OverrideRecords,  meta: { title: '補打卡紀錄' } },
      { path: 'payroll-export',   name: 'payrollExport',    component: PayrollExport,    meta: { title: '薪資匯出' } },
      { path: 'payroll-detail',   name: 'payrollDetail',    component: PayrollDetail,    meta: { title: '個人薪資明細' } },
      { path: 'positions',        name: 'positions',         component: Positions,        meta: { title: '職位設定' } },
      { path: 'anomaly-report',    name: 'anomalyReport',     component: AnomalyReport,    meta: { title: '異常報告' } },
      { path: 'attendance-list',  name: 'attendanceList',    component: AttendanceList,   meta: { title: '出勤紀錄' } },
      { path: 'punch-requests',   name: 'punchRequests',     component: PunchRequests,    meta: { title: '申請打卡列表' } },
      { path: 'leave-requests',   name: 'leaveRequests',     component: LeaveRequests,    meta: { title: '申請請假列表' } },
      { path: 'reset-data',       name: 'resetData',         component: ResetData,        meta: { title: '重置資料' } },
    ],
  },
]

const router = createRouter({ history: createWebHashHistory(), routes })

router.beforeEach((to) => {
  const token = sessionStorage.getItem('admin_token')
  let user = null
  try { user = JSON.parse(sessionStorage.getItem('admin_user') || 'null') } catch {}

  const isAdmin      = ['admin', 'super_admin'].includes(user?.role)
  const isSuperAdmin = user?.role === 'super_admin'

  if (!to.meta.public && !token)    return { name: 'login' }
  if (to.name === 'login' && token) return { name: 'dashboard' }
  if (!to.meta.public && !isAdmin)  return { name: 'login' }

  // admins / resetData 頁僅 super_admin 可進入
  if (['admins', 'resetData'].includes(to.name) && !isSuperAdmin) return { name: 'dashboard' }

  // 一般 admin：依權限攔截（dashboard 本身不擋，避免無限迴圈）
  if (!isSuperAdmin && to.name && to.name !== 'dashboard' && ROUTE_PERMISSION[to.name]) {
    const requiredPerm = ROUTE_PERMISSION[to.name]
    const perms = user?.permissions ?? []
    if (!perms.includes(requiredPerm)) {
      // 找第一個有權限的頁面作為 fallback
      const fallback = Object.entries(ROUTE_PERMISSION).find(([, perm]) => perms.includes(perm))
      return fallback ? { name: fallback[0] } : { name: 'login' }
    }
  }
})

export default router
