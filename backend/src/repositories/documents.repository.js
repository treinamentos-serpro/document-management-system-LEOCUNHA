const fs = require('node:fs/promises');
const path = require('node:path');

const documents = new Map();

function getStorageDirectory() {
  return path.resolve(
    process.env.STORAGE_DIR || path.resolve(__dirname, '../../storage'),
  );
}

function save(document) {
  documents.set(document.id, document);
}

function listByOwner(owner) {
  return Array.from(documents.values())
    .filter((document) => document.owner === owner)
    .sort((first, second) => second.uploadedAt.localeCompare(first.uploadedAt));
}

function findByIdAndOwner(id, owner) {
  const document = documents.get(id);
  return document?.owner === owner ? document : null;
}

function getStoredFilePath(storageName) {
  return path.join(getStorageDirectory(), storageName);
}

async function deleteStoredFile(storageName) {
  try {
    await fs.unlink(getStoredFilePath(storageName));
  } catch (error) {
    if (error.code !== 'ENOENT') {
      throw error;
    }
  }
}

function toPublicDocument(document) {
  const { storageName, ...publicDocument } = document;
  return publicDocument;
}

module.exports = {
  save,
  listByOwner,
  findByIdAndOwner,
  getStoredFilePath,
  deleteStoredFile,
  toPublicDocument,
};