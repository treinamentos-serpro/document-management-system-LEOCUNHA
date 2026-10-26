const documentsService = require('../services/documents.service');

async function uploadDocument(req, res) {
  if (!req.file) {
    return res.status(400).json({
      error: {
        code: 'FILE_REQUIRED',
        message: 'Envie um arquivo no campo "file".',
      },
    });
  }

  const document = await documentsService.createDocument(req.file);
  return res.status(201).json(document);
}

async function listDocuments(req, res) {
  const documents = await documentsService.listDocuments();
  return res.status(200).json({ documents });
}

async function downloadDocument(req, res, next) {
  const { document, filePath } = await documentsService.getDocumentForDownload(req.params.id);
  res.type(document.mimeType);

  res.download(filePath, document.originalName, (error) => {
    if (!error) {
      return;
    }

    if (res.headersSent) {
      return next(error);
    }

    if (error.code === 'ENOENT') {
      return res.status(404).json({
        error: {
          code: 'DOCUMENT_NOT_FOUND',
          message: 'Documento não encontrado.',
        },
      });
    }

    return next(error);
  });
}

module.exports = {
  uploadDocument,
  listDocuments,
  downloadDocument,
};