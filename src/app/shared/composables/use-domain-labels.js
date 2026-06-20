import { useI18n } from 'vue-i18n'

export function useDomainLabels() {
  const { t } = useI18n()
  return {
    planLabel:          (key)    => t('plan.' + key),
    paymentStatusLabel: (status) => t('paymentHistory.' + status),
  }
}
