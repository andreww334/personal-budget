import { useState, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

function FileUpload({ onFileSelect, accept = '.csv' }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.name.endsWith('.csv')) {
        onFileSelect(file);
      }
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileSelect(files[0]);
    }
  };

  return (
    <div
      className={`
        relative rounded-xl border-2 border-dashed p-12 text-center cursor-pointer
        transition-all duration-200
        ${isDragging
          ? 'border-emerald-400 bg-emerald-50'
          : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
        }
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept={accept}
        hidden
      />

      <div className="flex flex-col items-center gap-4">
        <div className={`
          flex h-14 w-14 items-center justify-center rounded-full
          ${isDragging ? 'bg-emerald-100' : 'bg-slate-100'}
        `}>
          <svg
            className={`h-7 w-7 ${isDragging ? 'text-emerald-500' : 'text-slate-400'}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <div>
          <p className="text-slate-700 font-medium">
            Drop your CSV file here
          </p>
          <p className="mt-1 text-sm text-slate-400">
            or click to browse
          </p>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
