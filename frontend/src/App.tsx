import { useState, useEffect } from 'react';
import FileUpload from './components/FileUpload';
import TransactionTable from './components/TransactionTable';
import type { Transaction, Category, UploadResponse } from './types';

const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await fetch(`${apiUrl}/api/categories`);
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories);
        }
      } catch (error) {
        console.error('Failed to fetch categories:', error);
      }
    };

    fetchCategories();
  }, []);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);

    try {
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data: UploadResponse = await response.json();
        setTransactions(data.transactions);
        setShowPreview(true);
      } else {
        console.error('Upload failed:', response.statusText);
      }
    } catch (error) {
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
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
    setSelectedFile(null);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto max-w-4xl px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500 text-white font-bold text-lg">
              B
            </div>
            <span className="text-xl font-semibold text-slate-800">Budget</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-4xl px-6 py-12">
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

        {/* Content Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm border border-slate-200">
          {showPreview ? (
            <TransactionTable
              transactions={transactions}
              categories={categories}
              onUpdate={handleUpdateTransaction}
              onRemove={handleRemoveTransaction}
              onCreateCategory={handleCreateCategory}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
              isLoading={isSaving}
            />
          ) : (
            <>
              <FileUpload onFileSelect={handleFileSelect} />

              {selectedFile && (
                <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600">
                      <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-slate-800">{selectedFile.name}</p>
                      <p className="text-sm text-slate-500">
                        {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleUpload}
                    disabled={isUploading}
                    className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-emerald-300 text-white font-medium rounded-xl transition-colors cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isUploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
