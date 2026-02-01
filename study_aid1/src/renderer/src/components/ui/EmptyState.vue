<template>
  <div class="empty-state">
    <div v-if="icon" class="empty-state-icon">
      <component :is="icon" />
    </div>
    <div v-if="image" class="empty-state-image">
      <img :src="image" :alt="title" />
    </div>
    <h3 v-if="title" class="empty-state-title">{{ title }}</h3>
    <p v-if="description" class="empty-state-description">{{ description }}</p>
    <div v-if="$slots.actions" class="empty-state-actions">
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Component } from 'vue'

interface Props {
  icon?: Component
  image?: string
  title?: string
  description?: string
}

withDefaults(defineProps<Props>(), {
  title: '',
  description: ''
})
</script>

<style lang="scss" scoped>
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: $spacing-xl;
  text-align: center;
  min-height: 200px;

  .empty-state-icon {
    font-size: 64px;
    color: var(--el-text-color-placeholder);
    margin-bottom: $spacing-base;
  }

  .empty-state-image {
    margin-bottom: $spacing-base;

    img {
      max-width: 200px;
      max-height: 200px;
      object-fit: contain;
    }
  }

  .empty-state-title {
    margin: 0 0 $spacing-sm 0;
    font-size: $font-size-large;
    color: var(--el-text-color-primary);
  }

  .empty-state-description {
    margin: 0 0 $spacing-base 0;
    font-size: $font-size-base;
    color: var(--el-text-color-secondary);
    max-width: 400px;
  }

  .empty-state-actions {
    display: flex;
    gap: $spacing-sm;
    margin-top: $spacing-base;
  }
}
</style>
