const axios = require('axios');

const token = 'MGQ4NjYxZmItNzczMi00MDM1LWE2MDgtMTdkOTA0ZjFlNzI5OnVzLXNvdXRoMTo0VE1nMjlJNHdKOXh4TjZQVHh1R3ZuOFlpSVU=';

async function getTeams() {
  console.log('--- BUSCANDO TODAS AS EQUIPES (TEAMS) DO ODIN FORTUNE ---\n');
  
  try {
    const res = await axios.get('https://api.helpdesk.com/v1/teams', {
      headers: {
        'Authorization': `Basic ${token}`,
        'Accept': 'application/json'
      }
    });
    
    const teams = res.data;
    
    if (Array.isArray(teams) && teams.length > 0) {
      teams.forEach(team => {
        console.log(`📌 Nome: ${team.name}`);
        console.log(`   ID (UUID): ${team.ID}\n`);
      });
      console.log('Analise a lista acima e me diga qual ID pertence ao "VIP" e qual ao "Player Experience".');
    } else {
      console.log('⚠️ Nenhuma equipe encontrada ou formato de resposta inesperado.');
      console.log('Resposta da API:', JSON.stringify(res.data, null, 2));
    }
  } catch (err) {
    console.error('💥 Erro ao buscar equipes:', err.message);
    if (err.response) {
      console.error('Detalhes do erro:', JSON.stringify(err.response.data, null, 2));
    }
  }
  
  console.log('\n---------------------------------------------------------');
}

getTeams();
