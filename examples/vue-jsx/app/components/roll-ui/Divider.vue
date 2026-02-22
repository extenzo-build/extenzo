<script setup lang="ts">
import { computed, useSlots } from 'vue'
import Divider from 'primevue/divider'
import type { HTMLAttributes } from 'vue'

interface Props {
  class?: HTMLAttributes['class']
  vertical?: boolean
}

const props = defineProps<Props>()
const slots = useSlots()

const hasContent = computed(() => {
  return !!slots.default
})
</script>

<template>
  <div
    :class="[
      'roll-ui-divider',
      {
        'roll-ui-divider--vertical': vertical,
        'roll-ui-divider--horizontal': !vertical,
        'roll-ui-divider--with-content': hasContent,
      },
      props.class,
    ]"
  >
    <Divider
      v-if="!hasContent"
      :layout="vertical ? 'vertical' : 'horizontal'"
      class="roll-ui-divider__line"
    />
    <template v-else>
      <Divider
        :layout="vertical ? 'vertical' : 'horizontal'"
        class="roll-ui-divider__line roll-ui-divider__line--left"
      />
      <span class="roll-ui-divider__content">
        <slot />
      </span>
      <Divider
        :layout="vertical ? 'vertical' : 'horizontal'"
        class="roll-ui-divider__line roll-ui-divider__line--right"
      />
    </template>
  </div>
</template>

<style scoped>
.roll-ui-divider {
  display: flex;
  align-items: center;
  width: 100%;
}

.roll-ui-divider--vertical {
  flex-direction: column;
  width: auto;
  height: 100%;
}

.roll-ui-divider--with-content {
  gap: 0.5rem;
}

.roll-ui-divider__line {
  flex: 1;
  /* 使用 vant-ui 的分割线颜色 */
  background-color: var(--van-divider-border-color, var(--van-border-color, #ebedf0)) !important;
}

.roll-ui-divider__line--left,
.roll-ui-divider__line--right {
  flex: 0 0 auto;
}

.roll-ui-divider--vertical .roll-ui-divider__line {
  width: 1px;
  height: 100%;
}

.roll-ui-divider--vertical .roll-ui-divider__line--left,
.roll-ui-divider--vertical .roll-ui-divider__line--right {
  width: 1px;
  height: auto;
}

.roll-ui-divider__content {
  flex-shrink: 0;
  padding: 0 0.5rem;
  color: var(--van-text-color, var(--van-text-color-2, #969799));
}
</style>

