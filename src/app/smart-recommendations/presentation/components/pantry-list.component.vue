<!-- PATH: src/app/smart-recommendations/presentation/components/pantry-list.component.vue -->
<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'

const props = defineProps({
  pantryItems:       { type: Array,   required: true },
  ingredientCatalog: { type: Array,   required: true },
  loading:           { type: Boolean, default: false },
})

const emit = defineEmits(['remove', 'update-quantity'])
const { t } = useI18n()

/** @type {import('vue').Ref<ReturnType<import('../../domain/model/pantry-item.entity.js').PantryItem>|null>} */
const editingItem = ref(null)
/** @type {import('vue').Ref<number>} */
const editingQty = ref(0)

/** @type {import('vue').ComputedRef<boolean>} */
const showEditDialog = computed(() => editingItem.value !== null)

/**
 * Resolves the translated name of an ingredient by its ID.
 * @param {string} ingredientId
 * @returns {string}
 */
function ingredientName(ingredientId) {
  const found = props.ingredientCatalog.find(i => i.id === ingredientId)
  return found ? t(found.key) : ingredientId
}

/**
 * Resolves the translated category label of an ingredient by its ID.
 * @param {string} ingredientId
 * @returns {string}
 */
function ingredientCategory(ingredientId) {
  const found = props.ingredientCatalog.find(i => i.id === ingredientId)
  return found ? t('ingredient.category.' + found.category.value) : ''
}

/**
 * Opens the edit dialog for the given pantry item.
 * @param {ReturnType<import('../../domain/model/pantry-item.entity.js').PantryItem>} item
 */
function openEditDialog(item) {
  editingItem.value = item
  editingQty.value = item.quantity
}

/** Closes the edit dialog without saving. */
function closeEditDialog() {
  editingItem.value = null
  editingQty.value = 0
}

/** Emits the quantity update and closes the dialog. */
function confirmEdit() {
  if (editingItem.value && editingQty.value > 0) {
    emit('update-quantity', { id: editingItem.value.id, quantity: editingQty.value })
  }
  closeEditDialog()
}
</script>

<template>
  <div class="pantry-panel" role="list" :aria-label="t('recommendations.pantry')">

    <!-- Loading -->
    <div v-if="loading" class="pantry-panel__body--loading">
      <pv-skeleton v-for="i in 4" :key="i" height="60px" border-radius="8px" />
    </div>

    <!-- Empty -->
    <div v-else-if="!pantryItems.length" class="pantry-panel__empty">
      <div class="pantry-panel__empty-icon-wrap" aria-hidden="true">
        <i class="pi pi-shopping-bag" />
      </div>
      <span class="pantry-panel__empty-title">{{ t('recommendations.pantryEmpty') }}</span>
      <span class="pantry-panel__empty-hint">{{ t('recommendations.pantryEmptyHint') }}</span>
    </div>

    <!-- Items -->
    <ul v-else class="pantry-panel__list">
      <li
        v-for="item in pantryItems"
        :key="item.id"
        class="pantry-item"
        role="listitem"
      >
        <div class="pantry-item__body">
          <span class="pantry-item__name">{{ ingredientName(item.ingredientId) }}</span>
          <span class="pantry-item__meta">
            <span class="pantry-item__cat">{{ ingredientCategory(item.ingredientId) }}</span>
            <span class="pantry-item__sep" aria-hidden="true">·</span>
            <span class="pantry-item__qty">{{ formatNum(item.quantity) }} {{ item.unit }}</span>
          </span>
        </div>
        <div class="pantry-item__actions">
          <pv-button
            icon="pi pi-pencil"
            text
            rounded
            severity="secondary"
            size="small"
            :aria-label="t('recommendations.editQuantity')"
            @click="openEditDialog(item)"
          />
          <pv-button
            icon="pi pi-trash"
            text
            rounded
            severity="danger"
            size="small"
            :aria-label="t('recommendations.removeFromPantry')"
            @click="emit('remove', item.id)"
          />
        </div>
      </li>
    </ul>

  </div>

  <!-- Edit quantity dialog -->
  <pv-dialog
    :visible="showEditDialog"
    :header="t('recommendations.editQuantity')"
    :modal="true"
    :draggable="false"
    style="width:380px;max-width:95vw"
    @update:visible="val => !val && closeEditDialog()"
  >
    <div v-if="editingItem" class="edit-qty-dialog">

      <div class="edit-qty-dialog__ingredient">
        <div class="edit-qty-dialog__ingredient-icon" aria-hidden="true">
          <i class="pi pi-box" />
        </div>
        <div class="edit-qty-dialog__ingredient-info">
          <span class="edit-qty-dialog__ingredient-name">{{ ingredientName(editingItem.ingredientId) }}</span>
          <span class="edit-qty-dialog__ingredient-cat">{{ ingredientCategory(editingItem.ingredientId) }}</span>
        </div>
      </div>

      <div class="edit-qty-dialog__current">
        <span class="edit-qty-dialog__current-label">{{ t('recommendations.currentQuantity') }}</span>
        <span class="edit-qty-dialog__current-value">{{ formatNum(editingItem.quantity) }} {{ editingItem.unit }}</span>
      </div>

      <div class="edit-qty-dialog__field">
        <label class="edit-qty-dialog__label" for="edit-qty-input">
          {{ t('recommendations.quantity') }}
        </label>
        <div class="edit-qty-dialog__input-row">
          <pv-input-number
            id="edit-qty-input"
            v-model="editingQty"
            :min="1"
            :max="99999"
            :aria-label="t('recommendations.quantity')"
            class="edit-qty-dialog__input"
            @keydown.enter="confirmEdit"
          />
          <span class="edit-qty-dialog__unit">{{ editingItem.unit }}</span>
        </div>
      </div>

    </div>
    <template #footer>
      <pv-button
        :label="t('recommendations.cancel')"
        text
        @click="closeEditDialog"
      />
      <pv-button
        :label="t('common.save')"
        icon="pi pi-check"
        :disabled="!editingQty || editingQty <= 0"
        @click="confirmEdit"
      />
    </template>
  </pv-dialog>
</template>

<style scoped>
.pantry-panel {
  border: 1px solid var(--color-border);
  border-radius: 14px;
  overflow: hidden;
  background: var(--color-surface, #fafaf9);
}

/* ── Loading ── */
.pantry-panel__body--loading {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 1rem;
}

/* ── Empty ── */
.pantry-panel__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.375rem;
  padding: 3rem 1.5rem;
  text-align: center;
}

.pantry-panel__empty-icon-wrap {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: var(--color-border);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 0.5rem;
}

.pantry-panel__empty-icon-wrap .pi {
  font-size: 1.375rem;
  color: var(--color-text-secondary);
}

.pantry-panel__empty-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
}

.pantry-panel__empty-hint {
  font-size: 0.8125rem;
  color: var(--color-text-secondary);
  max-width: 22ch;
  line-height: 1.5;
}

/* ── List ── */
.pantry-panel__list {
  list-style: none;
  margin: 0;
  padding: 0;
}

/* ── Item ── */
.pantry-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: #fff;
  border-bottom: 1px solid var(--color-border);
  transition: background 0.12s;
}

.pantry-item:last-child { border-bottom: none; }
.pantry-item:hover { background: #faf8f6; }

.pantry-item__body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.pantry-item__name {
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pantry-item__meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.pantry-item__sep { opacity: 0.4; }

.pantry-item__qty { font-weight: 500; }

.pantry-item__actions {
  display: flex;
  align-items: center;
  gap: 0.125rem;
  flex-shrink: 0;
}

/* ── Edit dialog ── */
.edit-qty-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 0.25rem 0 0.25rem;
}

.edit-qty-dialog__ingredient {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.875rem 1rem;
  background: var(--color-surface, #fafaf9);
  border: 1px solid var(--color-border);
  border-radius: 12px;
}

.edit-qty-dialog__ingredient-icon {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: rgba(80,139,137,0.10);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.edit-qty-dialog__ingredient-icon .pi {
  font-size: 1rem;
  color: var(--color-primary);
}

.edit-qty-dialog__ingredient-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.edit-qty-dialog__ingredient-name {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.edit-qty-dialog__ingredient-cat {
  font-size: 0.75rem;
  color: var(--color-text-secondary);
}

.edit-qty-dialog__current {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 0.875rem;
  background: #f5f3f1;
  border-radius: 8px;
  font-size: 0.8125rem;
}

.edit-qty-dialog__current-label {
  color: var(--color-text-secondary);
  font-weight: 500;
}

.edit-qty-dialog__current-value {
  font-weight: 700;
  color: var(--color-text);
}

.edit-qty-dialog__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.edit-qty-dialog__label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: var(--color-text-secondary);
}

.edit-qty-dialog__input-row {
  display: flex;
  align-items: center;
  gap: 0.625rem;
}

.edit-qty-dialog__input { flex: 1; }

.edit-qty-dialog__unit {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--color-primary);
  background: rgba(80,139,137,0.10);
  border-radius: 6px;
  padding: 0.3rem 0.75rem;
  flex-shrink: 0;
}
</style>
