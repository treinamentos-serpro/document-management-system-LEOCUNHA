const API_PREFIX = '/api';

async function sendRequest(url, options) {
  try {
    return await fetch(url, options);
  } catch {
    throw new Error('Não foi possível conectar ao servidor.');
  }
}

async function readJsonResponse(response) {
  if (!response.ok) {
    let errorMessage = 'Não foi possível concluir a solicitação.';
    try {
      const payload = await response.json();
      errorMessage = payload.error?.message || errorMessage;
    } catch {
      // Mantém a mensagem padrão quando a resposta não contém JSON válido.
    }
    throw new Error(errorMessage);
  }

  return response.json();
}

export async function listDocuments() {
  const response = await sendRequest(`${API_PREFIX}/documents`);
  const payload = await readJsonResponse(response);
  return payload.documents;
}

export async function uploadDocument(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await sendRequest(`${API_PREFIX}/upload`, {
    method: 'POST',
    body: formData,
  });

  return readJsonResponse(response);
}

export async function downloadDocument(id, filename) {
  const response = await sendRequest(
    `${API_PREFIX}/documents/${encodeURIComponent(id)}/download`,
  );
  if (!response.ok) {
    await readJsonResponse(response);
  }

  const fileBlob = await response.blob();
  const objectUrl = URL.createObjectURL(fileBlob);
  const downloadLink = document.createElement('a');
  downloadLink.href = objectUrl;
  downloadLink.download = filename;
  downloadLink.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}