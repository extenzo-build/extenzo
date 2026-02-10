<script setup lang="ts">
import { computed } from 'vue'
import Button from 'primevue/button'
import type { HTMLAttributes } from 'vue'

interface Props {
  size?: 'large' | 'normal' | 'small' | 'mini'
  type?: 'default' | 'primary' | 'success' | 'warning' | 'danger'
  icon?: string
  disabled?: boolean
  loading?: boolean
  class?: HTMLAttributes['class']
  onClick?: (e: Event) => void
}

const props = withDefaults(defineProps<Props>(), {
  size: 'normal',
  type: 'default',
  disabled: false,
  loading: false,
})

// 映射 vant-ui 的 size 到 PrimeVue 的 size
const mappedSize = computed<'small' | 'large' | undefined>(() => {
  const sizeMap: Record<string, 'small' | 'large' | undefined> = {
    'large': 'large',
    'normal': undefined,
    'small': 'small',
    'mini': 'small',
  }
  return sizeMap[props.size]
})

// 映射 vant-ui 的 type 到 PrimeVue 的 severity
const mappedSeverity = computed(() => {
  const severityMap: Record<string, 'secondary' | 'success' | 'info' | 'warn' | 'danger' | undefined> = {
    'default': 'secondary',
    'primary': undefined, // PrimeVue 默认就是 primary
    'success': 'success',
    'warning': 'warn',
    'danger': 'danger',
  }
  return severityMap[props.type]
})

// 处理点击事件
const handleClick = (e: Event) => {
  if (props.disabled || props.loading) {
    e.preventDefault()
    return
  }
  if (props.onClick) {
    props.onClick(e)
  }
}
</script>

<template>
  <Button
    :size="mappedSize"
    :severity="mappedSeverity"
    :disabled="disabled || loading"
    :loading="loading"
    :icon="icon"
    :class="['roll-ui-button', `roll-ui-button--${type}`, props.class]"
    @click="handleClick"
  >
    <slot />
  </Button>
</template>

<style scoped>
.roll-ui-button {
  cursor: pointer;
}

.roll-ui-button:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

/* 使用 vant-ui 的主题色 */
.roll-ui-button--primary :deep(.p-button) {
  background-color: var(--van-primary-color, #a494c6) !important;
  border-color: var(--van-primary-color, #a494c6) !important;
}

.roll-ui-button--primary :deep(.p-button:hover:not(:disabled)) {
  opacity: 0.9;
}

.roll-ui-button--success :deep(.p-button) {
  background-color: var(--van-success-color, #07c160) !important;
  border-color: var(--van-success-color, #07c160) !important;
}

.roll-ui-button--success :deep(.p-button:hover:not(:disabled)) {
  opacity: 0.9;
}

.roll-ui-button--warning :deep(.p-button) {
  background-color: var(--van-warning-color, #ff976a) !important;
  border-color: var(--van-warning-color, #ff976a) !important;
}

.roll-ui-button--warning :deep(.p-button:hover:not(:disabled)) {
  opacity: 0.9;
}

.roll-ui-button--danger :deep(.p-button) {
  background-color: var(--van-danger-color, #ee0a24) !important;
  border-color: var(--van-danger-color, #ee0a24) !important;
}

.roll-ui-button--danger :deep(.p-button:hover:not(:disabled)) {
  opacity: 0.9;
}
</style>

