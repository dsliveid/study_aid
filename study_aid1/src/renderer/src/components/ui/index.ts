/**
 * UI Components Library
 * Reusable UI components for the application
 */

import Card from './Card.vue'
import EmptyState from './EmptyState.vue'
import LoadingState from './LoadingState.vue'
import InfoList from './InfoList.vue'
import ActionBar from './ActionBar.vue'
import StatusTag from './StatusTag.vue'

export {
  Card,
  EmptyState,
  LoadingState,
  InfoList,
  ActionBar,
  StatusTag
}

// Re-export types
export type { InfoItem } from './InfoList.vue'
export type { Action } from './ActionBar.vue'

// Global registration helper
export function registerUIComponents(app: any) {
  app.component('UiCard', Card)
  app.component('UiEmptyState', EmptyState)
  app.component('UiLoadingState', LoadingState)
  app.component('UiInfoList', InfoList)
  app.component('UiActionBar', ActionBar)
  app.component('UiStatusTag', StatusTag)
}
