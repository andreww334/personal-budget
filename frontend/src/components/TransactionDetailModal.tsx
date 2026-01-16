import { useState, useEffect } from 'react';
import Modal from './Modal';
import type { Transaction, Category, PotentialOriginalsResponse } from '../types';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

interface TransactionDetailModalProps {
  transaction: Transaction | null;
  categories: Category[];
  isOpen: boolean;
  onClose: () => void;
  onTransactionUpdate: (updated: Transaction) => void;
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
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function TransactionDetailModal({
  transaction,
  categories,
  isOpen,
  onClose,
  onTransactionUpdate,
}: TransactionDetailModalProps) {
  const [potentialOriginals, setPotentialOriginals] = useState<Transaction[]>([]);
  const [isLoadingOriginals, setIsLoadingOriginals] = useState(false);
  const [originalsOffset, setOriginalsOffset] = useState(0);
  const [hasMoreOriginals, setHasMoreOriginals] = useState(false);
  const [totalOriginals, setTotalOriginals] = useState(0);
  const [isLinking, setIsLinking] = useState(false);
  const [isUnlinking, setIsUnlinking] = useState(false);

  const isRefund = transaction?.direction === 'income';
  const isLinkedRefund = !!transaction?.refund_of_transaction_id;
  const hasRefunds = (transaction?.refunds?.length ?? 0) > 0;
  const hasId = !!transaction?.id;

  useEffect(() => {
    if (isOpen && transaction && isRefund && !isLinkedRefund && hasId) {
      fetchPotentialOriginals(0);
    } else {
      setPotentialOriginals([]);
      setOriginalsOffset(0);
      setHasMoreOriginals(false);
    }
  }, [isOpen, transaction?.id, isLinkedRefund]);

  const fetchPotentialOriginals = async (offset: number) => {
    if (!transaction?.id) return;

    setIsLoadingOriginals(true);
    try {
      const response = await fetch(
        `${apiUrl}/api/transactions/${transaction.id}/potential-originals?limit=10&offset=${offset}`
      );
      if (response.ok) {
        const data: PotentialOriginalsResponse = await response.json();
        if (offset === 0) {
          setPotentialOriginals(data.transactions);
        } else {
          setPotentialOriginals(prev => [...prev, ...data.transactions]);
        }
        setOriginalsOffset(offset);
        setHasMoreOriginals(data.has_more);
        setTotalOriginals(data.total_count);
      }
    } catch (error) {
      console.error('Failed to fetch potential originals:', error);
    } finally {
      setIsLoadingOriginals(false);
    }
  };

  const handleLoadMore = () => {
    fetchPotentialOriginals(originalsOffset + 10);
  };

  const handleLinkRefund = async (originalId: string) => {
    if (!transaction?.id) return;

    setIsLinking(true);
    try {
      const response = await fetch(
        `${apiUrl}/api/transactions/${transaction.id}/link-refund`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ original_transaction_id: originalId }),
        }
      );

      if (response.ok) {
        const updated = await response.json();
        onTransactionUpdate(updated);
      }
    } catch (error) {
      console.error('Failed to link refund:', error);
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkRefund = async () => {
    if (!transaction?.id) return;

    setIsUnlinking(true);
    try {
      const response = await fetch(
        `${apiUrl}/api/transactions/${transaction.id}/unlink-refund`,
        { method: 'POST' }
      );

      if (response.ok) {
        const updated = await response.json();
        onTransactionUpdate(updated);
        fetchPotentialOriginals(0);
      }
    } catch (error) {
      console.error('Failed to unlink refund:', error);
    } finally {
      setIsUnlinking(false);
    }
  };

  const getCategoryName = (categoryId: string | null | undefined) => {
    if (!categoryId) return 'Uncategorized';
    return categories.find(c => c.id === categoryId)?.name ?? 'Unknown';
  };

  if (!transaction) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Transaction Details">
      <div className="space-y-4">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-lg font-semibold text-slate-800">{transaction.vendor}</h3>
            <p className="text-sm text-slate-500">{formatDate(transaction.date)}</p>
          </div>
          <span className={`text-xl font-bold ${
            transaction.direction === 'income' ? 'text-emerald-600' : 'text-slate-800'
          }`}>
            {transaction.direction === 'income' ? '+' : '-'}
            {formatCurrency(transaction.amount_cents)}
          </span>
        </div>

        {transaction.description && (
          <p className="text-sm text-slate-600">{transaction.description}</p>
        )}

        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500">Category:</span>
          <span className="text-sm font-medium text-slate-700">
            {getCategoryName(transaction.category_id)}
          </span>
        </div>

        {isLinkedRefund && (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-emerald-800">Linked as refund</p>
                {transaction.original_transaction && (
                  <p className="text-xs text-emerald-600 mt-1">
                    Original: {formatCurrency(transaction.original_transaction.amount_cents)} on {formatDate(transaction.original_transaction.date)}
                  </p>
                )}
              </div>
              <button
                onClick={handleUnlinkRefund}
                disabled={isUnlinking}
                className="text-sm text-red-600 hover:text-red-700 font-medium disabled:opacity-50"
              >
                {isUnlinking ? 'Unlinking...' : 'Unlink'}
              </button>
            </div>
          </div>
        )}

        {hasRefunds && (
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
            <p className="text-sm font-medium text-blue-800 mb-2">
              Refunds ({transaction.refunds!.length})
            </p>
            <div className="space-y-1">
              {transaction.refunds!.map(refund => (
                <div key={refund.id} className="flex justify-between text-sm">
                  <span className="text-blue-600">{formatDate(refund.date)}</span>
                  <span className="text-emerald-600 font-medium">
                    +{formatCurrency(refund.amount_cents)}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-2 pt-2 border-t border-blue-200 flex justify-between text-sm font-medium">
              <span className="text-blue-800">Net amount</span>
              <span className="text-slate-800">
                {formatCurrency(
                  transaction.amount_cents -
                  transaction.refunds!.reduce((sum, r) => sum + r.amount_cents, 0)
                )}
              </span>
            </div>
          </div>
        )}

        {isRefund && !isLinkedRefund && hasId && (
          <div className="border-t border-slate-200 pt-4 mt-4">
            <h4 className="text-sm font-semibold text-slate-700 mb-3">
              Link as refund to original purchase
            </h4>

            {potentialOriginals.length === 0 && !isLoadingOriginals ? (
              <p className="text-sm text-slate-400 italic">
                No matching transactions found from "{transaction.vendor}" before this date.
              </p>
            ) : (
              <div className="space-y-2">
                {potentialOriginals.map(original => (
                  <div
                    key={original.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 transition-colors"
                  >
                    <div>
                      <p className="text-sm font-medium text-slate-800">
                        {formatCurrency(original.amount_cents)}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(original.date)}
                        {original.refunds && original.refunds.length > 0 && (
                          <span className="ml-2 text-blue-500">
                            ({original.refunds.length} existing refund{original.refunds.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      onClick={() => handleLinkRefund(original.id!)}
                      disabled={isLinking}
                      className="px-3 py-1.5 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:bg-emerald-100 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Link
                    </button>
                  </div>
                ))}

                {isLoadingOriginals && (
                  <p className="text-sm text-slate-400 text-center py-2">Loading...</p>
                )}

                {hasMoreOriginals && !isLoadingOriginals && (
                  <button
                    onClick={handleLoadMore}
                    className="w-full py-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Load more ({totalOriginals - potentialOriginals.length} remaining)
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {isRefund && !hasId && (
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-700">
              Save this transaction to enable refund linking.
            </p>
          </div>
        )}
      </div>
    </Modal>
  );
}

export default TransactionDetailModal;
