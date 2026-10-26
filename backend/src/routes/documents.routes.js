const crypto = require('node:crypto');
const fs = require('node:fs');
const multer = require('multer');
const express = require('express');
const documentsController = require('../controllers/documents.controller');
const uploadRateLimiter = require('../middleware/uploadRateLimiter');
const { getStorageDirectory, getMaxFileSize } = require('../config/storage');

const router = express.Router();

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
  limits: {
    fileSize: getMaxFileSize(),
    files: 1,
    fields: 1,
    parts: 2,
    fieldNameSize: 100,
  },
});

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) {
      if (Object.keys(req.body || {}).length > 0) {
        if (!req.file) {
          return res.status(400).json({
            error: {
              code: 'INVALID_UPLOAD',
              message: 'Não foi possível receber o arquivo enviado.',
            },
          });
        }

        return fs.unlink(req.file.path, (cleanupError) => {
          if (cleanupError) {
            return next(cleanupError);
          }

          return res.status(400).json({
            error: {
              code: 'INVALID_UPLOAD',
              message: 'Não foi possível receber o arquivo enviado.',
            },
          });
        });
      }

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

router.post('/upload', uploadRateLimiter, handleUpload, documentsController.uploadDocument);
router.get('/documents', documentsController.listDocuments);
router.get('/documents/:id/download', documentsController.downloadDocument);

module.exports = router;