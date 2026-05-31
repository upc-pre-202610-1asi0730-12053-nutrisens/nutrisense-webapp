<!-- PATH: src/app/body-health-metrics/presentation/components/weight-chart.component.vue -->
<script setup>
import { ref, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { Chart } from 'chart.js/auto'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'

/**
 * @typedef {Object} WeightChartProps
 * @property {{ loggedAt: string, weightKg: number }[]} weightLogs
 * @property {string} [label]
 */

const { t } = useI18n()

const props = defineProps({
  weightLogs: { type: Array, required: true },
  label: { type: String, default: 'Weight (kg)' },
})

const canvasRef = ref(null)
let chart = null

/** Destroys any existing chart instance and builds a fresh line chart from current weightLogs. */
function buildChart() {
  if (!canvasRef.value) return
  if (chart) { chart.destroy(); chart = null }

  const sorted = [...props.weightLogs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
  const labels = sorted.map(l => new Date(l.loggedAt).toLocaleDateString())
  const data = sorted.map(l => l.weightKg)

  chart = new Chart(canvasRef.value, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: props.label,
        data,
        borderColor: 'var(--ns-primary)',
        backgroundColor: 'rgba(34, 197, 94, 0.08)',
        borderWidth: 2,
        tension: 0.3,
        fill: true,
        pointBackgroundColor: 'var(--ns-primary)',
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 3.5,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${formatNum(ctx.parsed.y)} kg`,
          },
        },
      },
      scales: {
        y: {
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { font: { family: 'Poppins', size: 11 } },
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Poppins', size: 11 } },
        },
      },
    },
  })
}

onMounted(buildChart)
watch(() => props.weightLogs, buildChart, { deep: true })
</script>

<template>
  <div class="weight-chart" :aria-label="t('bodyProgress.weightChartLabel')">
    <canvas ref="canvasRef" height="200" />
  </div>
</template>

<style scoped>
.weight-chart {
  width: 100%;
}
</style>
