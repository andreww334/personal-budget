import { useState, useEffect } from 'react';
import type { Transaction, Category } from '../types';
import TransactionDetailModal from './TransactionDetailModal';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';
const PAGE_SIZE = 50;

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

  // Pagination state
  const [offset, setOffset] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchTransactions = async (newOffset: number = 0) => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `${apiUrl}/api/transactions?limit=${PAGE_SIZE}&offset=${newOffset}`,
        { credentials: 'include' }
      );
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions);
        setTotalCount(data.total_count);
        setHasMore(data.has_more);
        setOffset(newOffset);
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
    fetchTransactions(0);
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
    fetchTransactions(offset);
  };

  const handleDelete = async (e: React.MouseEvent, transactionId: string) => {
    e.stopPropagation(); // Prevent row click

    if (!confirm('Are you sure you want to delete this transaction?')) {
      return;
    }

    setDeletingId(transactionId);
    try {
      const response = await fetch(`${apiUrl}/api/transactions/${transactionId}`, {
        method: 'DELETE',
        credentials: 'include',
      });

      if (response.ok) {
        // Remove from local state
        setTransactions(prev => prev.filter(t => t.id !== transactionId));
        setTotalCount(prev => prev - 1);
      } else {
        alert('Failed to delete transaction');
      }
    } catch (err) {
      console.error('Failed to delete transaction:', err);
      alert('Failed to delete transaction');
    } finally {
      setDeletingId(null);
    }
  };

  const handlePrevPage = () => {
    if (offset > 0) {
      fetchTransactions(Math.max(0, offset - PAGE_SIZE));
    }
  };

  const handleNextPage = () => {
    if (hasMore) {
      fetchTransactions(offset + PAGE_SIZE);
    }
  };

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return '';
    return categories.find(c => c.id === categoryId)?.name ?? '';
  };

  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;
  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  if (isLoading && transactions.length === 0) {
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
          onClick={() => fetchTransactions(0)}
          className="px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (transactions.length === 0 && totalCount === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div className="text-slate-500">No transactions yet</div>
        <div className="text-sm text-slate-400">Import a CSV to get started</div>
      </div>
    );
  }

  return (
    <div>
      {/* Header with count */}
      <div className="mb-4 flex items-center justify-between">
        <div className="text-sm text-slate-500">
          {totalCount} transaction{totalCount !== 1 ? 's' : ''}
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
              <th className="w-10 px-2"></th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(transaction => {
              const isLinkedRefund = !!transaction.refund_of_transaction_id;
              const hasRefunds = (transaction.refunds?.length ?? 0) > 0;
              const netAmount = hasRefunds
                ? transaction.amount_cents - transaction.refunds!.reduce((s, r) => s + r.amount_cents, 0)
                : transaction.amount_cents;
              const isDeleting = deletingId === transaction.id;

              return (
                <tr
                  key={transaction.id}
                  onClick={() => handleTransactionClick(transaction)}
                  className={`border-b border-slate-100 hover:bg-slate-50 cursor-pointer transition-colors group ${
                    isLinkedRefund ? 'opacity-60' : ''
                  } ${isDeleting ? 'opacity-40' : ''}`}
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
                  <td className="py-3 px-2">
                    <button
                      onClick={(e) => handleDelete(e, transaction.id!)}
                      disabled={isDeleting}
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all disabled:opacity-50"
                      title="Delete transaction"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-4 flex items-center justify-between">
          <button
            onClick={handlePrevPage}
            disabled={offset === 0 || isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-slate-500">
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={!hasMore || isLoading}
            className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

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
