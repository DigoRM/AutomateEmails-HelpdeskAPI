# ✉️ AutomateEmails — VIP Outreach & CRM Ticket Automation Suite

[Português](#português) | [English](#english)

---

## English

A highly sophisticated full-stack Node.js and React application designed to manage, review, and automate bulk email outreach or Helpdesk ticketing sequences. 

Built specifically for VIP Retention and Customer Relationship Management (CRM) teams, it provides a safe, auditable, and automated bridge to send personalized messages to users via Helpdesk REST APIs while ensuring rate-limit safety using an asynchronous scheduler with visual queue controls.

### 🌟 Key Features

*   **Asynchronous Delay Queue Scheduler**: Dispatches messages sequentially with customizable delay intervals (e.g. 5 minutes) to protect against API rate-limiting or firewall triggers, featuring real-time remaining-time estimation.
*   **Proactive Helpdesk Ticket Creation**: Dynamically connects with REST APIs to create tickets on the fly (solved status), assign team ownership (VIP vs Potential VIP), and inject tags.
*   **Auditable Private Comment Linking**: Automatically patches tickets with a private internal note containing direct CRM profile links for agents, eliminating manual customer tracking.
*   **Batch & Individual CRM Controls**:
    *   **Manual Contact Creator**: Add individual outreach items instantly by pasting raw support logs (featuring a smart regex-based parser that auto-detects User ID, email and brand).
    *   **CSV/XLSX Bulk Upload**: Imports hundreds of players, automatically checking for duplicates in queue.
    *   **Visual CRM Editor**: Review, edit (Subject, Body, internal Comment), and approve (`is_ready`) tickets before sending.
    *   **Sort & Reorder Queue**: Real-time queue reordering.
*   **Sound & Toast Notifications**:direct audio ping warnings via browser `AudioContext` and toasts when tasks or batches complete.

---

### 🛠️ Technology Stack

*   **Frontend**: React 19, Vite, Tailwind CSS, Lucide Icons, Browser AudioContext API
*   **Backend**: Node.js, Express, Axios (API requests), Multer, XLSX / CSV Parser, Local JSON DB Storage

---

### 🚀 Getting Started

#### Prerequisites
*   Node.js (v18+)
*   npm

#### Installation & Running

1. **Clone and navigate to the repository**:
   ```bash
   cd AutomateEmails
   ```

2. **Configure environment credentials (`backend/config.json`)**:
   Configure API tokens, team IDs, and base URLs for each of your active brands:
   ```json
   {
     "brands": {
       "YourBrand": {
         "apiToken": "YOUR_HELPDESK_BASE64_TOKEN",
         "teamVIP": "VIP_TEAM_UUID",
         "teamPotential": "POTENTIAL_TEAM_UUID",
         "tagID": "TAG_UUID",
         "baseUrl": "https://yourbrand.crm.com"
       }
     },
     "interval": 300
   }
   ```

3. **Run the Backend**:
   ```bash
   cd backend
   npm install
   node server.js # Runs on http://localhost:3001
   ```

4. **Run the Frontend**:
   ```bash
   cd ../frontend
   npm install
   npm run dev # Runs on http://localhost:5173
   ```

---

## Português

Uma aplicação full-stack altamente sofisticada em Node.js e React projetada para gerenciar, revisar e automatizar disparos de e-mails em lote ou sequências de tickets em Helpdesks.

Desenvolvida especificamente para equipes de CRM e retenção VIP, ela oferece uma ponte segura, auditável e automatizada para enviar mensagens altamente personalizadas para os usuários através de APIs REST de Helpdesk, protegendo contra bloqueios de taxa de requisições (rate-limits) com um agendador assíncrono e controle visual de fila.

### 🌟 Funcionalidades Principais

*   **Agendador de Fila Assíncrono com Delay**: Dispara mensagens sequencialmente com intervalos configuráveis (ex: 5 minutos), evitando bloqueios de rate-limit da API e calculando o tempo restante estimado em tempo real.
*   **Criação Proativa de Tickets**: Conecta-se diretamente com a API do Helpdesk para criar novos tickets (já como Solucionados), atribuindo times corretos (VIP vs VIP Potencial) e tags dinâmicas.
*   **Anexação de Notas Privadas Auditáveis**: Insere automaticamente um comentário privado interno no ticket contendo o link direto do perfil de CRM do cliente, economizando tempo dos agentes.
*   **Controles de CRM Individuais e em Lote**:
    *   *Importador Inteligente Manual*: Cole registros brutos de suporte e o sistema identificará automaticamente ID, e-mail e marca usando expressões regulares inteligentes.
    *   *Upload em Lote (CSV/XLSX)*: Importa planilhas inteiras, prevenindo duplicados na fila de processamento.
    *   *Editor Visual de CRM*: Visualize, edite campos (Assunto, Corpo, Comentário) e aprove (`is_ready`) contatos individualmente antes do envio.
    *   *Reordenação de Fila*: Altere a ordem de prioridade de disparos na tabela de forma transparente.
*   **Alertas Sonoros e Visuais**: Notificações visuais (Toasts) e sonoras sintetizadas em tempo real com `AudioContext` para avisar quando lotes ou envios forem concluídos.
