const axios = require('axios');
const fs = require('fs');
const path = require('path');

// Busca o token das suas configurações reais
const configPath = path.join(__dirname, 'config.json');
if (!fs.existsSync(configPath)) {
  console.error("❌ Arquivo config.json não encontrado!");
  process.exit(1);
}

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const ticketId = 'ea7330b8-1ecd-4a63-9687-9e680a9bead5';

async function checkFields() {
  console.log(`--- Verificando campos do Ticket: ${ticketId} ---`);
  try {
    const res = await axios.get(`https://api.helpdesk.com/v1/tickets/${ticketId}`, {
      headers: {
        'Authorization': `Basic ${config.apiToken}`,
        'Accept': 'application/json'
      }
    });

    console.log("RESPOSTA COMPLETA DA API:");
    console.log(JSON.stringify(res.data, null, 2));
    
    console.log("\n--- BUSCA AUTOMÁTICA ---");
    const foundField = Object.keys(res.data).find(key => res.data[key] === '8AKHMF');
    if (foundField) {
      console.log(`✅ SUCESSO! O campo correto é: "${foundField}"`);
    } else {
      console.log("❌ O valor '8AKHMF' não foi encontrado diretamente na raiz do objeto.");
      console.log("Verifique manualmente se ele está dentro de algum campo como 'message', 'requester' ou 'custom_fields'.");
    }

  } catch (error) {
    console.error("Erro ao acessar a API:", error.message);
    if (error.response) {
      console.log("Status:", error.response.status);
      console.log("Dados do Erro:", error.response.data);
    }
  }
}

checkFields();
