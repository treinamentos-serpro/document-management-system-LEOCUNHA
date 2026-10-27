const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const app = require('../src/app');
const documentsRepository = require('../src/repositories/documents.repository');

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('o repositório rejeita nomes internos fora do formato UUID', () => {
  assert.throws(
    () => documentsRepository.getStoredFilePath('../outside.txt'),
    /Nome interno de arquivo inválido/,
  );
});

test('a API envia, lista e baixa documentos', async (t) => {
  const previousStorageDirectory = process.env.STORAGE_DIR;
  const previousOwner = process.env.DEFAULT_OWNER_ID;
  const previousMaxStorageBytes = process.env.MAX_STORAGE_BYTES;
  const storageDirectory = await fs.mkdtemp(path.join(os.tmpdir(), 'dms-test-'));
  process.env.STORAGE_DIR = storageDirectory;

  const server = app.listen(0);
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  t.after(async () => {
    await new Promise((resolve, reject) => {
      server.close((error) => (error ? reject(error) : resolve()));
    });
    await fs.rm(storageDirectory, { recursive: true, force: true });
    if (previousStorageDirectory === undefined) {
      delete process.env.STORAGE_DIR;
    } else {
      process.env.STORAGE_DIR = previousStorageDirectory;
    }
    if (previousOwner === undefined) {
      delete process.env.DEFAULT_OWNER_ID;
    } else {
      process.env.DEFAULT_OWNER_ID = previousOwner;
    }
    if (previousMaxStorageBytes === undefined) {
      delete process.env.MAX_STORAGE_BYTES;
    } else {
      process.env.MAX_STORAGE_BYTES = previousMaxStorageBytes;
    }
  });

  await t.test('a listagem começa vazia', async () => {
    const response = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(response.status, 200);
    assert.deepStrictEqual(await response.json(), { documents: [] });
  });

  const missingFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: new FormData(),
  });
  assert.strictEqual(missingFileResponse.status, 400);
  assert.strictEqual((await missingFileResponse.json()).error.code, 'FILE_REQUIRED');

  const emptyFormData = new FormData();
  emptyFormData.append('file', new Blob([]), 'empty.txt');
  const emptyFileResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: emptyFormData,
  });
  assert.strictEqual(emptyFileResponse.status, 400);
  assert.strictEqual((await emptyFileResponse.json()).error.code, 'EMPTY_FILE');

  const invalidMultipartData = new FormData();
  invalidMultipartData.append('file', new Blob(['conteudo'], { type: 'text/plain' }), 'file.txt');
  invalidMultipartData.append('unexpected', 'field');
  const invalidMultipartResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: invalidMultipartData,
  });
  assert.strictEqual(invalidMultipartResponse.status, 400);
  assert.strictEqual((await invalidMultipartResponse.json()).error.code, 'INVALID_UPLOAD');

  process.env.MAX_STORAGE_BYTES = '16';
  const quotaFormData = new FormData();
  quotaFormData.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'quota.txt');
  const quotaResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: quotaFormData,
  });
  assert.strictEqual(quotaResponse.status, 507);
  assert.strictEqual((await quotaResponse.json()).error.code, 'STORAGE_QUOTA_EXCEEDED');
  assert.deepStrictEqual(await fs.readdir(storageDirectory), []);
  process.env.MAX_STORAGE_BYTES = '1024';

  const formData = new FormData();
  formData.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), '../relatorio.txt');
  const uploadResponse = await fetch(`${baseUrl}/upload`, {
    method: 'POST',
    body: formData,
  });

  assert.strictEqual(uploadResponse.status, 201);
  const uploadedDocument = await uploadResponse.json();
  assert.strictEqual(uploadedDocument.originalName, 'relatorio.txt');
  assert.strictEqual(uploadedDocument.size, 17);
  assert.strictEqual(uploadedDocument.owner, process.env.DEFAULT_OWNER_ID || 'default');
  assert.ok(!Object.hasOwn(uploadedDocument, 'storageName'));

  const listResponse = await fetch(`${baseUrl}/documents`);
  assert.strictEqual(listResponse.status, 200);
  assert.deepStrictEqual((await listResponse.json()).documents, [uploadedDocument]);

  process.env.DEFAULT_OWNER_ID = 'another-owner';
  const otherOwnerListResponse = await fetch(`${baseUrl}/documents`);
  assert.deepStrictEqual((await otherOwnerListResponse.json()).documents, []);
  const otherOwnerDownloadResponse = await fetch(
    `${baseUrl}/documents/${uploadedDocument.id}/download`,
  );
  assert.strictEqual(otherOwnerDownloadResponse.status, 404);
  process.env.DEFAULT_OWNER_ID = previousOwner || 'default';

  const downloadResponse = await fetch(`${baseUrl}/documents/${uploadedDocument.id}/download`);
  assert.strictEqual(downloadResponse.status, 200);
  assert.strictEqual(downloadResponse.headers.get('content-type'), 'text/plain; charset=utf-8');
  assert.match(downloadResponse.headers.get('content-disposition'), /attachment/);
  assert.strictEqual(await downloadResponse.text(), 'conteudo de teste');

  const unknownDocumentResponse = await fetch(`${baseUrl}/documents/unknown/download`);
  assert.strictEqual(unknownDocumentResponse.status, 404);
  assert.strictEqual((await unknownDocumentResponse.json()).error.code, 'DOCUMENT_NOT_FOUND');

  await t.test('upload e download preservam os bytes de um arquivo binário', async () => {
    const content = Buffer.from([0x00, 0xff, 0x80, 0x0d, 0x0a, 0x41]);
    const binaryFormData = new FormData();
    binaryFormData.append(
      'file',
      new Blob([content], { type: 'application/octet-stream' }),
      'arquivo.bin',
    );
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: binaryFormData,
    });
    assert.strictEqual(response.status, 201);
    const document = await response.json();
    assert.strictEqual(document.originalName, 'arquivo.bin');
    assert.strictEqual(document.size, content.length);
    assert.notStrictEqual(document.id, uploadedDocument.id);
    assert.ok(!Object.hasOwn(document, 'storageName'));

    const listingResponse = await fetch(`${baseUrl}/documents`);
    assert.strictEqual(listingResponse.status, 200);
    const { documents } = await listingResponse.json();
    assert.strictEqual(documents.length, 2);
    assert.deepStrictEqual(documents.find((item) => item.id === document.id), document);
    assert.deepStrictEqual(
      documents.find((item) => item.id === uploadedDocument.id),
      uploadedDocument,
    );

    const binaryDownloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`);
    assert.strictEqual(binaryDownloadResponse.status, 200);
    assert.strictEqual(
      binaryDownloadResponse.headers.get('content-type'),
      'application/octet-stream',
    );
    assert.match(
      binaryDownloadResponse.headers.get('content-disposition'),
      /attachment;.*filename="arquivo\.bin"/,
    );
    assert.deepStrictEqual(Buffer.from(await binaryDownloadResponse.arrayBuffer()), content);
  });
});
