# Especificação - Document Management System

**Status:** Proposta para MVP

## 1. Objetivo

Permitir que um usuário envie, liste e baixe documentos armazenados no filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo
- Upload de documentos com metadados mantidos em memória.
- Listagem dos documentos do usuário atual.
- Download de um documento pelo identificador.
- Identificação simples do dono por configuração do servidor.

### Fora do escopo
- Armazenamento externo, nuvem ou banco de dados.
- Autenticação, cadastro de usuários e autorização multiusuário.
- Versionamento, edição, exclusão ou busca avançada.
- Restrições de formato por tipo de arquivo.

## 3. Premissas

- O MVP opera para um usuário configurado no servidor por `DEFAULT_OWNER_ID`.
- O cliente não informa nem pode substituir o dono do documento.
- Os endpoints do backend são `/upload`, `/documents` e `/documents/:id/download`; o frontend os acessa pelo prefixo `/api`, conforme o proxy do Vite.
- O limite inicial de upload é 10 MiB, configurável por ambiente.
- Os arquivos são armazenados localmente em `backend/storage`, sem provedores externos.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-01 | O sistema deve aceitar o envio de um arquivo por requisição multipart, no campo `file`. |
| RF-02 | O sistema deve rejeitar requisições sem arquivo, arquivos vazios e arquivos acima do limite configurado. |
| RF-03 | O sistema deve gerar um identificador único e um nome interno seguro, sem usar o nome original como caminho de armazenamento. |
| RF-04 | Após salvar o arquivo, o sistema deve registrar seus metadados em memória e retornar o documento criado. |
| RF-05 | O sistema deve listar os documentos pertencentes ao usuário configurado, ordenados do mais recente para o mais antigo. |
| RF-06 | O sistema deve permitir baixar um documento pelo identificador, preservando o nome original como nome sugerido para download. |
| RF-07 | O sistema deve responder com `404` quando o documento não existir ou não pertencer ao usuário atual. |
| RF-08 | O sistema deve informar erros de entrada e de processamento em formato consistente, sem expor caminhos locais ou detalhes internos. |
| RF-09 | O frontend deve oferecer envio, listagem e download, exibindo estados de carregamento, sucesso e erro. |

## 5. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | O upload deve usar `multer` com `diskStorage`; arquivos devem permanecer no filesystem local. |
| RNF-02 | Os metadados devem permanecer em memória nesta versão; não há garantia de persistência após reiniciar o processo. |
| RNF-03 | Porta, diretório local, limite de tamanho e dono padrão devem ser configuráveis por variáveis de ambiente. |
| RNF-04 | Nomes internos devem ser gerados pelo servidor; nomes recebidos não podem determinar caminhos no filesystem. |
| RNF-05 | O download deve usar `Content-Disposition: attachment` e um `Content-Type` apropriado, com fallback para `application/octet-stream`. |
| RNF-06 | A API deve usar códigos HTTP adequados e respostas JSON previsíveis para erros. |
| RNF-07 | O backend deve manter o fluxo de dependências `routes -> controllers -> services -> repositories`. |

## 6. Modelo de dados

Registro interno de documento:

| Campo | Tipo | Regra |
|---|---|---|
| `id` | string | UUID gerado pelo servidor. |
| `originalName` | string | Nome recebido, sanitizado para exibição e download. |
| `storageName` | string | Nome interno gerado pelo servidor; nunca exposto pela API. |
| `size` | number | Tamanho em bytes. |
| `mimeType` | string | Tipo informado/detectado; fallback `application/octet-stream`. |
| `uploadedAt` | string | Data/hora em ISO 8601. |
| `owner` | string | Identificador vindo de `DEFAULT_OWNER_ID`, nunca do corpo da requisição. |

O caminho físico é derivado exclusivamente do diretório local configurado e de `storageName`; não é um campo retornado ao cliente.

## 7. Contratos de API

### `POST /upload`

- Entrada: `multipart/form-data`, campo obrigatório `file`.
- Dono: definido pelo servidor a partir de `DEFAULT_OWNER_ID`.
- Sucesso: `201 Created`, JSON com `id`, `originalName`, `size`, `mimeType`, `uploadedAt` e `owner`.
- Erros: `400` para arquivo ausente ou vazio; `413` para arquivo acima do limite; `500` para falha de armazenamento.
- Se o registro dos metadados falhar depois da gravação, remover o arquivo recém-criado.

### `GET /documents`

- Entrada: sem corpo.
- Sucesso: `200 OK`, `{ "documents": [...] }`, contendo apenas metadados públicos dos documentos do dono atual.
- Lista vazia: `{ "documents": [] }`.

### `GET /documents/:id/download`

- Entrada: identificador na URL.
- Sucesso: `200 OK`, conteúdo binário com `Content-Disposition: attachment`.
- Erro: `404 Not Found` para identificador inexistente ou não pertencente ao dono atual; `500` para falha de leitura.

### Formato de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}

Os códigos devem ser estáveis e apropriados à falha, por exemplo FILE_REQUIRED, FILE_TOO_LARGE, DOCUMENT_NOT_FOUND e STORAGE_ERROR.

## 8. Decisões arquiteturais

routes: definem endpoints e encaminham requisições.
controllers: validam entrada HTTP e formatam respostas.
services: aplicam regras de negócio, como dono, limite e fluxo de upload/download.
repositories: gravam e leem arquivos locais e mantêm os metadados em memória.
O upload usa multer.diskStorage; nenhum serviço externo ou armazenamento remoto é permitido.
O frontend consome a API por fetch, usando o prefixo /api configurado no Vite.
O MVP usa um dono padrão configurado. Autenticação e múltiplos usuários exigem especificação própria antes de serem adicionados.

## 9. Plano de execução

Validar a especificação e a configuração do MVP. Aceite: limites, dono padrão, respostas e comportamento de reinício estão definidos.
Implementar o fluxo de upload e persistência local. Aceite: arquivo gravado com nome interno seguro, metadados retornados, validações e limpeza em falhas cobertas por testes.
Implementar listagem e download. Aceite: listagem ordenada e limitada ao dono; download correto; identificador ausente resulta em 404.
Construir a experiência de frontend. Aceite: envio, atualização da lista, download e estados de erro/carregamento funcionam pela API.
Validar integração e requisitos não funcionais. Aceite: testes cobrem contratos e casos de erro; configuração por ambiente funciona; nenhuma dependência de armazenamento externo foi introduzida.
