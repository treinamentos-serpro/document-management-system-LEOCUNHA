---
description: Gera casos de uso para um módulo ou funcionalidade do sistema.
name: gerar-casos-de-uso
argument-hint: caminho do modulo (ex. backend/src/services/documents.service.js)
agent: agent
---

# Gerar casos de uso

Gere casos de uso para o módulo `${input:modulo:caminho do modulo}` com base na análise do código e das regras de negócio identificadas.

Requisitos:

- Identifique os atores envolvidos e os objetivos de cada caso de uso.
- Descreva as pré-condições, o fluxo principal, os fluxos alternativos e as pós-condições.
- Cubra os cenários de sucesso, validação e erro.
- Documente as regras de negócio identificadas.
- Mantenha os casos de uso claros, objetivos e organizados.
- Não invente funcionalidades ou regras não identificadas no código.
- Coloque os casos de uso em `docs/casos-de-uso`.
- Não altere o código-fonte do projeto.