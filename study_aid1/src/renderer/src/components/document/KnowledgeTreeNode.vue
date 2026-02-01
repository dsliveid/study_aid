<template>
  <div class="knowledge-tree-node" :class="`level-${node.level}`">
    <div class="node-content" @click="toggleExpand">
      <el-icon class="expand-icon" :class="{ expanded: isExpanded }">
        <ArrowRight />
      </el-icon>
      <span class="node-title">{{ node.title }}</span>
      <el-tag
        v-if="node.importance"
        :type="getImportanceType(node.importance)"
        size="small"
        class="importance-tag"
      >
        {{ getImportanceLabel(node.importance) }}
      </el-tag>
    </div>
    <div v-if="isExpanded && node.children && node.children.length > 0" class="node-children">
      <KnowledgeTreeNode
        v-for="(child, index) in node.children"
        :key="index"
        :node="child"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ArrowRight } from '@element-plus/icons-vue'

interface TreeNode {
  title: string
  level: number
  importance: 'high' | 'medium' | 'low'
  children: TreeNode[]
}

const props = defineProps<{
  node: TreeNode
}>()

const isExpanded = ref(props.node.level < 2) // Auto-expand first 2 levels

const toggleExpand = () => {
  if (props.node.children && props.node.children.length > 0) {
    isExpanded.value = !isExpanded.value
  }
}

const getImportanceType = (importance: string) => {
  const types: Record<string, any> = {
    high: 'danger',
    medium: 'warning',
    low: 'info'
  }
  return types[importance] || 'info'
}

const getImportanceLabel = (importance: string) => {
  const labels: Record<string, string> = {
    high: '重要',
    medium: '中等',
    low: '一般'
  }
  return labels[importance] || '一般'
}
</script>

<style lang="scss" scoped>
.knowledge-tree-node {
  margin-left: $spacing-base;

  &.level-0 {
    margin-left: 0;
  }

  .node-content {
    display: flex;
    align-items: center;
    gap: $spacing-xs;
    padding: $spacing-xs $spacing-sm;
    cursor: pointer;
    border-radius: $border-radius-small;
    transition: background-color 0.2s;

    &:hover {
      background-color: var(--el-fill-color-light);
    }

    .expand-icon {
      transition: transform 0.2s;
      flex-shrink: 0;

      &.expanded {
        transform: rotate(90deg);
      }

      &.el-icon {
        &:empty {
          display: none;
        }
      }
    }

    .node-title {
      flex: 1;
      font-size: $font-size-base;
    }

    .importance-tag {
      flex-shrink: 0;
    }
  }

  .node-children {
    margin-left: $spacing-lg;
  }
}
</style>
