const crypto = require('node:crypto');
const path = require('node:path');
const documentsRepository = require('../repositories/documents.repository');

function createError(status, code, message) {
  const error = new Error(message);
  error.status = status;
  error.code = code;
  return error;
}

function sanitizeOriginalName(name) {
  const baseName = path.posix.basename(String(name || '').replaceAll('\\', '/'));
  const sanitizedName = baseName.replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return sanitizedName || 'document';
}

function sanitizeMimeType(mimeType) {
  const candidate = String(mimeType || '');
  return /^[\w!#$&^_.+-]+\/[\w!#$&^_.+-]+$/.test(candidate)
    ? candidate
    : 'application/octet-stream';
}

function getOwner() {
  return process.env.DEFAULT_OWNER_ID || 'default';
}

async function createDocument(file) {
  if (!file || !file.filename) {
    throw createError(400, 'FILE_REQUIRED', 'Envie um arquivo no campo "file".');
  }

  if (file.size === 0) {
    await documentsRepository.deleteStoredFile(file.filename);
    throw createError(400, 'EMPTY_FILE', 'O arquivo enviado está vazio.');
  }

  const document = {
    id: crypto.randomUUID(),
    originalName: sanitizeOriginalName(file.originalname),
    storageName: file.filename,
    size: file.size,
    mimeType: sanitizeMimeType(file.mimetype),
    uploadedAt: new Date().toISOString(),
    owner: getOwner(),
  };

  try {
    documentsRepository.save(document);
  } catch (error) {
    await documentsRepository.deleteStoredFile(file.filename).catch(() => {});
    throw error;
  }

  return documentsRepository.toPublicDocument(document);
}

async function listDocuments() {
  return documentsRepository
    .listByOwner(getOwner())
    .map((document) => documentsRepository.toPublicDocument(document));
}

async function getDocumentForDownload(id) {
  const document = documentsRepository.findByIdAndOwner(id, getOwner());
  if (!document) {
    throw createError(404, 'DOCUMENT_NOT_FOUND', 'Documento não encontrado.');
  }

  return {
    document: documentsRepository.toPublicDocument(document),
    filePath: documentsRepository.getStoredFilePath(document.storageName),
  };
}

module.exports = {
  createDocument,
  listDocuments,
  getDocumentForDownload,
};