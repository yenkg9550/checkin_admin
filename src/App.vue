<template>
  <router-view v-slot="{ Component }">
    <transition name="page" mode="out-in">
      <component :is="Component" />
    </transition>
  </router-view>
</template>

<style>
html, body { height: 100%; overflow: hidden; margin: 0; }
html { font-size: 17px; }
#app { height: 100%; background: #0f172a; }

/* ── Element Plus 全域字型放大 ──────────────────────────── */
:root {
  --el-font-size-base:        16px;
  --el-font-size-small:       14px;
  --el-font-size-extra-small: 13px;
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
</style>