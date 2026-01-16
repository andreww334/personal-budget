import { useState, useEffect } from 'react';
import type { Transaction, Category } from '../types';
import TransactionDetailModal from './TransactionDetailModal';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface TransactionsListProps {
  categories: Category[];
}

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TransactionsList({ categories }: TransactionsListProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchTransactions = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/transactions`);
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
      } else {
        setError('Failed to load transactions');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Failed to fetch transactions:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleTransactionClick = (transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  };

  const handleTransactionUpdate = (updated: Transaction) => {
    setTransactions(prev =>
      prev.map(t => (t.id === updated.id ? updated : t))
    );
    setSelectedTransaction(updated);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
    fetchTransactions();
  };

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return '';
    return categories.find(c => c.id === categoryId)?.name ?? '';
  };

  const totalExpenses = transactions
    .filter(t => t.direction === 'expense' && !t.refund_of_transaction_id)
    .reduce((sum, t) => {
      const refundTotal = t.refunds?.reduce((s, r) => s + r.amount_cents, 0) ?? 0;
      return sum + t.amount_cents - refundTotal;
    }, 0);

  const totalIncome = transactions
    .filter(t => t.direction === 'income' && !t.refund_of_transaction_id)
    .reduce((sum, t) => sum + t.amount_cents, 0);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading transactions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="text-red-500">{error}</div>
        <button
          onClick={fetchTransactions}
          className="px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (transactions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div className="text-slate-500">No transactions yet</div>
        <div className="text-sm text-slate-400">Import a CSV to get started</div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex gap-6">
        <div className="flex-1 rounded-xl bg-slate-50 p-4">
          <div className="text-sm text-slate-500 mb-1">Total Expenses (Net)</div>
          <div className="text-2xl font-bold text-slate-800">
            {formatCurrency(totalExpenses)}
          </div>
        </div>
        <div className="flex-1 rounded-xl bg-emerald-50 p-4">
          <div className="text-sm text-emerald-600 mb-1">Total Income</div>
          <div className="text-2xl font-bold text-emerald-700">
            {formatCurrency(totalIncome)}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Date</th>
              <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Vendor</th>
              <th className="text-left py-3 px-2 text-sm font-medium text-slate-500">Category</th>
              <th className="text-right py-3 px-2 text-sm font-medium text-slate-500">Amount</th>
              <th className="text-center py-3 px-2 text-sm font-medium text-slate-500 w-16">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(transaction => {
              const isLinkedRefund = !!transaction.refund_of_transaction_id;
              const hasRefunds = (transaction.refunds?.length ?? 0) > 0;
              const netAmount = hasRefunds
                ? transaction.amount_cents - transaction.refunds!.reduce((s, r) => s + r.amount_cents, 0)
                : transaction.amount_cents;

              return (
                <tr
                  key={transaction.id}
                  onClick={() => handleTransactionClick(transaction)}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors ${
                    isLinkedRefund ? 'opacity-60' : ''
                  }`}
                >
                  <td className="py-3 px-2 text-sm text-slate-600">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="py-3 px-2">
                    <div className="text-sm font-medium text-slate-800">
                      {transaction.vendor}
                    </div>
                    {transaction.description && (
                      <div className="text-xs text-slate-400 truncate max-w-48">
                        {transaction.description}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-sm text-slate-600">
                    {getCategoryName(transaction.category_id)}
                  </td>
                  <td className={`py-3 px-2 text-sm font-medium text-right ${
                    transaction.direction === 'income' ? 'text-emerald-600' : 'text-slate-800'
                  }`}>
                    {transaction.direction === 'income' ? '+' : '-'}
                    {formatCurrency(transaction.amount_cents)}
                    {hasRefunds && (
                      <div className="text-xs text-blue-500">
                        Net: {formatCurrency(netAmount)}
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-2 text-center">
                    {isLinkedRefund && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                        Refund
                      </span>
                    )}
                    {hasRefunds && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-700">
                        {transaction.refunds!.length} refund{transaction.refunds!.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TransactionDetailModal
        transaction={selectedTransaction}
        categories={categories}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onTransactionUpdate={handleTransactionUpdate}
      />
    </div>
  );
}

export default TransactionsList;
