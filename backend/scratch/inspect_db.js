const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.json');
if (!fs.existsSync(dbPath)) {
    console.error("database.json not found");
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
console.log("lastProcessedItem:", JSON.stringify(db.lastProcessedItem, null, 2));
