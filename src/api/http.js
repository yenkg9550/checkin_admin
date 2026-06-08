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
      const msg = err.response?.data?.detail || ''
      sessionStorage.removeItem(TOKEN_KEY)
      sessionStorage.removeItem('admin_user')
      if (msg.includes('其他裝置')) {
        alert('此帳號已在其他裝置登入，您已被登出。')
      }
      window.location.hash = '#/login'
    }
    return Promise.reject(err)
  }
)

export const postAdminLogin   = (username, password) => http.post('/auth/admin-login', { username, password }).then(r => r.data)
export const fetchDailyReport = (date)     => http.get('/admin/report', { params: { report_date: date } }).then(r => r.data)
export const fetchEmployees   = ()         => http.get('/admin/employees').then(r => r.data)
export const updateEmployeeRole     = (id, role)      => http.patch(`/admin/employees/${id}/role`, null, { params: { role } }).then(r => r.data)
export const updateEmployeeHireDate = (id, hire_date) => http.patch(`/admin/employees/${id}/hire-date`, null, { params: { hire_date } }).then(r => r.data)
export const postOverride     = (payload)  => http.post('/admin/override', payload).then(r => r.data)
export const clearAllAttendance  = ()           => http.delete('/admin/attendance/all').then(r => r.data)
export const patchAttendance     = (id, data)   => http.patch(`/admin/attendance/${id}`, data).then(r => r.data)
export const deleteAttendance    = (id)         => http.delete(`/admin/attendance/${id}`).then(r => r.data)
export const fetchSettings      = ()       => http.get('/admin/settings').then(r => r.data)
export const updateSettings     = (data)   => http.put('/admin/settings', data).then(r => r.data)
export const exportMonthly      = (year, month, employeeIds = []) =>
  http.get('/admin/export/monthly', {
    params: { year, month, ...(employeeIds.length ? { employee_ids: employeeIds.join(',') } : {}) },
    responseType: 'blob',
  }).then(r => r.data)

// ── 管理員帳號管理 ────────────────────────────────────────────────────────
export const fetchAdmins              = ()                      => http.get('/admin/admins').then(r => r.data)
export const createAdmin              = (payload)               => http.post('/admin/admins', payload).then(r => r.data)
export const deleteAdmin              = (id)                    => http.delete(`/admin/admins/${id}`).then(r => r.data)
export const changeAdminPassword      = (id, new_password)      => http.put(`/admin/admins/${id}/password`, { new_password }).then(r => r.data)
export const updateAdminPermissions   = (id, permissions)       => http.patch(`/admin/admins/${id}/permissions`, { permissions }).then(r => r.data)
export const deleteEmployee      = (id)               => http.delete(`/admin/employees/${id}`).then(r => r.data)
export const fetchOverrides      = (params = {})      => http.get('/admin/overrides', { params }).then(r => r.data)

// ── 請假申請審核 ──────────────────────────────────────────────────────────────
export const fetchLeaveRequests      = (params = {})              => http.get('/admin/leave-requests', { params }).then(r => r.data)
export const approveLeaveRequest     = (id)                       => http.patch(`/admin/leave-requests/${id}/approve`).then(r => r.data)
export const rejectLeaveRequest      = (id, reject_reason = '')   => http.patch(`/admin/leave-requests/${id}/reject`, { reject_reason }).then(r => r.data)

// ── 補打卡申請審核 ─────────────────────────────────────────────────────────────
export const fetchOverrideRequests   = (params = {})              => http.get('/admin/override-requests', { params }).then(r => r.data)
export const approveOverrideRequest  = (id)                       => http.patch(`/admin/override-requests/${id}/approve`).then(r => r.data)
export const rejectOverrideRequest   = (id, reject_reason = '')   => http.patch(`/admin/override-requests/${id}/reject`, { reject_reason }).then(r => r.data)

// ── 職位管理 ──────────────────────────────────────────────────────────────────
export const fetchPositions           = ()                         => http.get('/admin/positions').then(r => r.data)
export const createPosition           = (payload)                  => http.post('/admin/positions', payload).then(r => r.data)
export const updatePosition           = (id, payload)              => http.put(`/admin/positions/${id}`, payload).then(r => r.data)
export const deletePosition           = (id)                       => http.delete(`/admin/positions/${id}`).then(r => r.data)
export const setEmployeePosition      = (empId, posId, applySalary = false) =>
  http.patch(`/admin/employees/${empId}/position`, null, { params: { ...(posId != null ? { position_id: posId } : {}), apply_salary: applySalary } }).then(r => r.data)

// ── 假別管理 ──────────────────────────────────────────────────────────────────
export const fetchLeaveTypes          = ()             => http.get('/admin/leave-types').then(r => r.data)
export const createLeaveType          = (payload)      => http.post('/admin/leave-types', payload).then(r => r.data)
export const updateLeaveType          = (id, payload)  => http.put(`/admin/leave-types/${id}`, payload).then(r => r.data)
export const deleteLeaveTypeApi       = (id)           => http.delete(`/admin/leave-types/${id}`).then(r => r.data)
export const fetchEmployeeLeaveTypes  = (empId)        => http.get(`/admin/employees/${empId}/leave-types`).then(r => r.data)
export const setEmployeeLeaveTypes    = (empId, ids)   => http.put(`/admin/employees/${empId}/leave-types`, ids).then(r => r.data)
export const fetchLeaveBalance        = (empId, year)  => http.get(`/admin/employees/${empId}/leave-balance`, { params: { year } }).then(r => r.data)
export const fetchLeaveRecords        = (empId, year)  => http.get(`/admin/employees/${empId}/leave-records`, { params: { year } }).then(r => r.data)
export const createLeaveRecord        = (empId, data)  => http.post(`/admin/employees/${empId}/leave-records`, data).then(r => r.data)
export const deleteLeaveRecord        = (id)           => http.delete(`/admin/leave-records/${id}`).then(r => r.data)
export const exportPayroll       = (year, month, employeeIds = [], columns = []) =>
  http.get('/admin/export/payroll', {
    params: {
      year, month,
      ...(employeeIds.length ? { employee_ids: employeeIds.join(',') } : {}),
      ...(columns.length    ? { columns: columns.join(',') }           : {}),
    },
    responseType: 'blob',
  }).then(r => r.data)

// ── 排班管理 ──────────────────────────────────────────────────────────────────
export const exportSchedule     = (year, month)   =>
  http.get('/admin/schedule/export',     { params: { year, month }, responseType: 'blob' }).then(r => r.data)
export const exportSchedulePdf  = (year, month)   =>
  http.get('/admin/schedule/export/pdf',      { params: { year, month }, responseType: 'blob' }).then(r => r.data)
export const exportSchedulePdfList = (year, month) =>
  http.get('/admin/schedule/export/pdf-list', { params: { year, month }, responseType: 'blob' }).then(r => r.data)
// ── 薪資模組 ──────────────────────────────────────────────────────────────────
export const fetchSalaryConfig       = (empId)           => http.get(`/admin/salary/config/${empId}`).then(r => r.data)
export const upsertSalaryConfig      = (empId, payload)  => http.put(`/admin/salary/config/${empId}`, payload).then(r => r.data)
export const fetchShiftSalary        = (shiftId)         => http.get(`/admin/salary/shift/${shiftId}`).then(r => r.data)
export const upsertShiftSalary       = (shiftId, payload)=> http.put(`/admin/salary/shift/${shiftId}`, payload).then(r => r.data)
export const importNationalHolidays  = (year, month)     => http.post('/admin/salary/holidays/import-national', null, { params: { year, ...(month ? { month } : {}) } }).then(r => r.data)
export const fetchHolidays           = (year, month)     => http.get('/admin/salary/holidays', { params: { year, month } }).then(r => r.data)
export const createHoliday           = (payload)         => http.post('/admin/salary/holidays', payload).then(r => r.data)
export const deleteHoliday           = (id)              => http.delete(`/admin/salary/holidays/${id}`).then(r => r.data)
export const fetchPayroll            = (year, month)     => http.get('/admin/salary/payroll', { params: { year, month } }).then(r => r.data)
export const calculatePayroll        = (year, month, employeeIds = []) =>
  http.post('/admin/salary/payroll/calculate', null, {
    params: { year, month, ...(employeeIds.length ? { employee_ids: employeeIds.join(',') } : {}) }
  }).then(r => r.data)
export const finalizePayroll         = (recordId)        => http.patch(`/admin/salary/payroll/${recordId}/finalize`).then(r => r.data)
export const fetchPayrollDetail      = (recordId)        => http.get(`/admin/salary/payroll/${recordId}/detail`).then(r => r.data)
export const upsertDayOverride       = (recordId, data)  => http.put(`/admin/salary/payroll/${recordId}/day-override`, data).then(r => r.data)
export const deleteDayOverride       = (recordId, date)  => http.delete(`/admin/salary/payroll/${recordId}/day-override/${date}`).then(r => r.data)

export const fetchMonthlyAttendance = (year, month, employeeId = null) =>
  http.get('/admin/attendance/monthly', { params: { year, month, ...(employeeId ? { employee_id: employeeId } : {}) } }).then(r => r.data)

export const fetchAnomalyReport  = (year, month, employeeId = null) =>
  http.get('/admin/salary/anomaly', { params: { year, month, ...(employeeId ? { employee_id: employeeId } : {}) } }).then(r => r.data)

export const fetchShifts        = ()              => http.get('/admin/schedule/shifts').then(r => r.data)
export const createShift        = (payload)       => http.post('/admin/schedule/shifts', payload).then(r => r.data)
export const updateShift        = (id, payload)   => http.patch(`/admin/schedule/shifts/${id}`, payload).then(r => r.data)
export const deleteShift        = (id)            => http.delete(`/admin/schedule/shifts/${id}`).then(r => r.data)
export const fetchSchedules     = (year, month)   => http.get('/admin/schedule/', { params: { year, month } }).then(r => r.data)
export const createSchedule     = (payload)       => http.post('/admin/schedule/', payload).then(r => r.data)
export const deleteSchedule     = (id)            => http.delete(`/admin/schedule/${id}`).then(r => r.data)
export const toggleScheduleOT   = (id)            => http.patch(`/admin/schedule/${id}/overtime`).then(r => r.data)
