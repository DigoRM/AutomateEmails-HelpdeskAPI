# Aniksi VIP Bridge - Plano de Implementação

Este documento descreve a arquitetura da solução baseada na sua aprovação e no envio dos documentos da API do HelpDesk e do Excel base gerado pelo Claude.

## Visão Geral do Problema Resolvido
O Streamlit possui limitações com execuções muito longas (timeouts, re-renders ao interagir com a tela). Para resolver isso e criar um app que rode de forma estável por **8 horas contínuas em background** no seu computador, vamos adotar uma arquitetura de cliente-servidor leve e local.

## Stack Tecnológica
- **Frontend:** React (usando Vite para inicialização rápida) com **CSS Vanilla** (Design Premium, Dark Mode "Vibe Coding").
- **Backend:** Node.js com Express para lidar com os envios e agendamento da fila de e-mails em segundo plano (evita 100% o problema de travamentos no navegador).
- **Armazenamento de Estado:** Arquivo JSON local (`database.json`) ou em memória contínua, permitindo saber onde parou caso você reinicie o app.

## Proposed Changes

### 1. Backend (Node.js + Express)
Criaremos um servidor local (rodará na porta 3001) com as seguintes rotas:
- **`POST /api/config`**: Salva seu Token da API (no armazenamento local seguro) e o tempo de intervalo.
- **`POST /api/upload`**: Recebe o Excel gerado pelo Claude, valida as colunas e injeta numa "Fila de Disparo" local.
- **`POST /api/start`**: Inicia o disparador. Ele vai pegar linha a linha e fazer o `POST https://api.helpdesk.com/v1/tickets`.
- **`POST /api/pause`**: Pausa a execução.
- **`GET /api/status`**: O frontend faz chamadas aqui a cada X segundos para popular o seu dashboard (Progress Bar, tempo estimado, quem está sendo enviado no momento).

**Mapeamento da API HelpDesk (Baseado nos seus docs):**
```javascript
const payload = {
  subject: row['subject'],
  requester: {
    email: row['to_email'],
    name: row['username']
  },
  message: {
    text: row['body'] // text ou HTML dependendo do formato suportado
  },
  // tags - a documentação que você colou aponta para "tagIDs" (arrays de UUIDs). 
  // Na versão antiga do python estava apenas "tags". Vou criar um mapeamento.
}
```

---

### 2. Frontend (React + CSS Vanilla Premium)
Criaremos a Interface gráfica (acessível no Chrome via `localhost:5173`) com as seguintes seções:
- **1. Painel de Configurações:** Inserir a API Key e tempo de "Human Delay".
- **2. Uploader de Planilha:** Instância para colocar a planilha `.xlsx`. Ele extrairá as métricas.
- **3. Dashboard Executório:** 
  - Métricas (Total, Restante, Tempo, etc).
  - Um bloco dinâmico que sempre atualizará sozinho (via polling), mostrando o *Nome* e o ID do contato atual sendo enviado, o *Log gerado* e o botão com **Link Dinâmico do Casino (LuckyGem) que já copia o comentário automaticamente quando clicado.**

## User Review Required

> [!IMPORTANT]
> **Tags na API HelpDesk**
> No documento py, você usava `"tags": [row['tag_param']]`. A doc Oficial diz `"tagIDs": Array of strings <uuid>`. Precisamos mapear se a API aceita uma string livre (ex: "VIP_Bonus_Sunday") ou se você tem que cadastrar as tags antes e pegar o UUID.
> *Ação:* Vou manter na aplicação a capacidade de enviar como texto simples e nós testamos.

> [!WARNING]
> **Links e Planilha Excel**
> Na sua planilha "sunday_promo_emails.xlsx", existe uma coluna chamada `status` (pending). O sistema vai ignorar as de status já "completed" caso você rode o mesmo arquivo, criando um método seguro de "resume". Confirma?

## Open Questions
Você aprova essa abordagem Web em "React + Node.js em background", ao invés do Python Streamlit? 
Se confirmar, inicio a criação dos arquivos da aplicação!
