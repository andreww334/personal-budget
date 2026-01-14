import type { Transaction } from '../types';

interface TransactionTableProps {
  transactions: Transaction[];
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TransactionTable({ transactions, onConfirm, onCancel, isLoading }: TransactionTableProps) {
  const totalExpenses = transactions
    .filter(t => t.direction === 'expense')
    .reduce((sum, t) => sum + t.amount_cents, 0);

  const totalIncome = transactions
    .filter(t => t.direction === 'income')
    .reduce((sum, t) => sum + t.amount_cents, 0);

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Transactions</p>
          <p className="text-2xl font-semibold text-slate-800">{transactions.length}</p>
        </div>
        <div className="rounded-xl bg-red-50 p-4">
          <p className="text-sm text-red-600">Expenses</p>
          <p className="text-2xl font-semibold text-red-700">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-sm text-emerald-600">Income</p>
          <p className="text-2xl font-semibold text-emerald-700">{formatCurrency(totalIncome)}</p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Vendor</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Category</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction, index) => (
              <tr key={index} className="hover:bg-slate-50">
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDate(transaction.date)}
                </td>
                <td className="px-4 py-3">
                  <p className="text-sm font-medium text-slate-800">{transaction.vendor}</p>
                  {transaction.description && (
                    <p className="text-xs text-slate-400">{transaction.description}</p>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600">
                    {transaction.original_category || 'Uncategorized'}
                  </span>
                </td>
                <td className={`px-4 py-3 text-right text-sm font-medium ${
                  transaction.direction === 'income' ? 'text-emerald-600' : 'text-slate-800'
                }`}>
                  {transaction.direction === 'income' ? '+' : '-'}
                  {formatCurrency(transaction.amount_cents)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-3">
        <button
          onClick={onCancel}
          disabled={isLoading}
          className="px-5 py-2.5 text-slate-600 font-medium rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          disabled={isLoading}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : 'Confirm Import'}
        </button>
      </div>
    </div>
  );
}

export default TransactionTable;
