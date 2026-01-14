export interface Transaction {
  date: string;
  vendor: string;
  description: string;
  amount_cents: number;
  direction: 'income' | 'expense';
  source: string;
  original_category: string;
}

export interface UploadResponse {
  success: boolean;
  filename: string;
  count: number;
  transactions: Transaction[];
}
