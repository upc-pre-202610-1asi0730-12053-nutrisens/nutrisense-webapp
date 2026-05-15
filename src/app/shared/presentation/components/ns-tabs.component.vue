<!-- PATH: src/app/shared/presentation/components/ns-tabs.component.vue -->
<script setup>
defineProps({
  modelValue: { type: String, required: true },
  tabs: {
    type: Array,
    required: true,
    // [{ value: string, label: string, icon?: string, disabled?: boolean }]
  },
  size: { type: String, default: 'md' }, // 'md' | 'sm'
})

defineEmits(['update:modelValue'])
</script>

<template>
  <div class="tabs" :class="{ 'tabs--sm': size === 'sm' }" role="tablist">
    <button
      v-for="tab in tabs"
      :key="tab.value"
      class="tab"
      :class="{ 'tab--active': modelValue === tab.value }"
      :disabled="tab.disabled"
      role="tab"
      :aria-selected="modelValue === tab.value"
      @click="!tab.disabled && $emit('update:modelValue', tab.value)"
    >
      <i v-if="tab.icon" :class="['pi', tab.icon]" aria-hidden="true" />
      {{ tab.label }}
    </button>
  </div>
</template>

<style scoped>
.tabs {
  display: inline-flex;
  gap: 2px;
  background: #eef0f2;
  border-radius: 12px;
  padding: 3px;
  box-shadow: inset 0 1px 3px rgba(0,0,0,0.07);
}

.tab {
  padding: 0.46875rem 1.125rem;
  border: none;
  background: transparent;
  border-radius: 9px;
  font-size: 0.8125rem;
  font-weight: 500;
  color: #78818c;
  cursor: pointer;
  font-family: 'Poppins', sans-serif;
  display: flex;
  align-items: center;
  gap: 0.3125rem;
  white-space: nowrap;
  line-height: 1.4;
  user-select: none;
  letter-spacing: 0.005em;
  transition: background 0.2s cubic-bezier(0.4,0,0.2,1),
              color      0.2s cubic-bezier(0.4,0,0.2,1),
              box-shadow 0.2s cubic-bezier(0.4,0,0.2,1);
}

.tab:hover:not(:disabled):not(.tab--active) {
  color: #374151;
  background: rgba(255,255,255,0.6);
}

.tab--active {
  background: #ffffff;
  color: var(--color-primary);
  font-weight: 700;
  box-shadow: 0 1px 3px rgba(0,0,0,0.10), 0 2px 8px rgba(0,0,0,0.06);
}

.tab:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

/* Compact — para range selectors dentro de panels/headers */
.tabs--sm {
  border-radius: 9px;
  padding: 2px;
  gap: 1px;
}

.tabs--sm .tab {
  padding: 0.3125rem 0.75rem;
  border-radius: 7px;
  font-size: 0.75rem;
  letter-spacing: 0.01em;
}
</style>
