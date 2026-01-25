<template>
  <div class="ui-card" :class="[`variant-${variant}`, { hoverable, shadow, bordered }]" :style="customStyle">
    <div v-if="$slots.header || title" class="ui-card-header">
      <div class="header-content">
        <div v-if="icon" class="header-icon">
          <el-icon>
            <component :is="icon" />
          </el-icon>
        </div>
        <div class="header-title">
          <slot name="header">
            <h3>{{ title }}</h3>
            <p v-if="subtitle">{{ subtitle }}</p>
          </slot>
        </div>
      </div>
      <div v-if="$slots.extra" class="header-extra">
        <slot name="extra" />
      </div>
    </div>

    <div v-if="$slots.default" class="ui-card-body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="ui-card-footer">
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'
import type { CSSProperties } from 'vue'

interface Props {
  title?: string
  subtitle?: string
  icon?: Component
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  hoverable?: boolean
  shadow?: 'always' | 'hover' | 'never'
  bordered?: boolean
  customStyle?: CSSProperties
}

withDefaults(defineProps<Props>(), {
  title: '',
  subtitle: '',
  variant: 'default',
  hoverable: false,
  shadow: 'always',
  bordered: true,
  customStyle: () => ({})
})
</script>

<style lang="scss" scoped>
.ui-card {
  background-color: var(--el-bg-color);
  border-radius: $border-radius-base;
  transition: all 0.3s ease;

  &.bordered {
    border: 1px solid var(--el-border-color-light);
  }

  &.shadow-always {
    box-shadow: $box-shadow-light;
  }

  &.shadow-hover {
    box-shadow: none;

    &:hover {
      box-shadow: $box-shadow-light;
    }
  }

  &.shadow-never {
    box-shadow: none;
  }

  &.hoverable {
    cursor: pointer;

    &:hover {
      transform: translateY(-2px);
      box-shadow: $box-shadow-base;
    }
  }

  // Variant styles
  &.variant-primary {
    border-color: var(--el-color-primary-light-7);

    .ui-card-header {
      background-color: var(--el-color-primary-light-9);
      border-bottom-color: var(--el-color-primary-light-7);
    }
  }

  &.variant-success {
    border-color: var(--el-color-success-light-7);

    .ui-card-header {
      background-color: var(--el-color-success-light-9);
      border-bottom-color: var(--el-color-success-light-7);
    }
  }

  &.variant-warning {
    border-color: var(--el-color-warning-light-7);

    .ui-card-header {
      background-color: var(--el-color-warning-light-9);
      border-bottom-color: var(--el-color-warning-light-7);
    }
  }

  &.variant-danger {
    border-color: var(--el-color-danger-light-7);

    .ui-card-header {
      background-color: var(--el-color-danger-light-9);
      border-bottom-color: var(--el-color-danger-light-7);
    }
  }

  .ui-card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: $spacing-base;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .header-content {
      display: flex;
      align-items: center;
      gap: $spacing-sm;

      .header-icon {
        font-size: 24px;
        color: var(--el-color-primary);
      }

      .header-title {
        h3 {
          margin: 0;
          font-size: $font-size-medium;
          font-weight: 500;
          color: var(--el-text-color-primary);
        }

        p {
          margin: $spacing-xs 0 0 0;
          font-size: $font-size-small;
          color: var(--el-text-color-secondary);
        }
      }
    }

    .header-extra {
      display: flex;
      align-items: center;
      gap: $spacing-xs;
    }
  }

  .ui-card-body {
    padding: $spacing-base;
  }

  .ui-card-footer {
    padding: $spacing-base;
    border-top: 1px solid var(--el-border-color-lighter);
  }
}
</style>
