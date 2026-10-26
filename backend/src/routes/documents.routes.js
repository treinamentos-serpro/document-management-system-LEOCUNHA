const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const multer = require('multer');
const express = require('express');
const documentsController = require('../controllers/documents.controller');

const router = express.Router();
const DEFAULT_MAX_FILE_SIZE = 10 * 1024 * 1024;

function getStorageDirectory() {
  return path.resolve(
    process.env.STORAGE_DIR || path.resolve(__dirname, '../../storage'),
  );
}

function getMaxFileSize() {
  const configuredSize = Number.parseInt(process.env.MAX_FILE_SIZE, 10);
  return Number.isInteger(configuredSize) && configuredSize > 0
    ? configuredSize
    : DEFAULT_MAX_FILE_SIZE;
}

const upload = multer({
  storage: multer.diskStorage({
    destination(req, file, callback) {
      const storageDirectory = getStorageDirectory();
      fs.mkdir(storageDirectory, { recursive: true }, (error) => {
        callback(error, storageDirectory);
      });
    },
    filename(req, file, callback) {
      callback(null, crypto.randomUUID());
    },
  }),
  limits: { fileSize: getMaxFileSize(), files: 1 },
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      return next();
    }

    if (error instanceof multer.MulterError) {
      const isTooLarge = error.code === 'LIMIT_FILE_SIZE';
      return res.status(isTooLarge ? 413 : 400).json({
        error: {
          code: isTooLarge ? 'FILE_TOO_LARGE' : 'INVALID_UPLOAD',
          message: isTooLarge
            ? 'O arquivo excede o limite permitido.'
            : 'Não foi possível receber o arquivo enviado.',
        },
      });
    }

    return next(error);
  });
}

router.post('/upload', handleUpload, documentsController.uploadDocument);
router.get('/documents', documentsController.listDocuments);
router.get('/documents/:id/download', documentsController.downloadDocument);

module.exports = router;