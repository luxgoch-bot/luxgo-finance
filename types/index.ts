// ==========================================
// LuxGo Finance - TypeScript Types
// Matches the Supabase database schema
// ==========================================

export type ProfileType = 'business' | 'personal'
export type TaxYearStatus = 'open' | 'submitted' | 'closed'
export type IncomeCategory = 'transport' | 'charter' | 'other'
export type ExpenseCategory =
  | 'vehicle'
  | 'fuel'
  | 'insurance'
  | 'maintenance'
  | 'office'
  | 'marketing'
  | 'salary'
  | 'tax'
  | 'other'
export type MwstReportStatus = 'draft' | 'submitted'
export type DocumentType = 'receipt' | 'invoice' | 'tax_form' | 'other'

export interface Profile {
  id: string
  user_id: string
  type: ProfileType
  name: string
  uid_mwst?: string       // e.g. CHE-123.456.789 MWST
  address?: string
  canton?: string
  created_at: string
}

export interface TaxYear {
  id: string
  profile_id: string
  year: number
  status: TaxYearStatus
  notes?: string
}

export interface Income {
  id: string
  profile_id: string
  tax_year_id: string
  date: string            // ISO date string
  description?: string
  client?: string
  amount_chf: number
  vat_rate: number        // e.g. 8.1
  vat_amount?: number
  net_amount?: number
  category?: IncomeCategory
  invoice_number?: string
  receipt_url?: string
  created_at: string
}

export interface Expense {
  id: string
  profile_id: string
  tax_year_id: string
  date: string            // ISO date string
  description?: string
  vendor?: string
  amount_chf: number
  vat_rate: number        // e.g. 8.1
  vat_amount?: number
  net_amount?: number
  category?: ExpenseCategory
  is_deductible: boolean
  receipt_url?: string
  created_at: string
}

export interface MwstReport {
  id: string
  profile_id: string
  tax_year_id: string
  quarter: 1 | 2 | 3 | 4
  total_revenue_chf?: number
  vat_collected?: number
  vat_paid_on_expenses?: number
  vat_payable?: number
  status: MwstReportStatus
  submitted_at?: string
  notes?: string
}

export interface Document {
  id: string
  profile_id: string
  type: DocumentType
  file_name?: string
  storage_path?: string
  linked_to?: string      // References income or expense id
  uploaded_at: string
}

// ==========================================
// Form / Input Types (omit auto-generated fields)
// ==========================================

export type CreateIncomeInput = Omit<Income, 'id' | 'created_at'>
export type CreateExpenseInput = Omit<Expense, 'id' | 'created_at'>
export type CreateProfileInput = Omit<Profile, 'id' | 'created_at'>
export type CreateTaxYearInput = Omit<TaxYear, 'id'>
export type CreateMwstReportInput = Omit<MwstReport, 'id'>
export type CreateDocumentInput = Omit<Document, 'id' | 'uploaded_at'>

export type UpdateIncomeInput = Partial<CreateIncomeInput>
export type UpdateExpenseInput = Partial<CreateExpenseInput>
export type UpdateTaxYearInput = Partial<CreateTaxYearInput>
export type UpdateMwstReportInput = Partial<CreateMwstReportInput>
