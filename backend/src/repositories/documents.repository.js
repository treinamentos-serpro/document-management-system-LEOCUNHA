const fs = require('node:fs/promises');
const path = require('node:path');
const { getStorageDirectory } = require('../config/storage');

const documents = new Map();
const STORAGE_NAME_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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
  if (!STORAGE_NAME_PATTERN.test(storageName)) {
    throw new Error('Nome interno de arquivo inválido.');
  }

  const storageDirectory = getStorageDirectory();
  const filePath = path.resolve(storageDirectory, storageName);
  const relativePath = path.relative(storageDirectory, filePath);
  if (!relativePath || relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
    throw new Error('Caminho de arquivo fora do diretório de armazenamento.');
  }

  return filePath;
}

async function getStoredBytes() {
  let entries;
  try {
    entries = await fs.readdir(getStorageDirectory(), { withFileTypes: true });
  } catch (error) {
    if (error.code === 'ENOENT') {
      return 0;
    }
    throw error;
  }

  const fileSizes = await Promise.all(
    entries
      .filter((entry) => entry.isFile())
      .map((entry) => fs.stat(path.join(getStorageDirectory(), entry.name)))
      .map((statPromise) => statPromise.then((stat) => stat.size)),
  );

  return fileSizes.reduce((total, size) => total + size, 0);
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
  getStoredBytes,
  deleteStoredFile,
  toPublicDocument,
};