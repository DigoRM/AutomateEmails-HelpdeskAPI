const fs = require('fs');
const path = require('path');

const dbPath = 'c:\\Users\\rodri\\OneDrive\\Ambiente de Trabalho\\AutomateEmails\\backend\\database.json';

try {
    const data = fs.readFileSync(dbPath, 'utf8');
    const db = JSON.parse(data);
    
    const originalLen = db.queue.length;
    db.queue = db.queue.filter(item => item.to_email !== 'enguerrantriquet7@gmail.com');
    
    if (db.queue.length < originalLen) {
        fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
        console.log(`Successfully removed record. New length: ${db.queue.length}`);
    } else {
        console.log("Record not found.");
    }
} catch (err) {
    console.error("Error cleaning database:", err);
}
