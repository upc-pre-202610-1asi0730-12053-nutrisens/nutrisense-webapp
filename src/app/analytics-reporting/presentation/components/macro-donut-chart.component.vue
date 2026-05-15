<!-- PATH: src/app/analytics-reporting/presentation/components/macro-donut-chart.component.vue -->
<script setup>
import { ref, onMounted, watch } from 'vue'
import { Chart } from 'chart.js/auto'
import { formatNum } from '../../../shared/infrastructure/format-utils.js'

const props = defineProps({
  proteinG: { type: Number, default: 0 },
  carbsG: { type: Number, default: 0 },
  fatG: { type: Number, default: 0 },
  proteinLabel: { type: String, default: 'Protein' },
  carbsLabel: { type: String, default: 'Carbs' },
  fatLabel: { type: String, default: 'Fat' },
})

const canvasRef = ref(null)
let chart = null

function buildChart() {
  if (!canvasRef.value) return
  if (chart) { chart.destroy(); chart = null }

  chart = new Chart(canvasRef.value, {
    type: 'doughnut',
    data: {
      labels: [props.proteinLabel, props.carbsLabel, props.fatLabel],
      datasets: [{
        data: [props.proteinG, props.carbsG, props.fatG],
        backgroundColor: [
          'var(--ns-protein-color)',
          'var(--ns-carbs-color)',
          'var(--ns-fat-color)',
        ],
        borderWidth: 0,
        hoverOffset: 4,
      }],
    },
    options: {
      responsive: true,
      cutout: '70%',
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            padding: 16,
            font: { family: 'Poppins', size: 12 },
            usePointStyle: true,
            pointStyle: 'circle',
          },
        },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.label}: ${formatNum(ctx.parsed)}g`,
          },
        },
      },
    },
  })
}

onMounted(buildChart)

watch(() => [props.proteinG, props.carbsG, props.fatG], buildChart)
</script>

<template>
  <div class="macro-chart" aria-label="Macro distribution chart">
    <canvas ref="canvasRef" height="220" />
  </div>
</template>

<style scoped>
.macro-chart {
  max-width: 280px;
  margin: 0 auto;
}
</style>
