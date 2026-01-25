<template>
  <div class="loading-state" :class="{ fullscreen }">
    <div class="loading-content">
      <div v-if="spinner" class="loading-spinner">
        <el-icon class="is-loading" :size="spinnerSize">
          <Loading />
        </el-icon>
      </div>
      <div v-else class="loading-dots">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
      <p v-if="text" class="loading-text">{{ text }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { Loading } from '@element-plus/icons-vue'

interface Props {
  text?: string
  spinner?: boolean
  spinnerSize?: number
  fullscreen?: boolean
}

withDefaults(defineProps<Props>(), {
  text: '加载中...',
  spinner: true,
  spinnerSize: 40,
  fullscreen: false
})
</script>

<style lang="scss" scoped>
.loading-state {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl;

  &.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: rgba(255, 255, 255, 0.9);
    z-index: 9999;
  }

  .loading-content {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: $spacing-base;
  }

  .loading-spinner {
    color: var(--el-color-primary);
  }

  .loading-dots {
    display: flex;
    gap: $spacing-xs;

    .dot {
      width: 12px;
      height: 12px;
      background-color: var(--el-color-primary);
      border-radius: 50%;
      animation: bounce 1.4s infinite ease-in-out both;

      &:nth-child(1) {
        animation-delay: -0.32s;
      }

      &:nth-child(2) {
        animation-delay: -0.16s;
      }
    }
  }

  .loading-text {
    margin: 0;
    font-size: $font-size-base;
    color: var(--el-text-color-secondary);
  }
}

@keyframes bounce {
  0%,
  80%,
  100% {
    transform: scale(0);
  }
  40% {
    transform: scale(1);
  }
}
</style>
