<template>
  <div class="info-list" :class="[`layout-${layout}`, { bordered }]">
    <div
      v-for="(item, index) in items"
      :key="index"
      class="info-list-item"
      :class="{ clickable: item.clickable }"
      @click="handleClick(item)"
    >
      <div v-if="item.icon" class="item-icon">
        <el-icon>
          <component :is="item.icon" />
        </el-icon>
      </div>
      <div class="item-content">
        <div class="item-label">{{ item.label }}</div>
        <div class="item-value">
          <slot name="value" :item="item">
            {{ item.value }}
          </slot>
        </div>
      </div>
      <div v-if="item.extra" class="item-extra">
        <slot name="extra" :item="item">
          {{ item.extra }}
        </slot>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

export interface InfoItem {
  label: string
  value: string | number
  icon?: Component
  extra?: string
  clickable?: boolean
  data?: any
}

interface Props {
  items: InfoItem[]
  layout?: 'vertical' | 'horizontal'
  bordered?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  layout: 'vertical',
  bordered: true
})

const emit = defineEmits<{
  (e: 'click', item: InfoItem): void
}>()

const handleClick = (item: InfoItem) => {
  if (item.clickable) {
    emit('click', item)
  }
}
</script>

<style lang="scss" scoped>
.info-list {
  &.layout-vertical {
    .info-list-item {
      flex-direction: row;
      align-items: center;
    }

    .item-content {
      flex: 1;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  }

  &.layout-horizontal {
    .info-list-item {
      flex-direction: column;
      align-items: flex-start;
    }

    .item-content {
      display: block;
      width: 100%;
    }
  }

  &.bordered {
    .info-list-item {
      border-bottom: 1px solid var(--el-border-color-lighter);

      &:last-child {
        border-bottom: none;
      }
    }
  }

  .info-list-item {
    display: flex;
    gap: $spacing-sm;
    padding: $spacing-sm $spacing-base;
    transition: background-color 0.2s;

    &.clickable {
      cursor: pointer;

      &:hover {
        background-color: var(--el-fill-color-light);
      }
    }

    .item-icon {
      font-size: 20px;
      color: var(--el-color-primary);
      flex-shrink: 0;
    }

    .item-content {
      flex: 1;
      min-width: 0;

      .item-label {
        font-size: $font-size-small;
        color: var(--el-text-color-secondary);
        margin-bottom: $spacing-xs;
      }

      .item-value {
        font-size: $font-size-base;
        color: var(--el-text-color-primary);
        font-weight: 500;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
    }

    .item-extra {
      font-size: $font-size-small;
      color: var(--el-text-color-secondary);
      flex-shrink: 0;
    }
  }
}
</style>
