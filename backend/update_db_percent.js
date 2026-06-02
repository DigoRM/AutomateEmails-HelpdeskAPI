const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) {
    console.error("database.json not found at: " + dbPath);
    process.exit(1);
}

// Backup first!
const backupPath = path.join(__dirname, `database.backup_percent_${Date.now()}.json`);
try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Created backup at: ${backupPath}`);
} catch (err) {
    console.error("Failed to create backup, aborting update.", err);
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let pendingCount = 0;
let modifiedCount = 0;

const fields = ['Comentário', 'comment', 'comentario_interno'];

if (db.queue) {
    db.queue.forEach((item, index) => {
        if (item.status === 'pending') {
            pendingCount++;
            let wasModified = false;
            
            fields.forEach(field => {
                if (item[field] && typeof item[field] === 'string') {
                    if (item[field].includes('150%')) {
                        const original = item[field];
                        const replaced = original.replace(/150%/g, '100%');
                        
                        if (replaced !== original) {
                            item[field] = replaced;
                            wasModified = true;
                        }
                    }
                }
            });
            
            if (wasModified) {
                modifiedCount++;
            }
        }
    });
}

try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    console.log(`Successfully updated DB percentage from 150% to 100%!`);
    console.log(`Summary:`);
    console.log(`  - Total pending contacts processed: ${pendingCount}`);
    console.log(`  - Successfully updated contacts: ${modifiedCount}`);
} catch (err) {
    console.error("Failed to write updated database.json:", err);
}
