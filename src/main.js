// PATH: src/main.js
import { createApp } from 'vue'
import App from './app.vue'
import pinia from './pinia.js'
import router from './router.js'
import i18n from './i18n.js'

import PrimeVue from 'primevue/config'
import Material from '@primeuix/themes/material'
import ToastService from 'primevue/toastservice'
import ConfirmationService from 'primevue/confirmationservice'

import Button from 'primevue/button'
import InputText from 'primevue/inputtext'
import Password from 'primevue/password'
import Dropdown from 'primevue/select'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Card from 'primevue/card'
import Tag from 'primevue/tag'
import Badge from 'primevue/badge'
import ProgressBar from 'primevue/progressbar'
import Toast from 'primevue/toast'
import ConfirmDialog from 'primevue/confirmdialog'
import Dialog from 'primevue/dialog'
import Sidebar from 'primevue/drawer'
import Skeleton from 'primevue/skeleton'
import Divider from 'primevue/divider'
import SelectButton from 'primevue/selectbutton'
import InputNumber from 'primevue/inputnumber'
import Textarea from 'primevue/textarea'
import Avatar from 'primevue/avatar'
import Menu from 'primevue/menu'
import Chip from 'primevue/chip'
import Message from 'primevue/message'
import Panel from 'primevue/panel'
import Paginator from 'primevue/paginator'
import ToggleSwitch from 'primevue/toggleswitch'
import ProgressSpinner from 'primevue/progressspinner'
import Tooltip from 'primevue/tooltip'
import NsTabs from './app/shared/presentation/components/ns-tabs.component.vue'

import 'primeflex/primeflex.css'
import 'primeicons/primeicons.css'
import './app/shared/presentation/styles/variables.css'
import './style.css'

const app = createApp(App)

app.use(PrimeVue, {
  theme: {
    preset: Material,
    options: { darkModeSelector: '.dark-mode' },
  },
  pt: {},
})
app.use(ToastService)
app.use(ConfirmationService)
app.use(pinia)
app.use(router)
app.use(i18n)

app.component('pv-button', Button)
app.component('pv-input-text', InputText)
app.component('pv-password', Password)
app.component('pv-dropdown', Dropdown)
app.component('pv-select', Dropdown)
app.component('pv-data-table', DataTable)
app.component('pv-column', Column)
app.component('pv-card', Card)
app.component('pv-tag', Tag)
app.component('pv-badge', Badge)
app.component('pv-progress-bar', ProgressBar)
app.component('pv-toast', Toast)
app.component('pv-confirm-dialog', ConfirmDialog)
app.component('pv-dialog', Dialog)
app.component('pv-sidebar', Sidebar)
app.component('pv-skeleton', Skeleton)
app.component('pv-divider', Divider)
app.component('pv-select-button', SelectButton)
app.component('pv-input-number', InputNumber)
app.component('pv-textarea', Textarea)
app.component('pv-avatar', Avatar)
app.component('pv-menu', Menu)
app.component('pv-chip', Chip)
app.component('pv-message', Message)
app.component('pv-panel', Panel)
app.component('pv-paginator', Paginator)
app.component('pv-toggle-switch', ToggleSwitch)
app.component('pv-progress-spinner', ProgressSpinner)
app.component('ns-tabs', NsTabs)
app.directive('tooltip', Tooltip)

app.mount('#app')
