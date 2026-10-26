export default function DownloadButton({ document, onDownload }) {
  return (
    <button
      className="download-button"
      type="button"
      onClick={() => onDownload(document)}
      aria-label={`Baixar ${document.originalName}`}
      title={`Baixar ${document.originalName}`}
    >
      <span aria-hidden="true">↓</span>
      Baixar
    </button>
  );
}