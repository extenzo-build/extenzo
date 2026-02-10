<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import Slider from 'primevue/slider'
import type { HTMLAttributes } from 'vue'

interface Props {
  modelValue?: number
  min?: number | string
  max?: number | string
  step?: number | string
  disabled?: boolean
  barHeight?: string
  class?: HTMLAttributes['class']
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: 0,
  min: 0,
  max: 100,
  step: 1,
  disabled: false,
  barHeight: '4px',
})

const emits = defineEmits<{
  'update:modelValue': [value: number]
}>()

// 转换 props 为数字类型
const minNum = computed(() => Number(props.min))
const maxNum = computed(() => Number(props.max))
const stepNum = computed(() => Number(props.step))

// PrimeVue Slider 使用单个数值
const sliderValue = ref(props.modelValue)

// 监听外部 modelValue 变化
watch(() => props.modelValue, (newVal) => {
  if (sliderValue.value !== newVal) {
    sliderValue.value = newVal
  }
}, { immediate: true })

// 监听内部值变化
watch(sliderValue, (newVal) => {
  if (newVal !== props.modelValue) {
    emits('update:modelValue', newVal)
  }
})

// 自定义样式，支持 bar-height
const sliderStyle = computed(() => {
  return {
    '--slider-bar-height': props.barHeight,
  }
})
</script>

<template>
  <div :style="sliderStyle" class="roll-ui-slider-wrapper">
    <div class="roll-ui-slider-container">
      <Slider
        v-model="sliderValue"
        :min="minNum"
        :max="maxNum"
        :step="stepNum"
        :disabled="disabled"
        :class="['roll-ui-slider', props.class]"
      />
      <div v-if="$slots.button" class="roll-ui-slider-button">
        <slot name="button" />
      </div>
    </div>
  </div>
</template>

<style scoped>
.roll-ui-slider-wrapper {
  position: relative;
  width: 100%;
}

.roll-ui-slider-container {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
}

.roll-ui-slider {
  flex: 1;
}

.roll-ui-slider-button {
  flex-shrink: 0;
}

/* 支持 bar-height 自定义 */
.roll-ui-slider :deep(.p-slider-range) {
  height: var(--slider-bar-height, 4px);
  background-color: var(--van-primary-color, #a494c6);
}

.roll-ui-slider :deep(.p-slider-handle) {
  border-color: var(--van-primary-color, #a494c6);
}

.roll-ui-slider :deep(.p-slider-handle:hover) {
  border-color: var(--van-primary-color, #a494c6);
}

.roll-ui-slider :deep(.p-slider-handle:focus) {
  box-shadow: 0 0 0 2px var(--van-primary-color, #a494c6);
}
</style>

