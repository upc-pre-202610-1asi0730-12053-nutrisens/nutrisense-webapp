import en from "./locales/en.json";
import es from "./locales/es.json";

import {createI18n} from "vue-i18n";

const SUPPORTED_LOCALES = ['en', 'es']
const LOCALE_KEY = 'ns_locale'

/**
 * Locale resolved synchronously from localStorage so the first render is correct.
 * Falls back to 'en' when the stored value is absent or unsupported.
 * @type {string}
 */
const bootstrapLocale = (() => {
  const stored = localStorage.getItem(LOCALE_KEY)
  return stored && SUPPORTED_LOCALES.includes(stored) ? stored : 'en'
})()

/**
 * Shared internationalization service used across presentation modules.
 */
const i18n = createI18n({
    legacy: false,
    locale: bootstrapLocale,
    fallbackLocale: "en",
    messages: {en, es}
});

export { LOCALE_KEY, SUPPORTED_LOCALES }
export default i18n;