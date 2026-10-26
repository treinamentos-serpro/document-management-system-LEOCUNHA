import { useEffect, useState } from 'react';
import DocumentList from './components/DocumentList.jsx';
import UploadComponent from './components/UploadComponent.jsx';
import {
  downloadDocument,
  listDocuments,
  uploadDocument,
} from './services/documentsApi.js';
import './App.css';

export default function App() {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);
  const [feedback, setFeedback] = useState(null);

  useEffect(() => {
    let isActive = true;

    listDocuments()
      .then((loadedDocuments) => {
        if (isActive) {
          setDocuments(loadedDocuments);
        }
      })
      .catch((error) => {
        if (isActive) {
          setFeedback({ type: 'error', message: error.message });
        }
      })
      .finally(() => {
        if (isActive) {
          setIsLoading(false);
        }
      });

    return () => {
      isActive = false;
    };
  }, []);

  async function handleUpload(file) {
    setIsUploading(true);
    setFeedback(null);

    try {
      const uploadedDocument = await uploadDocument(file);
      setDocuments((currentDocuments) => [
        uploadedDocument,
        ...currentDocuments.filter((document) => document.id !== uploadedDocument.id),
      ]);
      setFeedback({ type: 'success', message: 'Arquivo enviado com sucesso.' });
      return true;
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
      return false;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDownload(document) {
    setDownloadingId(document.id);
    setFeedback(null);

    try {
      await downloadDocument(document.id, document.originalName);
      setFeedback({ type: 'success', message: 'Download iniciado.' });
    } catch (error) {
      setFeedback({ type: 'error', message: error.message });
    } finally {
      setDownloadingId(null);
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="DMS, início">
          <span className="brand-mark" aria-hidden="true">D</span>
          <span className="brand-name">arquivo<span>;</span></span>
        </a>
        <div className="environment-label">
          <span className="status-dot" aria-hidden="true" />
          Espaço local
        </div>
      </header>

      <main className="workspace">
        <section className="page-heading" aria-labelledby="page-title">
          <div>
            <p className="eyebrow">DOCUMENTOS / VISÃO GERAL</p>
            <h1 id="page-title">Seus documentos</h1>
          </div>
          <div className="document-counter" aria-label={`${documents.length} documentos`}>
            <span className="counter-value">{String(documents.length).padStart(2, '0')}</span>
            <span className="counter-label">itens<br />arquivados</span>
          </div>
        </section>

        {feedback && (
          <p className={`feedback feedback-${feedback.type}`} role="status" aria-live="polite">
            <span aria-hidden="true">{feedback.type === 'error' ? '!' : '✓'}</span>
            {feedback.message}
          </p>
        )}

        <div className="workspace-grid">
          <section className="upload-section" aria-labelledby="upload-title">
            <div className="section-heading">
              <span className="section-index">01</span>
              <h2 id="upload-title">Adicionar arquivo</h2>
            </div>
            <UploadComponent isUploading={isUploading} onUpload={handleUpload} />
          </section>

          <section className="documents-section" aria-labelledby="documents-title">
            <DocumentList
              documents={documents}
              downloadingId={downloadingId}
              isLoading={isLoading}
              onDownload={handleDownload}
              titleId="documents-title"
            />
          </section>
        </div>
      </main>

      <footer className="page-footer">
        <span>ARQUIVO; <span className="footer-year">2026</span></span>
        <span>Gestão documental</span>
      </footer>
    </div>
  );
}
