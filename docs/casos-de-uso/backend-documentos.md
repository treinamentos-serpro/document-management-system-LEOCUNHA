# Casos de uso - Backend do DMS

Este documento descreve os comportamentos observáveis implementados em `backend/src`. Os casos seguem o fluxo `routes -> controllers -> services -> repositories` e não incluem funcionalidades fora do código atual.

## Atores

- **Cliente da API:** consumidor que envia requisições HTTP para consultar, enviar ou baixar documentos.
- **Processo do backend:** aplica as regras do serviço e acessa o filesystem local; não é um ator humano.
- **Monitor de disponibilidade:** cliente técnico que consulta a rota de saúde.

O backend não autentica usuários. Para operações de documentos, o dono é determinado no servidor por `DEFAULT_OWNER_ID`, com valor padrão `default`; não é enviado pelo cliente.

## UC-01 - Enviar documento

**Objetivo:** armazenar localmente um arquivo e registrar seus metadados em memória.

**Ator principal:** Cliente da API.

**Pré-condições:**
- O backend está disponível.
- A requisição usa `multipart/form-data` e envia o arquivo no campo `file`.
- O diretório local configurado para armazenamento pode ser criado e escrito.

**Fluxo principal:**
1. O cliente envia `POST /upload` com um arquivo no campo `file`.
2. A rota recebe um único arquivo com Multer `diskStorage` e limite padrão de 10 MiB, ajustável por `MAX_FILE_SIZE`.
3. O backend cria o diretório de armazenamento, se necessário, e grava o arquivo com um nome interno UUID.
4. O serviço rejeita arquivos vazios; para arquivo válido, gera um identificador e registra os metadados em memória.
5. O nome original é reduzido ao nome-base, tem caracteres de controle removidos e recebe o fallback `document` se ficar vazio. O MIME type inválido recebe `application/octet-stream`.
6. O backend responde `201 Created` com `id`, `originalName`, `size`, `mimeType`, `uploadedAt` e `owner`; `storageName` não é exposto.

**Fluxos alternativos e de erro:**
- **A1 - Campo ausente:** se nenhum arquivo for recebido, responder `400` com código `FILE_REQUIRED`.
- **A2 - Arquivo vazio:** remover o arquivo temporário gravado e responder `400` com código `EMPTY_FILE`.
- **A3 - Arquivo acima do limite:** interromper o recebimento e responder `413` com código `FILE_TOO_LARGE`.
- **A4 - Upload inválido:** erros de Multer diferentes de limite de tamanho, como campo inesperado ou arquivo adicional, respondem `400` com código `INVALID_UPLOAD`.
- **A5 - Falha ao receber ou armazenar:** encaminhar o erro ao tratamento global e responder `500` com código `STORAGE_ERROR` e mensagem genérica.
- **A6 - Falha ao registrar metadados:** tentar remover o arquivo local criado e propagar a falha para o tratamento global.

**Pós-condições:**
- **Sucesso:** o arquivo fica no filesystem local e os metadados ficam em memória.
- **Falha de validação:** nenhum documento fica registrado; para arquivo vazio, o arquivo temporário é removido.

## UC-02 - Listar documentos

**Objetivo:** consultar os metadados dos documentos associados ao dono configurado no processo atual.

**Ator principal:** Cliente da API.

**Pré-condições:** o backend está disponível.

**Fluxo principal:**
1. O cliente envia `GET /documents`.
2. O serviço consulta os metadados em memória para o `DEFAULT_OWNER_ID` atual (ou `default`).
3. O repositório ordena os documentos do mais recente para o mais antigo e omite `storageName`.
4. O backend responde `200 OK` com `{ "documents": [...] }`.

**Fluxos alternativos e de erro:**
- **A1 - Nenhum documento:** responder `200 OK` com `{ "documents": [] }`.
- **A2 - Falha interna:** responder `500` com código `STORAGE_ERROR` e mensagem genérica.

**Pós-condições:** nenhum dado é alterado.

## UC-03 - Baixar documento

**Objetivo:** transferir o conteúdo de um documento disponível para o dono configurado.

**Ator principal:** Cliente da API.

**Pré-condições:** o backend está disponível e o identificador do documento está na URL.

**Fluxo principal:**
1. O cliente envia `GET /documents/:id/download`.
2. O serviço procura o identificador entre os documentos do `DEFAULT_OWNER_ID` atual (ou `default`).
3. O controller envia o arquivo local como anexo, usando o nome original sanitizado e o MIME type registrado.
4. O backend responde com o conteúdo binário e `Content-Disposition: attachment`.

**Fluxos alternativos e de erro:**
- **A1 - Documento desconhecido ou de outro dono:** responder `404` com código `DOCUMENT_NOT_FOUND`.
- **A2 - Metadados existem, mas o arquivo não está no filesystem:** responder `404` com código `DOCUMENT_NOT_FOUND`.
- **A3 - Outra falha de leitura:** responder `500` com código `STORAGE_ERROR` e mensagem genérica.

**Pós-condições:** o arquivo não é alterado nem removido pelo download.

## UC-04 - Verificar disponibilidade

**Objetivo:** verificar se o processo Express responde a requisições.

**Ator principal:** Monitor de disponibilidade.

**Pré-condições:** o processo do backend está iniciado.

**Fluxo principal:**
1. O monitor envia `GET /health`.
2. O backend responde `200 OK` com `{ "status": "ok" }`.

**Fluxos alternativos e de erro:** não há fluxo alternativo implementado nesta rota; falhas de conexão são observadas pelo próprio cliente.

**Pós-condições:** nenhuma.

## Regras de negócio identificadas

- O envio aceita somente um arquivo no campo `file` por requisição.
- O limite padrão do arquivo é 10 MiB; `MAX_FILE_SIZE` permite configurá-lo.
- Arquivos são gravados no filesystem local com `multer.diskStorage`; o nome interno é gerado pelo backend e não deriva do nome informado pelo cliente.
- `STORAGE_DIR` configura o diretório local; sem configuração, usa-se `backend/storage`.
- Os metadados (`id`, `originalName`, `size`, `mimeType`, `uploadedAt`, `owner` e nome interno) são mantidos em memória. Após reiniciar o processo, os metadados não são recuperados, mesmo que os arquivos permaneçam no disco.
- O dono é definido pelo servidor via `DEFAULT_OWNER_ID`, com fallback para `default`. Não há autenticação nem identificação de dono por requisição.
- Listagem e download filtram pelo dono atual; identificador inexistente ou não associado a esse dono resulta em `404`.
- A API não oferece validação por extensão ou restrição de tipo de arquivo. Um MIME type inválido é substituído por `application/octet-stream`.
- Respostas de erro seguem `{ "error": { "code": "...", "message": "..." } }`; erros internos não expõem detalhes do filesystem.
- O código atual não implementa exclusão, versionamento, persistência dos metadados entre reinícios ou gestão de usuários.
