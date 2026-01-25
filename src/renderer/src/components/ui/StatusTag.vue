<template>
  <el-tag
    :type="tagType"
    :effect="effect"
    :size="size"
    :round="round"
    :closable="closable"
    @close="handleClose"
  >
    <el-icon v-if="icon" class="status-icon">
      <component :is="icon" />
    </el-icon>
    <span v-if="text">{{ text }}</span>
    <slot v-else />
  </el-tag>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { Component } from 'vue'

type StatusType = 'success' | 'warning' | 'danger' | 'info' | 'primary'

interface Props {
  status?: StatusType | 'active' | 'inactive' | 'pending' | 'processing' | 'error' | 'warning' | 'success'
  text?: string
  icon?: Component
  size?: 'large' | 'default' | 'small'
  effect?: 'dark' | 'light' | 'plain'
  round?: boolean
  closable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'default',
  effect: 'light',
  round: false,
  closable: false
})

const emit = defineEmits<{
  (e: 'close'): void
}>()

const tagType = computed(() => {
  const typeMap: Record<string, StatusType> = {
    active: 'success',
    inactive: 'info',
    pending: 'warning',
    processing: 'primary',
    error: 'danger',
    warning: 'warning',
    success: 'success'
  }

  const status = props.status || 'info'
  return typeMap[status] || (status as StatusType)
})

const handleClose = () => {
  emit('close')
}
</script>

<style lang="scss" scoped>
.status-icon {
  margin-right: $spacing-xs;
}
</style>
