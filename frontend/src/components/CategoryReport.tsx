import { useState, useEffect } from 'react';
import type { CategoryReportItem, CategoryReportResponse } from '../types';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function CategoryReport() {
  const [categories, setCategories] = useState<CategoryReportItem[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/reports/by-category`);
      if (response.ok) {
        const data: CategoryReportResponse = await response.json();
        setCategories(data.categories);
        setTotalExpenses(data.total_expenses);
      } else {
        setError('Failed to load report');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error('Failed to fetch report:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-500">Loading report...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-4">
        <div className="text-red-500">{error}</div>
        <button
          onClick={fetchReport}
          className="px-4 py-2 text-sm font-medium text-emerald-600 hover:text-emerald-700"
        >
          Try again
        </button>
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div className="text-slate-500">No data yet</div>
        <div className="text-sm text-slate-400">Import transactions to see your category breakdown</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="text-2xl font-semibold text-slate-800">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Categories</p>
          <p className="text-2xl font-semibold text-slate-800">{categories.length}</p>
        </div>
      </div>

      {/* Category breakdown */}
      <div className="space-y-3">
        {categories.map((cat, idx) => {
          const percentage = totalExpenses > 0 ? (cat.total / totalExpenses) * 100 : 0;
          return (
            <div
              key={cat.category_id ?? idx}
              className="rounded-xl border border-slate-200 p-4"
            >
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-medium text-slate-800">{cat.category_name}</h3>
                  <p className="text-sm text-slate-500">
                    {cat.transaction_count} transaction{cat.transaction_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-semibold text-slate-800">
                    {formatCurrency(cat.total)}
                  </p>
                  <p className="text-sm text-slate-500">{percentage.toFixed(1)}%</p>
                </div>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default CategoryReport;
