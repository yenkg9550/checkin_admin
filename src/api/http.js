import axios from 'axios'

const TOKEN_KEY = 'admin_token'

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api/v1',
  timeout: 15000,
})

http.interceptors.request.use((config) => {
  const token = sessionStorage.getItem(TOKEN_KEY)
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

http.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem('admin_user')
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)

export const postAdminLogin   = (username, password) => http.post('/auth/admin-login', { username, password }).then(r => r.data)
export const fetchDailyReport = (date)     => http.get('/admin/report', { params: { report_date: date } }).then(r => r.data)
export const fetchEmployees   = ()         => http.get('/admin/employees').then(r => r.data)
export const updateEmployeeRole = (id, role) => http.patch(`/admin/employees/${id}/role`, null, { params: { role } }).then(r => r.data)
export const postOverride     = (payload)  => http.post('/admin/override', payload).then(r => r.data)
export const clearAllAttendance = ()       => http.delete('/admin/attendance/all').then(r => r.data)
export const fetchSettings      = ()       => http.get('/admin/settings').then(r => r.data)
export const updateSettings     = (data)   => http.put('/admin/settings', data).then(r => r.data)
export const exportMonthly      = (year, month) =>
  http.get('/admin/export/monthly', { params: { year, month }, responseType: 'blob' }).then(r => r.data)
