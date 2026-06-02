const axios = require('axios');

const token = 'MGQ4NjYxZmItNzczMi00MDM1LWE2MDgtMTdkOTA0ZjFlNzI5OnVzLXNvdXRoMTo0VE1nMjlJNHdKOXh4TjZQVHh1R3ZuOFlpSVU=';

async function getTags() {
  console.log('--- BUSCANDO TODAS AS TAGS DO ODIN FORTUNE ---\n');
  
  try {
    const res = await axios.get('https://api.helpdesk.com/v1/tags', {
      headers: {
        'Authorization': `Basic ${token}`,
        'Accept': 'application/json'
      }
    });
    
    const tags = res.data;
    
    if (Array.isArray(tags) && tags.length > 0) {
      tags.forEach(tag => {
        console.log(`🏷️  Tag: ${tag.name}`);
        console.log(`    ID (UUID): ${tag.ID}\n`);
      });
      console.log('Por favor, me diga qual dessas Tags devemos usar para os disparos do Odin Fortune.');
    } else {
      console.log('⚠️ Nenhuma Tag encontrada ou formato de resposta inesperado.');
      console.log('Resposta da API:', JSON.stringify(res.data, null, 2));
    }
  } catch (err) {
    console.error('💥 Erro ao buscar tags:', err.message);
    if (err.response) {
      console.error('Detalhes do erro:', JSON.stringify(err.response.data, null, 2));
    }
  }
  
  console.log('\n-----------------------------------------------');
}

getTags();
