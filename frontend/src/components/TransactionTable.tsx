import { useState } from 'react';
import type { Transaction, Category } from '../types';
import CategorySelect from './CategorySelect';

interface TransactionTableProps {
  transactions: Transaction[];
  categories: Category[];
  onUpdate: (index: number, updates: Partial<Transaction>) => void;
  onRemove: (index: number) => void;
  onCreateCategory: (name: string) => Promise<Category>;
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

interface EditableCellProps {
  value: string;
  onSave: (value: string) => void;
  className?: string;
  placeholder?: string;
}

function EditableCell({ value, onSave, className = '', placeholder = '' }: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value);

  const handleSave = () => {
    setIsEditing(false);
    if (editValue !== value) {
      onSave(editValue);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(value);
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <input
        type="text"
        value={editValue}
        onChange={(e) => setEditValue(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className="w-full px-2 py-1 text-sm border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
        autoFocus
      />
    );
  }

  return (
    <span
      onClick={() => {
        setEditValue(value);
        setIsEditing(true);
      }}
      className={`cursor-pointer hover:bg-emerald-50 px-2 py-1 -mx-2 -my-1 rounded ${className}`}
      title="Click to edit"
    >
      {value || <span className="text-slate-300 italic">{placeholder}</span>}
    </span>
  );
}

interface EditableAmountProps {
  cents: number;
  direction: 'income' | 'expense';
  onSave: (cents: number) => void;
}

function EditableAmount({ cents, direction, onSave }: EditableAmountProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState((cents / 100).toFixed(2));

  const handleSave = () => {
    setIsEditing(false);
    const newCents = Math.round(parseFloat(editValue) * 100);
    if (!isNaN(newCents) && newCents !== cents) {
      onSave(newCents);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue((cents / 100).toFixed(2));
      setIsEditing(false);
    }
  };

  if (isEditing) {
    return (
      <div className="flex items-center justify-end gap-1">
        <span className="text-slate-400">$</span>
        <input
          type="number"
          step="0.01"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          className="w-24 px-2 py-1 text-sm text-right border border-emerald-300 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
          autoFocus
        />
      </div>
    );
  }

  return (
    <span
      onClick={() => {
        setEditValue((cents / 100).toFixed(2));
        setIsEditing(true);
      }}
      className={`cursor-pointer hover:bg-emerald-50 px-2 py-1 rounded ${
        direction === 'income' ? 'text-emerald-600' : 'text-slate-800'
      }`}
      title="Click to edit"
    >
      {direction === 'income' ? '+' : '-'}
      {formatCurrency(cents)}
    </span>
  );
}

function TransactionTable({
  transactions,
  categories,
  onUpdate,
  onRemove,
  onCreateCategory,
  onConfirm,
  onCancel,
  isLoading
}: TransactionTableProps) {
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

      {/* Help text */}
      <p className="text-sm text-slate-400">
        Click any cell to edit. Changes are applied before import.
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-slate-200">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="w-10 px-2 py-3"></th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Date</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Vendor</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Description</th>
              <th className="px-4 py-3 text-left text-sm font-medium text-slate-600">Category</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600">Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {transactions.map((transaction, index) => (
              <tr key={index} className="hover:bg-slate-50 group">
                <td className="px-2 py-3">
                  <button
                    onClick={() => onRemove(index)}
                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                    title="Remove transaction"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </td>
                <td className="px-4 py-3 text-sm text-slate-600">
                  {formatDate(transaction.date)}
                </td>
                <td className="px-4 py-3">
                  <EditableCell
                    value={transaction.vendor}
                    onSave={(value) => onUpdate(index, { vendor: value })}
                    className="text-sm font-medium text-slate-800"
                    placeholder="Enter vendor"
                  />
                </td>
                <td className="px-4 py-3">
                  <EditableCell
                    value={transaction.description}
                    onSave={(value) => onUpdate(index, { description: value })}
                    className="text-sm text-slate-600"
                    placeholder="Add description"
                  />
                </td>
                <td className="px-4 py-3">
                  <CategorySelect
                    categories={categories}
                    selectedId={transaction.category_id}
                    originalCategory={transaction.original_category}
                    onSelect={(categoryId) => onUpdate(index, { category_id: categoryId })}
                    onCreate={onCreateCategory}
                  />
                </td>
                <td className="px-4 py-3 text-right text-sm font-medium">
                  <EditableAmount
                    cents={transaction.amount_cents}
                    direction={transaction.direction}
                    onSave={(cents) => onUpdate(index, { amount_cents: cents })}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {transactions.length === 0 && (
        <div className="text-center py-8 text-slate-400">
          No transactions to import. All transactions have been removed.
        </div>
      )}

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
          disabled={isLoading || transactions.length === 0}
          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
        >
          {isLoading ? 'Saving...' : `Import ${transactions.length} Transactions`}
        </button>
      </div>
    </div>
  );
}

export default TransactionTable;
