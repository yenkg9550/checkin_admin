<template>
  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
html, body { height: 100%; overflow: hidden; margin: 0; max-width: 100vw; overflow-x: hidden; font-size: 16px; }
* { box-sizing: border-box; }
#app { height: 100%; background: #0f172a; overflow-x: hidden; font-size: 16px; }

/* ── 淺色模式 CSS 變數 ──────────────────────────────────── */
:root {
  --el-font-size-base:        16px;
  --el-font-size-small:       15px;
  --el-font-size-extra-small: 14px;

  --bg-app:        #e8edf3;
  --bg-card:       #f1f5f9;
  --bg-inner:      #dde3ec;
  --text-primary:  #1e293b;
  --text-secondary:#64748b;
  --text-muted:    #94a3b8;
  --border-color:  #c8d0db;
  --divider:       #dde3ec;
}

/* ── 深色模式 CSS 變數 ──────────────────────────────────── */
:root.dark {
  --bg-app:        #0f172a;
  --bg-card:       #1e293b;
  --bg-inner:      #0f172a;
  --text-primary:  #ffffff;
  --text-secondary:#ffffff;
  --text-muted:    #ffffff;
  --border-color:  rgba(255,255,255,0.08);
  --divider:       rgba(255,255,255,0.06);
}

/* ── dialog overlay 防橫移 ──────────────────────────────────── */
.el-overlay {
  overflow-x: hidden !important;
}
.el-overlay .el-dialog__wrapper {
  overflow-x: hidden !important;
}

@media (max-width: 768px) {
  .el-overlay .el-dialog {
    --el-dialog-width: 360px !important;
  }
  .btn-text {
    display: none !important;
  }
  /* 強制手機字體固定 14px */
  html, body, #app { font-size: 14px !important; }
  * { font-size: inherit; }
  .el-input__inner,
  .el-textarea__inner,
  .el-select__placeholder,
  .el-select-dropdown__item,
  .el-form-item__label,
  .el-radio__label,
  .el-checkbox__label,
  .el-table__cell,
  .el-tag,
  .el-button { font-size: 14px !important; }
}

/* ── 讀取動畫：固定在視窗正中央，不顯示背景與文字 ────────── */
.el-loading-mask {
  position: fixed !important;
  background: transparent !important;
}
.el-loading-text {
  display: none !important;
}

.page-enter-active, .page-leave-active { transition: opacity .1s }
.page-enter-from, .page-leave-to { opacity: 0 }

/* ── El-button 尺寸放大 ────────────────────────────────────── */
/* ── 全站統一按鈕尺寸 ──────────────────────────────────────── */
.el-button,
.el-button--small,
.el-button--large {
  padding: 5px 30px !important;
  font-size: 16px !important;
  height: auto !important;
  line-height: 1.4 !important;
  border-radius: 8px !important;
  font-weight: 600 !important;
  transition: background .15s, transform .1s, box-shadow .15s, border-color .15s !important;
}
.el-button:not(.is-disabled):hover {
  transform: translateY(-1px) !important;
}
.el-button:not(.is-disabled):active {
  transform: translateY(0) !important;
}

/* primary */
.el-button--primary:not(.is-disabled) {
  box-shadow: 0 2px 8px rgba(59,130,246,0.35) !important;
}
.el-button--primary:not(.is-disabled):hover {
  box-shadow: 0 4px 14px rgba(59,130,246,0.45) !important;
}

/* danger */
.el-button--danger:not(.is-disabled) {
  box-shadow: 0 2px 8px rgba(239,68,68,0.3) !important;
}
.el-button--danger:not(.is-disabled):hover {
  box-shadow: 0 4px 14px rgba(239,68,68,0.4) !important;
}

/* success */
.el-button--success:not(.is-disabled) {
  box-shadow: 0 2px 8px rgba(16,185,129,0.3) !important;
}
.el-button--success:not(.is-disabled):hover {
  box-shadow: 0 4px 14px rgba(16,185,129,0.4) !important;
}

/* warning */
.el-button--warning:not(.is-disabled) {
  box-shadow: 0 2px 8px rgba(245,158,11,0.3) !important;
}
.el-button--warning:not(.is-disabled):hover {
  box-shadow: 0 4px 14px rgba(245,158,11,0.4) !important;
}

/* default（無 type） */
.el-button.el-button--default:not(.is-disabled) {
  box-shadow: 0 2px 6px rgba(0,0,0,0.08) !important;
}
.el-button.el-button--default:not(.is-disabled):hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.13) !important;
}

/* ── el-card 跟著主題背景走 ─────────────────────────────────── */
.el-card {
  background: var(--bg-card) !important;
  border-color: var(--border-color) !important;
}
.el-card__body {
  background: var(--bg-card) !important;
}

/* 深色模式：強制所有 el-button 有實體背景 */
.dark .el-button--default {
  background: #334155 !important;
  border-color: #475569 !important;
  color: #ffffff !important;
}
.dark .el-button--default:hover {
  background: #475569 !important;
  border-color: #64748b !important;
}
.dark .el-button--default.is-disabled {
  background: #1e293b !important;
  border-color: #334155 !important;
  color: #64748b !important;
}
</style>