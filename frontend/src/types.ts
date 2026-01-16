export interface Category {
  id: string;
  name: string;
  created_at: string;
}

// Minimal refund info for display on original transactions
export interface RefundSummary {
  id: string;
  amount_cents: number;
  date: string;
}

// Minimal original transaction info for display on refunds
export interface OriginalTransactionSummary {
  id: string;
  vendor: string;
  amount_cents: number;
  date: string;
  category_id: string | null;
}

export interface Transaction {
  id?: string; // Optional for import preview (before commit)
  date: string;
  vendor: string;
  description: string;
  amount_cents: number;
  direction: 'income' | 'expense';
  source: string;
  original_category?: string; // Only present during import preview
  category_id?: string | null;
  // Refund linking fields
  refund_of_transaction_id?: string | null;
  refunds?: RefundSummary[];
  original_transaction?: OriginalTransactionSummary;
}

// Response type for potential originals endpoint
export interface PotentialOriginalsResponse {
  transactions: Transaction[];
  total_count: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

export interface UploadResponse {
  success: boolean;
  filename: string;
  count: number;
  transactions: Transaction[];
}
