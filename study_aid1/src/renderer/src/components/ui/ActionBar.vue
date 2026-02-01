<template>
  <div class="action-bar" :class="[`align-${align}`, { sticky, bordered }]">
    <div class="action-bar-left">
      <slot name="left" />
    </div>
    <div class="action-bar-center">
      <slot name="center" />
    </div>
    <div class="action-bar-right">
      <slot name="right">
        <el-button
          v-for="(action, index) in actions"
          :key="index"
          :type="action.type || 'default'"
          :icon="action.icon"
          :disabled="action.disabled"
          :loading="action.loading"
          :plain="action.plain"
          :circle="action.circle"
          @click="handleAction(action)"
        >
          {{ action.text }}
        </el-button>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

export interface Action {
  text: string
  type?: 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'text' | 'default'
  icon?: Component | string
  disabled?: boolean
  loading?: boolean
  plain?: boolean
  circle?: boolean
  handler?: () => void
  data?: any
}

interface Props {
  actions?: Action[]
  align?: 'left' | 'center' | 'right' | 'space-between'
  sticky?: boolean
  bordered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  actions: () => [],
  align: 'space-between',
  sticky: false,
  bordered: true
})

const emit = defineEmits<{
  (e: 'action', action: Action): void
}>()

const handleAction = (action: Action) => {
  if (action.handler) {
    action.handler()
  }
  emit('action', action)
}
</script>

<style lang="scss" scoped>
.action-bar {
  display: flex;
  gap: $spacing-sm;
  padding: $spacing-base;
  background-color: var(--el-bg-color);

  &.bordered {
    border-bottom: 1px solid var(--el-border-color-light);
  }

  &.sticky {
    position: sticky;
    top: 0;
    z-index: 100;
  }

  &.align-left {
    justify-content: flex-start;

    .action-bar-center,
    .action-bar-right {
      display: none;
    }
  }

  &.align-center {
    justify-content: center;

    .action-bar-left,
    .action-bar-right {
      display: none;
    }
  }

  &.align-right {
    justify-content: flex-end;

    .action-bar-left,
    .action-bar-center {
      display: none;
    }
  }

  &.align-space-between {
    justify-content: space-between;

    .action-bar-left,
    .action-bar-center,
    .action-bar-right {
      display: flex;
      gap: $spacing-sm;
    }

    .action-bar-left {
      flex: 1;
    }

    .action-bar-center {
      flex: 0 0 auto;
    }

    .action-bar-right {
      flex: 1;
      justify-content: flex-end;
    }
  }
}
</style>
