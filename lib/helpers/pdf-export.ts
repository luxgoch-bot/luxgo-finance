/**
 * PDF Export for MWST Quarterly Reports
 * Generates a formatted reference document for filing on estv.admin.ch
 */

import type { MwstQuarterSummary } from './mwst'
import type { Profile, MwstReport } from '@/types'

function chf(n: number): string {
  return new Intl.NumberFormat('de-CH', {
    style: 'currency', currency: 'CHF',
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(n)
}

function dateCh(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('de-CH', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  })
}

export async function exportMwstPdf(
  summary:  MwstQuarterSummary,
  profile:  Profile,
  report:   MwstReport
): Promise<void> {
  // Dynamic import — jsPDF is client-side only
  const { jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  const LEFT   = 20
  const RIGHT  = 190
  const W      = RIGHT - LEFT
  let   Y      = 20

  const LINE_H  = 7
  const SECTION = 10

  // ── Colours ─────────────────────────────────────────────────────────────
  const AMBER   = [245, 158, 11]  as [number, number, number]
  const DARK    = [17,  24,  39]  as [number, number, number]
  const GRAY    = [107, 114, 128] as [number, number, number]
  const LIGHT   = [249, 250, 251] as [number, number, number]
  const GREEN   = [16,  185, 129] as [number, number, number]
  const RED     = [239, 68,  68]  as [number, number, number]

  function setColor(c: [number, number, number]) { doc.setTextColor(...c) }
  function resetColor() { doc.setTextColor(...DARK) }

  // ── Header bar ───────────────────────────────────────────────────────────
  doc.setFillColor(...AMBER)
  doc.rect(0, 0, 210, 28, 'F')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(0, 0, 0)
  doc.text('LuxGo Finance', LEFT, 12)

  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('MWST Quarterly Report — Reference Document', LEFT, 19)
  doc.text(`Not an official ESTV form — file at estv.admin.ch`, LEFT, 25)

  Y = 36

  // ── Company info ─────────────────────────────────────────────────────────
  doc.setFillColor(...LIGHT)
  doc.rect(LEFT, Y, W, 22, 'F')
  doc.setDrawColor(229, 231, 235)
  doc.rect(LEFT, Y, W, 22, 'S')

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  resetColor()
  doc.text('REPORTING ENTITY', LEFT + 4, Y + 7)
  doc.setFont('helvetica', 'normal')
  doc.text(profile.name, LEFT + 4, Y + 13)
  if (profile.uid_mwst) doc.text(`UID: ${profile.uid_mwst}`, LEFT + 4, Y + 19)

  doc.setFont('helvetica', 'bold')
  doc.text('REPORTING PERIOD', 130, Y + 7)
  doc.setFont('helvetica', 'normal')
  doc.text(`Q${summary.quarter} ${summary.year}`, 130, Y + 13)
  doc.text(`${dateCh(summary.dateRange.start)} – ${dateCh(summary.dateRange.end)}`, 130, Y + 19)

  Y += 28

  // Status badge
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  if (report.status === 'submitted') {
    doc.setFillColor(...GREEN)
    doc.setTextColor(255, 255, 255)
  } else {
    doc.setFillColor(251, 191, 36)
    doc.setTextColor(0, 0, 0)
  }
  doc.roundedRect(LEFT, Y, 35, 7, 2, 2, 'F')
  doc.text(report.status === 'submitted' ? '✓ SUBMITTED' : '◉ DRAFT', LEFT + 4, Y + 5)
  resetColor()

  if (report.submitted_at) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    setColor(GRAY)
    doc.text(`Submitted: ${dateCh(report.submitted_at.slice(0, 10))}`, LEFT + 40, Y + 5)
    resetColor()
  }

  Y += 14

  // ── Section divider helper ────────────────────────────────────────────────
  function sectionHeader(title: string, subtitle?: string) {
    doc.setFillColor(...DARK)
    doc.rect(LEFT, Y, W, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(255, 255, 255)
    doc.text(title, LEFT + 3, Y + 5.5)
    if (subtitle) {
      doc.setFont('helvetica', 'normal')
      doc.text(subtitle, RIGHT - 3, Y + 5.5, { align: 'right' })
    }
    resetColor()
    Y += 10
  }

  function row(label: string, value: string, bold = false, indent = 0) {
    doc.setFont('helvetica', bold ? 'bold' : 'normal')
    doc.setFontSize(9)
    resetColor()
    doc.text(label, LEFT + 3 + indent, Y)
    doc.text(value, RIGHT - 3, Y, { align: 'right' })
    Y += LINE_H
  }

  function divider() {
    doc.setDrawColor(229, 231, 235)
    doc.line(LEFT, Y - 2, RIGHT, Y - 2)
  }

  function totalRow(label: string, value: string, color?: [number, number, number]) {
    doc.setFillColor(243, 244, 246)
    doc.rect(LEFT, Y - 5, W, 8, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    if (color) doc.setTextColor(...color)
    else resetColor()
    doc.text(label, LEFT + 3, Y)
    doc.text(value, RIGHT - 3, Y, { align: 'right' })
    resetColor()
    Y += LINE_H + 2
  }

  // ── Section A — Output VAT ────────────────────────────────────────────────
  sectionHeader('A — OUTPUT VAT (MWST auf Umsätzen)', `${summary.incomeLines.length} transactions`)

  if (summary.incomeByRate.length === 0) {
    setColor(GRAY)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text('No income recorded for this quarter.', LEFT + 3, Y)
    resetColor()
    Y += LINE_H
  } else {
    for (const g of summary.incomeByRate) {
      row(`${g.label}  (${g.count} items)`, `Gross: ${chf(g.grossTotal)}`, false)
      Y -= 2
      setColor(GRAY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`Net: ${chf(g.netTotal)}`, LEFT + 6, Y)
      doc.text(`VAT: ${chf(g.vatTotal)}`, RIGHT - 3, Y, { align: 'right' })
      setColor([17, 24, 39])
      Y += LINE_H
      divider()
    }
  }

  totalRow('Total gross income:', chf(summary.totalGrossIncome))
  totalRow('Total VAT collected (Ziffer 302):', chf(summary.totalVatCollected), AMBER)

  Y += 2

  // ── Section B — Input Tax ─────────────────────────────────────────────────
  sectionHeader('B — INPUT TAX (Vorsteuer)', `${summary.expenseLines.filter(e => e.is_deductible).length} deductible expenses`)

  if (summary.expenseByRate.length === 0) {
    setColor(GRAY)
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(9)
    doc.text('No deductible expenses recorded for this quarter.', LEFT + 3, Y)
    resetColor()
    Y += LINE_H
  } else {
    for (const g of summary.expenseByRate) {
      row(`${g.label}  (${g.count} deductible items)`, `Gross: ${chf(g.grossTotal)}`, false)
      Y -= 2
      setColor(GRAY)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(8)
      doc.text(`Net: ${chf(g.netTotal)}`, LEFT + 6, Y)
      doc.text(`Input tax: ${chf(g.vatTotal)}`, RIGHT - 3, Y, { align: 'right' })
      resetColor()
      Y += LINE_H
      divider()
    }
  }

  totalRow('Total deductible expenses:', chf(summary.totalGrossExpenses))
  totalRow('Total input tax (Ziffer 400):', chf(summary.totalInputTax), [59, 130, 246])

  Y += 2

  // ── Section C — Net VAT Payable ───────────────────────────────────────────
  sectionHeader('C — NET VAT PAYABLE')

  row('VAT collected (A):', chf(summary.totalVatCollected))
  row('Input tax deduction (B):', `− ${chf(summary.totalInputTax)}`)
  divider()
  Y += 2

  if (summary.vatPayable > 0) {
    totalRow('MWST PAYABLE (Ziffer 500):', chf(summary.vatPayable), RED)
  } else {
    totalRow('VAT REFUND DUE (Ziffer 500):', chf(summary.vatRefundable), GREEN)
  }

  Y += SECTION

  // ── Notes ────────────────────────────────────────────────────────────────
  if (report.notes) {
    sectionHeader('NOTES')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8.5)
    resetColor()
    const lines = doc.splitTextToSize(report.notes, W - 6)
    doc.text(lines, LEFT + 3, Y)
    Y += lines.length * 6 + 4
  }

  // ── Income line items ─────────────────────────────────────────────────────
  if (summary.incomeLines.length > 0 && Y < 220) {
    sectionHeader('INCOME LINE ITEMS')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(7.5)
    setColor(GRAY)
    doc.text('Date', LEFT + 3, Y)
    doc.text('Client / Description', LEFT + 22, Y)
    doc.text('Gross', RIGHT - 28, Y)
    doc.text('VAT', RIGHT - 10, Y, { align: 'right' })
    resetColor()
    Y += 5
    doc.setDrawColor(229, 231, 235)
    doc.line(LEFT, Y, RIGHT, Y)
    Y += 3

    for (const inc of summary.incomeLines.slice(0, 15)) {
      if (Y > 270) { doc.addPage(); Y = 20 }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7.5)
      resetColor()
      const label = [inc.client, inc.description].filter(Boolean).join(' — ') || '—'
      doc.text(dateCh(inc.date), LEFT + 3, Y)
      doc.text(doc.splitTextToSize(label, 90)[0], LEFT + 22, Y)
      doc.text(chf(inc.amount_chf), RIGHT - 28, Y)
      const vat = inc.vat_amount ?? (inc.amount_chf - inc.amount_chf / (1 + inc.vat_rate / 100))
      doc.text(chf(vat), RIGHT - 3, Y, { align: 'right' })
      Y += 5.5
    }
    if (summary.incomeLines.length > 15) {
      setColor(GRAY)
      doc.setFontSize(7.5)
      doc.text(`… and ${summary.incomeLines.length - 15} more`, LEFT + 3, Y)
      resetColor()
      Y += 5
    }
  }

  // ── Footer ────────────────────────────────────────────────────────────────
  const pageCount = doc.getNumberOfPages()
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    setColor(GRAY)
    doc.text(
      `LuxGo Finance — MWST ${summary.dateRange.label} — Generated ${new Date().toLocaleDateString('de-CH')} — Page ${i}/${pageCount}`,
      105, 292, { align: 'center' }
    )
    resetColor()
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  doc.save(`mwst-${summary.year}-Q${summary.quarter}-${profile.name.replace(/\s+/g, '_')}.pdf`)
}
