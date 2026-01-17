import { useState, useEffect } from 'react';
import type { VendorReportItem, VendorReportResponse } from '../types';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function formatCurrency(cents: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);
}

function VendorReport() {
  const [vendors, setVendors] = useState<VendorReportItem[]>([]);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [vendorCount, setVendorCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${apiUrl}/api/reports/by-vendor`, {
        credentials: 'include',
      });
      if (response.ok) {
        const data: VendorReportResponse = await response.json();
        setVendors(data.vendors);
        setTotalExpenses(data.total_expenses);
        setVendorCount(data.vendor_count);
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

  if (vendors.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-2">
        <div className="text-slate-500">No data yet</div>
        <div className="text-sm text-slate-400">Import transactions to see your vendor breakdown</div>
      </div>
    );
  }

  // Find max for relative bar sizing
  const maxTotal = Math.max(...vendors.map(v => v.total));

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Total Expenses</p>
          <p className="text-2xl font-semibold text-slate-800">{formatCurrency(totalExpenses)}</p>
        </div>
        <div className="rounded-xl bg-slate-50 p-4">
          <p className="text-sm text-slate-500">Unique Vendors</p>
          <p className="text-2xl font-semibold text-slate-800">{vendorCount}</p>
        </div>
      </div>

      {/* Vendor breakdown */}
      <div>
        <h3 className="text-sm font-medium text-slate-600 mb-3">Top Vendors</h3>
        <div className="space-y-2">
          {vendors.map((vendor, idx) => {
            const barWidth = maxTotal > 0 ? (vendor.total / maxTotal) * 100 : 0;
            const percentage = totalExpenses > 0 ? (vendor.total / totalExpenses) * 100 : 0;
            return (
              <div
                key={idx}
                className="relative rounded-lg border border-slate-200 p-3 overflow-hidden"
              >
                {/* Background bar */}
                <div
                  className="absolute inset-y-0 left-0 bg-emerald-50"
                  style={{ width: `${barWidth}%` }}
                />
                {/* Content */}
                <div className="relative flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-400 w-6">{idx + 1}.</span>
                    <div>
                      <p className="font-medium text-slate-800">{vendor.vendor}</p>
                      <p className="text-xs text-slate-500">
                        {vendor.transaction_count} transaction{vendor.transaction_count !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-slate-800">
                      {formatCurrency(vendor.total)}
                    </p>
                    <p className="text-xs text-slate-500">{percentage.toFixed(1)}%</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {vendorCount > vendors.length && (
          <p className="text-sm text-slate-400 mt-3 text-center">
            Showing top {vendors.length} of {vendorCount} vendors
          </p>
        )}
      </div>
    </div>
  );
}

export default VendorReport;
