import { useState } from 'react';
import FileUpload from './components/FileUpload';
import './App.css';

function App() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    console.log('Selected file:', file.name);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('file', selectedFile);

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5001';

    try {
      const response = await fetch(`${apiUrl}/api/upload`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Upload successful:', data);
      } else {
        console.error('Upload failed:', response.statusText);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  };

  return (
    <div className="app">
      <h1>Personal Budget</h1>
      <p className="subtitle">Upload your bank statement to get started</p>

      <div className="upload-section">
        <FileUpload onFileSelect={handleFileSelect} />

        {selectedFile && (
          <button className="upload-button" onClick={handleUpload}>
            Upload {selectedFile.name}
          </button>
        )}
      </div>
    </div>
  );
}

export default App;
