import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import TransactionTable from './components/TransactionTable';
import TransactionsList from './components/TransactionsList';
import TransactionDetailModal from './components/TransactionDetailModal';
import MonthlyReport from './components/MonthlyReport';
import CategoryReport from './components/CategoryReport';
import VendorReport from './components/VendorReport';
import Login from './components/Login';
import Register from './components/Register';
import { useAuth } from './contexts/AuthContext';
import type { Transaction, Category, UploadResponse } from './types';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

type Tab = 'transactions' | 'reports' | 'import';
type ReportTab = 'monthly' | 'category' | 'vendor';
type AuthView = 'login' | 'register';

function App() {
  const { user, isLoading: authLoading, isAuthenticated, logout } = useAuth();
  const [authView, setAuthView] = useState<AuthView>('login');
  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [reportTab, setReportTab] = useState<ReportTab>('monthly');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPreviewTransaction, setSelectedPreviewTransaction] = useState<Transaction | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

  // Fetch categories when authenticated
  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchCategories = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/categories`, {
          credentials: 'include',
        });
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, [isAuthenticated]);

  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles(files);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress('');
    const allTransactions: Transaction[] = [];
    const errors: string[] = [];

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        setUploadProgress(`Uploading ${i + 1} of ${selectedFiles.length}: ${file.name}`);

        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch(`${apiUrl}/api/upload`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });

        if (response.ok) {
          const data: UploadResponse = await response.json();
          allTransactions.push(...data.transactions);
        } else {
          const errorData = await response.json().catch(() => ({ error: 'Upload failed' }));
          errors.push(`${file.name}: ${errorData.error || 'Upload failed'}`);
        }
      }

      if (allTransactions.length > 0) {
        setTransactions(allTransactions);
        setShowPreview(true);
      }

      if (errors.length > 0) {
        alert(`Some files failed to upload:\n${errors.join('\n')}`);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
      setUploadProgress('');
    }
  };

  const handleConfirm = async () => {
    setIsSaving(true);

    try {
      const response = await fetch(`${apiUrl}/api/transactions/commit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ transactions }),
      });

      if (response.ok) {
        const data = await response.json();
        alert(`Successfully imported ${data.created} transactions!`);
        handleCancel(); // Reset to upload screen
      } else {
        const error = await response.json();
        console.error('Commit failed:', error);
        alert('Failed to save transactions');
      }
    } catch (error) {
      console.error('Commit error:', error);
      alert('Failed to save transactions');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setTransactions([]);
    setShowPreview(false);
    setSelectedFiles([]);
  };

  const handleUpdateTransaction = (index: number, updates: Partial<Transaction>) => {
    setTransactions(prev => prev.map((t, i) =>
      i === index ? { ...t, ...updates } : t
    ));
  };

  const handleRemoveTransaction = (index: number) => {
    setTransactions(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateCategory = async (name: string): Promise<Category> => {
    const response = await fetch(`${apiUrl}/api/categories`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify({ name }),
    });

    if (!response.ok) {
      throw new Error('Failed to create category');
    }

    const newCategory: Category = await response.json();

    // Add to local state if it's new
    setCategories(prev => {
      if (prev.some(c => c.id === newCategory.id)) {
        return prev;
      }
      return [...prev, newCategory].sort((a, b) => a.name.localeCompare(b.name));
    });

    return newCategory;
  };

  const handlePreviewTransactionClick = (transaction: Transaction) => {
    setSelectedPreviewTransaction(transaction);
    setIsPreviewModalOpen(true);
  };

  const handlePreviewTransactionUpdate = (updated: Transaction) => {
    setTransactions(prev =>
      prev.map(t => (t.id === updated.id ? updated : t))
    );
    setSelectedPreviewTransaction(updated);
  };

  // Show loading state while checking auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  // Show login/register if not authenticated
  if (!isAuthenticated) {
    if (authView === 'login') {
      return <Login onSwitchToRegister={() => setAuthView('register')} />;
    }
    return <Register onSwitchToLogin={() => setAuthView('login')} />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold text-lg">
                B
              </div>
              <span className="text-xl font-semibold text-slate-800">Budget</span>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-slate-600">{user?.name}</span>
              <button
                onClick={logout}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
        {/* Tab Navigation */}
        <div className="mb-8 flex gap-1 p-1 bg-slate-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'transactions'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'reports'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Reports
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
              activeTab === 'import'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Import
          </button>
        </div>

        {activeTab === 'transactions' && (
          <>
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Transactions</h1>
              <p className="text-slate-500">View and manage your transactions. Click a row to see details.</p>
            </div>
            <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
              <TransactionsList categories={categories} onCreateCategory={handleCreateCategory} />
            </div>
          </>
        )}

        {activeTab === 'reports' && (
          <>
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">Reports</h1>
              <p className="text-slate-500">See your spending and income trends.</p>
            </div>

            {/* Report Sub-tabs */}
            <div className="mb-6 flex gap-2 border-b border-slate-200">
              <button
                onClick={() => setReportTab('monthly')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  reportTab === 'monthly'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Monthly
              </button>
              <button
                onClick={() => setReportTab('category')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  reportTab === 'category'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                By Category
              </button>
              <button
                onClick={() => setReportTab('vendor')}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  reportTab === 'vendor'
                    ? 'border-emerald-500 text-emerald-600'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                By Vendor
              </button>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
              {reportTab === 'monthly' && <MonthlyReport />}
              {reportTab === 'category' && <CategoryReport />}
              {reportTab === 'vendor' && <VendorReport />}
            </div>
          </>
        )}

        {activeTab === 'import' && (
          <>
            <div className="mb-10">
              <h1 className="text-3xl font-bold text-slate-900 mb-2">
                {showPreview ? 'Review Transactions' : 'Import Transactions'}
              </h1>
              <p className="text-slate-500">
                {showPreview
                  ? 'Review the parsed transactions before importing.'
                  : 'Upload your bank statement to get started tracking your spending.'}
              </p>
            </div>

            <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
              {showPreview ? (
                <>
                  <TransactionTable
                    transactions={transactions}
                    categories={categories}
                    onUpdate={handleUpdateTransaction}
                    onRemove={handleRemoveTransaction}
                    onCreateCategory={handleCreateCategory}
                    onConfirm={handleConfirm}
                    onCancel={handleCancel}
                    isLoading={isSaving}
                    onTransactionClick={handlePreviewTransactionClick}
                  />
                  <TransactionDetailModal
                    transaction={selectedPreviewTransaction}
                    categories={categories}
                    isOpen={isPreviewModalOpen}
                    onClose={() => {
                      setIsPreviewModalOpen(false);
                      setSelectedPreviewTransaction(null);
                    }}
                    onTransactionUpdate={handlePreviewTransactionUpdate}
                  />
                </>
              ) : (
                <>
                  <FileUpload onFilesSelect={handleFilesSelect} />

                  {selectedFiles.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <div className="space-y-2">
                        {selectedFiles.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-slate-800">{file.name}</p>
                                <p className="text-xs text-slate-500">
                                  {(file.size / 1024).toFixed(1)} KB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== index))}
                              className="text-slate-400 hover:text-red-500 p-1"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <p className="text-sm text-slate-500">
                          {selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected
                        </p>
                        <button
                          onClick={handleUpload}
                          disabled={isUploading}
                          className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
                        >
                          {isUploading ? (uploadProgress || 'Uploading...') : 'Upload'}
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default App;
