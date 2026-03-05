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
  tax_year_id?: string
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
  tax_year_id?: string
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

// ==========================================
// Loans & Repayments
// ==========================================

export type LoanType = 'personal' | 'business' | 'mortgage' | 'vehicle' | 'other'

export interface Loan {
  id: string
  profile_id: string
  tax_year_id?: string | null
  provider: string
  description?: string
  loan_type: LoanType
  original_amount: number
  interest_rate: number    // e.g. 3.5 means 3.5% p.a.
  start_date: string
  end_date?: string | null
  currency: string
  notes?: string
  created_at: string
}

export interface LoanRepayment {
  id: string
  loan_id: string
  profile_id: string
  date: string
  total_payment: number
  capital_amount: number
  interest_amount: number
  outstanding_balance?: number | null
  notes?: string
  receipt_url?: string
  created_at: string
}

export type CreateLoanInput = Omit<Loan, 'id' | 'created_at'>
export type CreateLoanRepaymentInput = Omit<LoanRepayment, 'id' | 'created_at'>

// ==========================================
// Investments (Stocks & Crypto)
// ==========================================

export type InvestmentAccountType = 'stocks' | 'crypto' | 'etf' | 'bonds' | 'mixed'
export type InvestmentTransactionType = 'buy' | 'sell' | 'dividend' | 'interest' | 'fee'
export type InvestmentAssetType = 'stock' | 'etf' | 'crypto' | 'bond' | 'other'

export interface InvestmentAccount {
  id: string
  profile_id: string
  name: string
  broker?: string
  account_type: InvestmentAccountType
  currency: string
  notes?: string
  created_at: string
}

export interface InvestmentTransaction {
  id: string
  account_id: string
  profile_id: string
  tax_year_id?: string | null
  date: string
  type: InvestmentTransactionType
  asset_name: string
  asset_ticker?: string
  asset_type?: InvestmentAssetType
  quantity?: number
  price_per_unit?: number
  total_amount_chf: number
  fees_chf: number
  exchange_rate: number
  notes?: string
  receipt_url?: string
  created_at: string
}

export interface InvestmentHolding {
  id: string
  account_id: string
  profile_id: string
  asset_name: string
  asset_ticker?: string
  asset_type?: InvestmentAssetType
  quantity?: number
  average_buy_price?: number
  current_value_chf?: number
  last_updated: string
}

export type CreateInvestmentAccountInput = Omit<InvestmentAccount, 'id' | 'created_at'>
export type CreateInvestmentTransactionInput = Omit<InvestmentTransaction, 'id' | 'created_at'>
export type CreateInvestmentHoldingInput = Omit<InvestmentHolding, 'id' | 'last_updated'>
