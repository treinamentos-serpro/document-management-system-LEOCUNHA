import { useRef, useState } from 'react';

export default function UploadComponent({ isUploading, onUpload }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  function selectFile(file) {
    if (file) {
      setSelectedFile(file);
    }
  }

  function handleDrop(event) {
    event.preventDefault();
    setIsDragging(false);
    selectFile(event.dataTransfer.files[0]);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (selectedFile && (await onUpload(selectedFile))) {
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  function clearFile() {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <label
        className={`drop-zone${isDragging ? ' drop-zone-active' : ''}${selectedFile ? ' drop-zone-selected' : ''}`}
        htmlFor="document-file"
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <input
          ref={fileInputRef}
          className="visually-hidden"
          id="document-file"
          type="file"
          onChange={(event) => selectFile(event.target.files[0])}
          disabled={isUploading}
        />
        <span className="upload-symbol" aria-hidden="true">↑</span>
        {selectedFile ? (
          <span className="selected-file-name">{selectedFile.name}</span>
        ) : (
          <>
            <span className="drop-title">Escolher arquivo</span>
            <span className="drop-caption">ou solte aqui</span>
          </>
        )}
      </label>

      {selectedFile && (
        <div className="selected-file-row">
          <span className="selected-file-size">
            {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
          </span>
          <button
            className="text-button"
            type="button"
            onClick={clearFile}
            disabled={isUploading}
          >
            Remover
          </button>
        </div>
      )}

      <button className="upload-button" type="submit" disabled={!selectedFile || isUploading}>
        <span aria-hidden="true">{isUploading ? '…' : '↗'}</span>
        {isUploading ? 'Enviando' : 'Enviar arquivo'}
      </button>
    </form>
  );
}