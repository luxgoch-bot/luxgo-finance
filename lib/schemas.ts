import { z } from 'zod'

// ── Income ──────────────────────────────────────────────────────────────
export const incomeSchema = z.object({
  profile_id:     z.string().uuid(),
  tax_year_id:    z.string().uuid().optional().nullable(),
  date:           z.string().min(1, 'Date is required'),
  client:         z.string().optional().nullable(),
  description:    z.string().optional().nullable(),
  category:       z.enum(['transport', 'charter', 'other']).default('transport'),
  amount_chf:     z.number().positive('Amount must be positive'),
  vat_rate:       z.number().min(0).max(100).default(8.1),
  invoice_number: z.string().optional().nullable(),
  receipt_url:    z.string().url().optional().nullable().or(z.literal('')),
})

export type IncomeFormValues = z.infer<typeof incomeSchema>

// ── Expense ─────────────────────────────────────────────────────────────
export const expenseSchema = z.object({
  profile_id:     z.string().uuid(),
  tax_year_id:    z.string().uuid().optional().nullable(),
  date:           z.string().min(1, 'Date is required'),
  vendor:         z.string().optional().nullable(),
  description:    z.string().optional().nullable(),
  category:       z.enum([
    'vehicle', 'fuel', 'insurance', 'maintenance',
    'office', 'marketing', 'salary', 'tax', 'other',
  ]).default('other'),
  amount_chf:     z.number().positive('Amount must be positive'),
  vat_rate:       z.number().min(0).max(100).default(8.1),
  is_deductible:  z.boolean().default(true),
  km:             z.number().optional().nullable(),
  receipt_url:    z.string().url().optional().nullable().or(z.literal('')),
})

export type ExpenseFormValues = z.infer<typeof expenseSchema>

// ── CSV Row ──────────────────────────────────────────────────────────────
export const csvExpenseRowSchema = z.object({
  date:        z.string().min(1),
  vendor:      z.string().optional().default(''),
  description: z.string().optional().default(''),
  amount:      z.coerce.number().positive(),
  category:    z.string().optional().default('other'),
  vat_rate:    z.coerce.number().min(0).max(100).optional().default(8.1),
})

export type CsvExpenseRow = z.infer<typeof csvExpenseRowSchema>
