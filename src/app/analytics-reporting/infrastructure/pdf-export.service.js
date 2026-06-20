// PATH: src/app/analytics-reporting/infrastructure/pdf-export.service.js
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'

const BRAND = [80, 139, 137] // --color-primary, rgb
const TEXT = [44, 44, 44]
const MUTED = [120, 120, 120]
const MARGIN = 14

/**
 * Builds and downloads a PDF report of the analytics view.
 * Pure infrastructure: receives already-computed data and translated labels,
 * so it has no dependency on the store or vue-i18n.
 *
 * @param {Object} params
 * @param {{ kpis:boolean, calories:boolean, macros:boolean, weight:boolean, streak:boolean }} params.sections - which sections to render
 * @param {Object} params.data - computed analytics data
 * @param {{ avgKcal:number, avgProtein:number, weightChange:number, currentStreak:number }} params.data.kpis
 * @param {{ protein:number, carbs:number, fat:number, fiber:number }} params.data.macroTotals
 * @param {number} params.data.adherence - 0–100
 * @param {number} params.data.weeklyCompletion - 0–100
 * @param {{ loggedAt:string, weightKg:number }[]} params.data.weightLogs
 * @param {string|null} params.calorieChartImage - base64 PNG of the calorie chart, or null
 * @param {{ start:Date, end:Date, label:string }} params.range
 * @param {(key:string, named?:Record<string,unknown>) => string} params.t - i18n translator
 * @param {string} params.locale - BCP-47 locale for date/number formatting
 */
export function generateAnalyticsPdf({ sections, data, calorieChartImage, range, t, locale }) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2
  const fmtDate = d => new Date(d).toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })

  // ── Header ──────────────────────────────────────────────
  doc.setFillColor(...BRAND)
  doc.rect(0, 0, pageWidth, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.text('NutriSense', MARGIN, 12)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(t('analytics.exportTitle'), MARGIN, 20)
  doc.setFontSize(9)
  const rangeText = `${range.label} · ${fmtDate(range.start)} – ${fmtDate(range.end)}`
  doc.text(rangeText, pageWidth - MARGIN, 20, { align: 'right' })

  let y = 36

  /** Draws a section title and advances `y`. */
  const sectionTitle = (text) => {
    doc.setTextColor(...BRAND)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(13)
    doc.text(text, MARGIN, y)
    y += 6
  }

  /** Renders an autoTable and advances `y` to just after it. */
  const table = (head, body) => {
    autoTable(doc, {
      startY: y,
      head,
      body,
      margin: { left: MARGIN, right: MARGIN },
      styles: { font: 'helvetica', fontSize: 10, textColor: TEXT, cellPadding: 2.5 },
      headStyles: { fillColor: BRAND, textColor: [255, 255, 255], fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [246, 248, 248] },
    })
    y = doc.lastAutoTable.finalY + 10
  }

  /** Adds a page break if the remaining vertical space is below `needed` mm. */
  const ensureSpace = (needed) => {
    if (y + needed > doc.internal.pageSize.getHeight() - MARGIN) {
      doc.addPage()
      y = MARGIN + 6
    }
  }

  // ── KPIs ────────────────────────────────────────────────
  if (sections.kpis) {
    ensureSpace(50)
    sectionTitle(t('analytics.kpis'))
    table(
      [[t('analytics.kpis'), '']],
      [
        [t('analytics.avgCalories'), `${data.kpis.avgKcal} ${t('analytics.kcal')}`],
        [t('analytics.avgProtein'), `${data.kpis.avgProtein} ${t('analytics.g')}`],
        [t('analytics.weightChange'), `${data.kpis.weightChange > 0 ? '+' : ''}${data.kpis.weightChange} kg`],
        [t('analytics.currentStreak'), `${data.kpis.currentStreak} ${t('analytics.days')}`],
        [t('analytics.weeklyCompletion'), `${data.weeklyCompletion}%`],
      ],
    )
  }

  // ── Calorie history (chart image) ───────────────────────
  if (sections.calories && calorieChartImage) {
    ensureSpace(85)
    sectionTitle(t('analytics.calorieHistory'))
    const imgHeight = contentWidth * 0.42 // keep a readable aspect ratio
    doc.addImage(calorieChartImage, 'PNG', MARGIN, y, contentWidth, imgHeight)
    y += imgHeight + 10
  }

  // ── Macro breakdown ─────────────────────────────────────
  if (sections.macros) {
    ensureSpace(50)
    const { protein, carbs, fat, fiber } = data.macroTotals
    const total = protein + carbs + fat + fiber || 1
    const pct = v => `${Math.round((v / total) * 100)}%`
    sectionTitle(t('analytics.macroBreakdown'))
    table(
      [[t('analytics.macroBreakdown'), t('analytics.g'), '%']],
      [
        [t('analytics.avgProtein'), `${protein}`, pct(protein)],
        [t('dashboard.carbs'), `${carbs}`, pct(carbs)],
        [t('dashboard.fat'), `${fat}`, pct(fat)],
        [t('dashboard.fiber'), `${fiber}`, pct(fiber)],
      ],
    )
  }

  // ── Weight (table of values) ────────────────────────────
  if (sections.weight) {
    ensureSpace(40)
    sectionTitle(t('analytics.sectionWeight'))
    const sorted = [...data.weightLogs].sort((a, b) => a.loggedAt.localeCompare(b.loggedAt))
    if (sorted.length) {
      table(
        [[t('analytics.startDate'), `${t('analytics.weightChange')} (kg)`]],
        sorted.map(l => [fmtDate(l.loggedAt), `${l.weightKg}`]),
      )
    } else {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(10)
      doc.setTextColor(...MUTED)
      doc.text(t('analytics.noData'), MARGIN, y)
      y += 12
    }
  }

  // ── Streak & adherence ──────────────────────────────────
  if (sections.streak) {
    ensureSpace(40)
    sectionTitle(t('analytics.streakSection'))
    table(
      [[t('analytics.streakSection'), '']],
      [
        [t('analytics.currentStreak'), `${data.kpis.currentStreak} ${t('analytics.days')}`],
        [t('analytics.adherence'), `${data.adherence}%`],
        [t('analytics.weeklyCompletion'), `${data.weeklyCompletion}%`],
      ],
    )
  }

  // ── Footer (generation date on every page) ──────────────
  const pageCount = doc.internal.getNumberOfPages()
  const generatedAt = new Date().toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' })
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...MUTED)
    doc.text(`NutriSense · ${generatedAt}`, MARGIN, doc.internal.pageSize.getHeight() - 8)
    doc.text(`${i} / ${pageCount}`, pageWidth - MARGIN, doc.internal.pageSize.getHeight() - 8, { align: 'right' })
  }

  const fileTag = `${range.start.getFullYear()}${String(range.start.getMonth() + 1).padStart(2, '0')}${String(range.start.getDate()).padStart(2, '0')}`
  doc.save(`nutrisense-analytics-${fileTag}.pdf`)
}
