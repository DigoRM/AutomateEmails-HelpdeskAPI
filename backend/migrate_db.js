const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');
const CONFIG_PATH = path.join(__dirname, 'config.json');

// 1. Migrar Config
if (fs.existsSync(CONFIG_PATH)) {
  const config = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  
  // Se ainda não estiver no formato novo
  if (!config.brands) {
    const newConfig = {
      brands: {
        RoyalSpins: {
          apiToken: config.apiToken || '',
          teamVIP: 'b7747308-0eea-4e92-9df8-b5b4493c29bd',
          teamPotential: 'c3c9f0e4-76ad-471c-b33e-e0c324457ff7',
          tagID: 'f5f08da2-3d1e-422e-92d7-87513f72507a',
          baseUrl: 'https://a.RoyalSpins.com'
        },
        MegaJackpot: {
          apiToken: 'MGQ4NjYxZmItNzczMi00MDM1LWE2MDgtMTdkOTA0ZjFlNzI5OnVzLXNvdXRoMTo0VE1nMjlJNHdKOXh4TjZQVHh1R3ZuOFlpSVU=',
          teamVIP: 'ee11812a-b649-4946-a16e-f8a889aa68d4',
          teamPotential: '9bfcba64-ae68-436f-8c50-4d7892356fc0',
          tagID: '50298f28-747e-48fe-b842-0efae665c975',
          baseUrl: 'https://a.MegaJackpot.com'
        }
      },
      interval: config.interval || 300
    };
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(newConfig, null, 2));
    console.log('✅ config.json migrado para multi-brand.');
  }
}

// 2. Migrar Database
if (fs.existsSync(DB_PATH)) {
  const db = JSON.parse(fs.readFileSync(DB_PATH, 'utf8'));
  
  if (db.queue && Array.isArray(db.queue)) {
    let migratedCount = 0;
    db.queue.forEach(item => {
      if (!item.brand) {
        item.brand = 'RoyalSpins';
        migratedCount++;
      }
    });
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
    console.log(`✅ database.json migrado: ${migratedCount} itens marcados como RoyalSpins.`);
  }
}

