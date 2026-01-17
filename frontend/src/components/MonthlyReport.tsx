import { useState, useEffect } from 'react';
import type { MonthlyData, MonthlyReportResponse } from '../types';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1);
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

interface MonthCardProps {
  data: MonthlyData;
}

function MonthCard({ data }: MonthCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const netSavings = data.total_income - data.total_expenses;

  return (
    <div className="rounded-xl border border-slate-200 overflow-hidden">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-slate-800">
            {formatMonth(data.month)}
          </h3>
          {data.categories.length > 0 && (
            <span className="text-xs text-slate-400">
              {data.categories.length} categor{data.categories.length === 1 ? 'y' : 'ies'}
            </span>
          )}
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-xs text-slate-400">Expenses</p>
            <p className="text-sm font-medium text-slate-800">
              {formatCurrency(data.total_expenses)}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-slate-400">Income</p>
            <p className="text-sm font-medium text-emerald-600">
              {formatCurrency(data.total_income)}
            </p>
          </div>
          <div className="text-right min-w-24">
            <p className="text-xs text-slate-400">Net</p>
            <p className={`text-sm font-medium ${
              netSavings >= 0 ? 'text-emerald-600' : 'text-red-600'
            }`}>
              {netSavings >= 0 ? '+' : ''}{formatCurrency(netSavings)}
            </p>
          </div>
          <svg
            className={`w-5 h-5 text-slate-400 transition-transform ${
              isExpanded ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {isExpanded && data.categories.length > 0 && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <h4 className="text-sm font-medium text-slate-600 mb-3">Expenses by Category</h4>
          <div className="space-y-2">
            {data.categories.map((cat, idx) => {
              const percentage = data.total_expenses > 0
                ? (cat.total / data.total_expenses) * 100
                : 0;
              return (
                <div key={cat.category_id ?? idx} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-700">{cat.category_name}</span>
                      <span className="text-sm font-medium text-slate-800">
                        {formatCurrency(cat.total)}
                      </span>
                    </div>
                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 w-12 text-right">
                    {percentage.toFixed(0)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {isExpanded && data.categories.length === 0 && (
        <div className="border-t border-slate-100 bg-slate-50 p-4">
          <p className="text-sm text-slate-400 italic">No categorized expenses this month</p>
        </div>
      )}
    </div>
  );
}

function MonthlyReport() {
  const [months, setMonths] = useState<MonthlyData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/reports/monthly`);
      if (response.ok) {
        const data: MonthlyReportResponse = await response.json();
        setMonths(data.months);
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

  // Calculate totals across all months
  const totalExpenses = months.reduce((sum, m) => sum + m.total_expenses, 0);
  const totalIncome = months.reduce((sum, m) => sum + m.total_income, 0);
  const totalNet = totalIncome - totalExpenses;

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

  if (months.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div className="text-slate-500">No data yet</div>
        <div className="text-sm text-slate-400">Import transactions to see your monthly report</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="text-2xl font-semibold text-slate-800">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-xl bg-emerald-50 p-4">
          <p className="text-sm text-emerald-600">Total Income</p>
          <p className="text-2xl font-semibold text-emerald-700">{formatCurrency(totalIncome)}</p>
        </div>
        <div className={`rounded-xl p-4 ${totalNet >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
          <p className={`text-sm ${totalNet >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            Net Savings
          </p>
          <p className={`text-2xl font-semibold ${totalNet >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {totalNet >= 0 ? '+' : ''}{formatCurrency(totalNet)}
          </p>
        </div>
      </div>

      {/* Monthly breakdown */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-slate-600">Monthly Breakdown</h3>
        {months.map(month => (
          <MonthCard key={month.month} data={month} />
        ))}
      </div>
    </div>
  );
}

export default MonthlyReport;
