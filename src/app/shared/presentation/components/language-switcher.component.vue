<script setup>
import { useI18n } from 'vue-i18n'
import { LOCALE_KEY } from '../../../../i18n.js'

/** @type {{ variant: 'light' | 'dark' }} */
const props = defineProps({
  /** @type {'light'|'dark'} */
  variant: {
    type: String,
    default: 'light',
  },
})

const { locale } = useI18n({ useScope: 'global' })

/** @param {'en'|'es'} lang */
function switchLanguage(lang) {
  locale.value = lang
  localStorage.setItem(LOCALE_KEY, lang)
}
</script>

<template>
  <div
    class="lang-switcher"
    :class="`lang-switcher--${variant}`"
    role="group"
    aria-label="Language selector"
  >
    <button
      v-for="lang in ['en', 'es']"
      :key="lang"
      class="lang-switcher__btn"
      :class="{ 'lang-switcher__btn--active': locale === lang }"
      :aria-pressed="locale === lang"
      @click="switchLanguage(lang)"
    >
      {{ lang.toUpperCase() }}
    </button>
  </div>
</template>

<style scoped>
.lang-switcher {
  display: flex;
  gap: 4px;
  padding: 0 20px 16px;
}

/* ── light variant (default, profile page) ─────────────────── */
.lang-switcher--light .lang-switcher__btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid #ddd;
  background: transparent;
  font-size: 0.7rem;
  font-weight: 600;
  color: #888;
  cursor: pointer;
  transition: all 0.15s;
}

.lang-switcher--light .lang-switcher__btn--active {
  background: #4a9b8f;
  border-color: #4a9b8f;
  color: #fff;
}

.lang-switcher--light .lang-switcher__btn:hover:not(.lang-switcher__btn--active) {
  border-color: #4a9b8f;
  color: #4a9b8f;
}

/* ── dark variant (sidebar) ────────────────────────────────── */
.lang-switcher--dark .lang-switcher__btn {
  padding: 4px 10px;
  border-radius: 6px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: transparent;
  font-size: 0.7rem;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  cursor: pointer;
  transition: all 0.15s;
}

.lang-switcher--dark .lang-switcher__btn--active {
  background: rgba(255, 255, 255, 0.2);
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
}

.lang-switcher--dark .lang-switcher__btn:hover:not(.lang-switcher__btn--active) {
  border-color: rgba(255, 255, 255, 0.5);
  color: rgba(255, 255, 255, 0.85);
}
</style>
