import { useState, useRef, useEffect } from 'react';
import type { Category } from '../types';

interface CategorySelectProps {
  categories: Category[];
  selectedId: string | null | undefined;
  originalCategory?: string;
  onSelect: (categoryId: string | null) => void;
  onCreate: (name: string) => Promise<Category>;
}

function CategorySelect({
  categories,
  selectedId,
  originalCategory,
  onSelect,
  onCreate,
}: CategorySelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedCategory = categories.find(c => c.id === selectedId);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const filteredCategories = categories.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const showCreateOption = search.trim() &&
    !categories.some(c => c.name.toLowerCase() === search.toLowerCase().trim());

  const handleCreate = async () => {
    if (!search.trim()) return;

    setIsCreating(true);
    try {
      const newCategory = await onCreate(search.trim());
      onSelect(newCategory.id);
      setIsOpen(false);
      setSearch('');
    } catch (error) {
      console.error('Failed to create category:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelect = (categoryId: string | null) => {
    onSelect(categoryId);
    setIsOpen(false);
    setSearch('');
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors cursor-pointer"
      >
        {selectedCategory ? (
          selectedCategory.name
        ) : originalCategory ? (
          <span className="text-slate-400 italic">{originalCategory}</span>
        ) : (
          <span className="text-slate-400">Select category</span>
        )}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-56 rounded-lg bg-white shadow-lg border border-slate-200 py-1">
          {/* Search input */}
          <div className="px-2 pb-1">
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search or create..."
              className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-emerald-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && showCreateOption) {
                  handleCreate();
                }
              }}
            />
          </div>

          {/* Category list */}
          <div className="max-h-48 overflow-y-auto">
            {/* None option */}
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 ${
                !selectedId ? 'bg-emerald-50 text-emerald-700' : 'text-slate-600'
              }`}
            >
              <span className="italic">No category</span>
            </button>

            {filteredCategories.map((category) => (
              <button
                key={category.id}
                type="button"
                onClick={() => handleSelect(category.id)}
                className={`w-full text-left px-3 py-1.5 text-sm hover:bg-slate-50 ${
                  selectedId === category.id ? 'bg-emerald-50 text-emerald-700' : 'text-slate-700'
                }`}
              >
                {category.name}
              </button>
            ))}

            {/* Create new option */}
            {showCreateOption && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={isCreating}
                className="w-full text-left px-3 py-1.5 text-sm text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {isCreating ? 'Creating...' : `Create "${search.trim()}"`}
              </button>
            )}

            {filteredCategories.length === 0 && !showCreateOption && (
              <div className="px-3 py-2 text-sm text-slate-400">
                No categories found
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CategorySelect;
