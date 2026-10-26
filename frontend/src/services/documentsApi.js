const API_PREFIX = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/+$/, '');

async function sendRequest(url, options) {
  try {
    return await fetch(url, options);
  } catch (error) {
    if (error.name === 'AbortError') {
      throw error;
    }
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

export async function listDocuments(signal) {
  const response = await sendRequest(`${API_PREFIX}/documents`, { signal });
  const payload = await readJsonResponse(response);
  if (!Array.isArray(payload.documents)) {
    throw new Error('Resposta inválida do servidor ao listar documentos.');
  }
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

export function downloadDocument(id, filename) {
  const downloadLink = document.createElement('a');
  downloadLink.href = `${API_PREFIX}/documents/${encodeURIComponent(id)}/download`;
  downloadLink.download = filename;
  downloadLink.click();
}