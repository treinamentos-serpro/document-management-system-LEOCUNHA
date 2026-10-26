import DownloadButton from './DownloadButton.jsx';

function formatFileSize(size) {
  if (size < 1024) {
    return `${size} B`;
  }
  if (size < 1024 * 1024) {
    return `${(size / 1024).toFixed(1)} KB`;
  }
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(uploadedAt) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(uploadedAt));
}

function getFileExtension(filename) {
  const extension = filename.split('.').pop();
  return extension === filename ? 'ARQ' : extension.slice(0, 4).toUpperCase();
}

export default function DocumentList({
  documents,
  isLoading,
  onDownload,
  titleId,
}) {
  return (
    <>
      <div className="section-heading list-heading">
        <div className="list-title-group">
          <span className="section-index">02</span>
          <h2 id={titleId}>Biblioteca</h2>
        </div>
        <span className="list-count">{documents.length} {documents.length === 1 ? 'item' : 'itens'}</span>
      </div>

      {isLoading ? (
        <div className="list-state" role="status">Carregando documentos...</div>
      ) : documents.length === 0 ? (
        <div className="list-state empty-state">
          <span className="empty-mark" aria-hidden="true">—</span>
          <p>Nenhum documento</p>
        </div>
      ) : (
        <>
          <div className="document-columns" aria-hidden="true">
            <span>Nome</span>
            <span>Data de envio</span>
            <span>Tamanho</span>
            <span />
          </div>
          <ul className="document-list">
            {documents.map((document) => (
              <li className="document-row" key={document.id}>
                <div className="document-name-cell">
                  <span className="file-extension" aria-hidden="true">
                    {getFileExtension(document.originalName)}
                  </span>
                  <div className="document-name-wrap">
                    <span className="document-name" title={document.originalName}>
                      {document.originalName}
                    </span>
                    <span className="document-type">{document.mimeType}</span>
                  </div>
                </div>
                <time className="document-date" dateTime={document.uploadedAt}>
                  {formatDate(document.uploadedAt)}
                </time>
                <span className="document-size">{formatFileSize(document.size)}</span>
                <DownloadButton
                  document={document}
                  onDownload={onDownload}
                />
              </li>
            ))}
          </ul>
        </>
      )}
    </>
  );
}