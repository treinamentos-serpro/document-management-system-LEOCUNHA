# Especificação - Document Management System

**Status:** MVP

## 1. Objetivo

Permitir que um usuário envie, liste e baixe documentos armazenados no filesystem local da aplicação.

## 2. Escopo

### Dentro do escopo
- Upload de documentos e metadados mantidos em memória.
- Listagem e download dos documentos associados ao dono configurado no servidor.
- Limite de tamanho por arquivo, limite de armazenamento e limite de frequência de uploads.
- Interface web para upload, listagem e download.

### Fora do escopo
- Armazenamento externo, nuvem ou banco de dados.
- Autenticação, cadastro de usuários e autorização multiusuário.
- Versionamento, edição, exclusão ou busca avançada.
- Validação de conteúdo por extensão ou tipo de arquivo.

## 3. Premissas

- O dono padrão é configurado por `DEFAULT_OWNER_ID`, com fallback para `default`; o cliente não escolhe o dono.
- O backend escuta em `127.0.0.1` por padrão. Exposição remota requer configuração explícita e uma camada de autenticação confiável na aplicação ou na infraestrutura.
- Os endpoints do backend são `/upload`, `/documents` e `/documents/:id/download`; no desenvolvimento, o Vite encaminha `/api` ao backend.
- A base de API do frontend é `/api` por padrão e pode ser substituída por `VITE_API_BASE_URL` no build.
- Os arquivos são armazenados localmente em `backend/storage`, sem provedores externos.
- O limite padrão por arquivo é 10 MiB, o limite padrão total do diretório é 1 GiB e o limite padrão é de 30 requisições de upload por minuto por endereço IP. Os três limites são configuráveis.
- Os metadados são voláteis e não são recuperados após reiniciar o processo.

## 4. Requisitos funcionais

| ID | Requisito |
|---|---|
| RF-01 | Aceitar um único arquivo no campo multipart `file`. |
| RF-02 | Rejeitar arquivo ausente, vazio, excedente ao limite ou requisição multipart inválida. |
| RF-03 | Gerar identificador e nome interno UUID no servidor; o nome original não define o caminho físico. |
| RF-04 | Registrar metadados em memória e retornar o documento criado sem expor o nome interno. |
| RF-05 | Listar metadados do dono configurado, do mais recente ao mais antigo. |
| RF-06 | Baixar documento pelo identificador com `Content-Disposition: attachment`. |
| RF-07 | Retornar `404` para identificador inexistente ou não associado ao dono configurado. |
| RF-08 | Retornar erros em JSON consistente sem revelar caminhos locais ou detalhes internos. |
| RF-09 | Oferecer no frontend upload, listagem, download e estados de carregamento e erro. |

## 5. Requisitos não funcionais

| ID | Requisito |
|---|---|
| RNF-01 | Usar Multer com `diskStorage`; arquivos devem permanecer no filesystem local. |
| RNF-02 | Manter metadados em memória nesta versão, sem garantia de persistência após reinício. |
| RNF-03 | Configurar `HOST`, `PORT`, `STORAGE_DIR`, `MAX_FILE_SIZE`, `MAX_STORAGE_BYTES`, `MAX_UPLOADS_PER_MINUTE` e `DEFAULT_OWNER_ID` por ambiente. |
| RNF-04 | Validar o UUID interno e garantir que caminhos de download permaneçam dentro do diretório de armazenamento. |
| RNF-05 | Limitar o número de arquivos/partes multipart, upload por IP e bytes totais armazenados. |
| RNF-06 | O backend deve escutar em loopback por padrão; nenhuma autenticação está implementada no MVP. |
| RNF-07 | Manter o fluxo `routes -> controllers -> services -> repositories`. |

## 6. Modelo de dados

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | string | UUID público do documento. |
| `originalName` | string | Nome original sanitizado para exibição/download. |
| `storageName` | string | UUID interno usado no filesystem; nunca exposto pela API. |
| `size` | number | Tamanho em bytes. |
| `mimeType` | string | MIME type recebido ou `application/octet-stream` como fallback. |
| `uploadedAt` | string | Data/hora em ISO 8601. |
| `owner` | string | `DEFAULT_OWNER_ID` ou `default`. |

## 7. Contratos de API

### `POST /upload`
- Entrada: `multipart/form-data` com o campo `file`.
- Sucesso: `201 Created` com `id`, `originalName`, `size`, `mimeType`, `uploadedAt` e `owner`.
- Erros: `400` para arquivo ausente/vazio ou multipart inválido; `413` para arquivo acima do limite; `429` para limite de frequência; `507` para quota de armazenamento; `500` para falha interna.
- Se a gravação dos metadados falhar, tentar remover o arquivo recém-criado.

### `GET /documents`
- Sucesso: `200 OK`, `{ "documents": [...] }`; lista vazia retorna array vazio.
- Contém apenas metadados públicos do dono configurado.

### `GET /documents/:id/download`
- Sucesso: `200 OK`, conteúdo binário como anexo.
- Erro: `404 Not Found` para documento não encontrado, inacessível ao dono configurado ou sem arquivo local; `500` para outra falha de leitura.

### Formato de erro

```json
{
  "error": {
    "code": "DOCUMENT_NOT_FOUND",
    "message": "Documento não encontrado."
  }
}
```

## 8. Decisões arquiteturais e regras

- `routes` definem endpoints; `controllers` tratam HTTP; `services` concentram regras de negócio; `repositories` acessam filesystem e metadados.
- O limite padrão é 10 MiB por arquivo (`MAX_FILE_SIZE`), 1 GiB total (`MAX_STORAGE_BYTES`) e 30 uploads por minuto por IP (`MAX_UPLOADS_PER_MINUTE`).
- `STORAGE_DIR` configura o diretório local; por padrão, usa-se `backend/storage`.
- `HOST` e `PORT` configuram a interface e porta do servidor; `HOST` usa `127.0.0.1` por padrão.
- `VITE_API_BASE_URL` configura a base de API no build do frontend, com `/api` como padrão.
- Nomes internos UUID e validação de caminho protegem a resolução de arquivos; nomes originais não são usados como caminho físico.
- O MVP não autentica usuários. Antes de expor o backend fora de loopback, deve-se definir identidade e autorização ou adicionar uma camada autenticada confiável.
- Reiniciar o processo apaga os metadados em memória, enquanto os arquivos podem permanecer no disco; a reconciliação/persistência não faz parte do MVP.

## 9. Plano de execução

1. Validar configuração e contratos do MVP, inclusive limites e condição de acesso local.
2. Implementar upload local, validações multipart, quotas e tratamento de erros.
3. Implementar listagem ordenada e download protegido por dono e UUID interno.
4. Implementar a interface e integração via `fetch`/`VITE_API_BASE_URL`.
5. Cobrir contratos, limites, falhas de filesystem e comportamento do frontend com testes.
