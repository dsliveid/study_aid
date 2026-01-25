<template>
  <div class="home-container">
    <!-- Sidebar -->
    <aside class="sidebar" :class="{ collapsed: appStore.sidebarCollapsed }">
      <div class="sidebar-header">
        <h1 v-if="!appStore.sidebarCollapsed" class="app-title">📚 学习助手</h1>
        <h1 v-else class="app-title">📚</h1>
      </div>

      <nav class="sidebar-nav">
        <router-link to="/notes" class="nav-item" active-class="active">
          <el-icon><Document /></el-icon>
          <span v-if="!appStore.sidebarCollapsed">笔记管理</span>
        </router-link>
        <router-link to="/video-learning" class="nav-item" active-class="active">
          <el-icon><VideoCamera /></el-icon>
          <span v-if="!appStore.sidebarCollapsed">视频学习</span>
        </router-link>
        <router-link to="/document-learning" class="nav-item" active-class="active">
          <el-icon><Reading /></el-icon>
          <span v-if="!appStore.sidebarCollapsed">文档学习</span>
        </router-link>
        <router-link to="/settings" class="nav-item" active-class="active">
          <el-icon><Setting /></el-icon>
          <span v-if="!appStore.sidebarCollapsed">设置</span>
        </router-link>
      </nav>

      <div class="sidebar-footer">
        <el-button
          :icon="appStore.sidebarCollapsed ? 'Expand' : 'Fold'"
          circle
          size="small"
          @click="appStore.toggleSidebar"
        />
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useAppStore } from '@/stores/app'

const appStore = useAppStore()

onMounted(() => {
  appStore.applyTheme()
})
</script>

<style lang="scss" scoped>
.home-container {
  display: flex;
  width: 100%;
  height: 100vh;
  overflow: hidden;
}

.sidebar {
  width: $sidebar-width;
  background-color: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
  display: flex;
  flex-direction: column;
  transition: width 0.3s;

  &.collapsed {
    width: $sidebar-collapsed-width;

    .app-title {
      font-size: 24px;
    }
  }

  .sidebar-header {
    padding: $spacing-lg;
    border-bottom: 1px solid var(--el-border-color-lighter);

    .app-title {
      font-size: $font-size-large;
      font-weight: 600;
      margin: 0;
      white-space: nowrap;
    }
  }

  .sidebar-nav {
    flex: 1;
    padding: $spacing-md;
    overflow-y: auto;

    .nav-item {
      display: flex;
      align-items: center;
      padding: $spacing-base;
      margin-bottom: $spacing-sm;
      border-radius: $border-radius-base;
      color: var(--el-text-color-regular);
      text-decoration: none;
      transition: all 0.3s;

      &:hover {
        background-color: var(--el-fill-color-light);
      }

      &.active {
        background-color: var(--el-color-primary);
        color: white;
      }

      .el-icon {
        margin-right: $spacing-md;
        font-size: $font-size-large;
      }

      span {
        white-space: nowrap;
      }
    }
  }

  .sidebar-footer {
    padding: $spacing-base;
    border-top: 1px solid var(--el-border-color-lighter);
    display: flex;
    justify-content: center;
  }
}

.main-content {
  flex: 1;
  overflow: hidden;
}
</style>
