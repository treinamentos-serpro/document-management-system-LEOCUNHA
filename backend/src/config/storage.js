const path = require('node:path');

const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;
const DEFAULT_MAX_STORAGE_BYTES = 1024 * 1024 * 1024;

function getPositiveInteger(name, fallback) {
  const configuredValue = Number.parseInt(process.env[name], 10);
  return Number.isInteger(configuredValue) && configuredValue > 0
    ? configuredValue
    : fallback;
}

function getStorageDirectory() {
  return path.resolve(
    process.env.STORAGE_DIR || path.resolve(__dirname, '../../storage'),
  );
}

function getMaxFileSize() {
  return getPositiveInteger('MAX_FILE_SIZE', DEFAULT_MAX_FILE_SIZE);
}

function getMaxStorageBytes() {
  return getPositiveInteger('MAX_STORAGE_BYTES', DEFAULT_MAX_STORAGE_BYTES);
}

module.exports = {
  getStorageDirectory,
  getMaxFileSize,
  getMaxStorageBytes,
};