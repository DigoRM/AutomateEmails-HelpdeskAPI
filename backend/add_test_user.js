const fs = require('fs');
const { randomUUID } = require('crypto');

try {
  const dbPath = './database.json';
  const dbData = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(dbData);

  const testItem = {
    "ID": "TEST-12345",
    "Email": "Your Personal Account Managerrmarcolino@gmail.com",
    "Jogador": "Your Personal Account Manager Teste",
    "Assunto": "Teste de Integração VIP",
    "Corpo": "Olá Your Personal Account Manager, este é um email de teste para verificar se as respostas aos tickets do HelpDesk estão funcionando corretamente. Por favor, responda a este email para validarmos o fluxo.",
    "Comentário": "Teste de disparo - verificar se email chega e se reabre ao responder.",
    "uuid": randomUUID(),
    "category": "VIP",
    "createdAt": new Date().toISOString(),
    "status": "pending",
    "is_ready": true
  };

  // Prepend to the queue so it's picked up first
  db.queue.unshift(testItem);

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log('Teste adicionado à fila com sucesso!');
} catch (error) {
  console.error('Erro ao adicionar teste:', error);
}

