import { useState, useRef } from 'react';
import type { DragEvent, ChangeEvent } from 'react';
import './FileUpload.css';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
  accept?: string;
}

function FileUpload({ onFileSelect, accept = '.csv' }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
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
        setFileName(file.name);
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
      const file = files[0];
      setFileName(file.name);
      onFileSelect(file);
    }
  };

  return (
    <div
      className={`file-upload ${isDragging ? 'dragging' : ''}`}
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
      <div className="file-upload-content">
        {fileName ? (
          <>
            <span className="file-icon">📄</span>
            <p className="file-name">{fileName}</p>
            <p className="file-hint">Click or drop to replace</p>
          </>
        ) : (
          <>
            <span className="upload-icon">📁</span>
            <p className="upload-text">Drop your CSV file here</p>
            <p className="upload-hint">or click to browse</p>
          </>
        )}
      </div>
    </div>
  );
}

export default FileUpload;
