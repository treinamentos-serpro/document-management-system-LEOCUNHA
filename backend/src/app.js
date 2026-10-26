// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const documentsRoutes = require('./routes/documents.routes');

const app = express();
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '127.0.0.1';

app.use(express.json());

// Endpoint de verificação de saúde. As demais rotas (/upload, /documents,
// /documents/:id/download) serão implementadas durante o Passo 2.
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/', documentsRoutes);

app.use((error, req, res, next) => {
  if (res.headersSent) {
    return next(error);
  }

  const status = Number.isInteger(error.status) ? error.status : 500;
  const isPublicStorageLimit = error.code === 'STORAGE_QUOTA_EXCEEDED';
  const hideInternalDetails = status >= 500 && !isPublicStorageLimit;

  res.status(status).json({
    error: {
      code: hideInternalDetails ? 'STORAGE_ERROR' : error.code || 'REQUEST_ERROR',
      message: hideInternalDetails ? 'Não foi possível processar a solicitação.' : error.message,
    },
  });
});

if (require.main === module) {
  app.listen(PORT, HOST, () => {
    console.log(`DMS backend ouvindo em ${HOST}:${PORT}`);
  });
}

module.exports = app;
