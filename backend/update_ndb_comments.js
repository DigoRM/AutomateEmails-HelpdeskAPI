const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');
if (!fs.existsSync(dbPath)) {
    console.error("database.json not found at: " + dbPath);
    process.exit(1);
}

// Backup first! It's always best practice.
const backupPath = path.join(__dirname, `database.backup_${Date.now()}.json`);
try {
    fs.copyFileSync(dbPath, backupPath);
    console.log(`Created backup at: ${backupPath}`);
} catch (err) {
    console.error("Failed to create backup of database.json, aborting update.", err);
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let pendingCount = 0;
let ndbPendingCount = 0;
let modifiedCommentsCount = 0;

const fields = ['Comentário', 'comment', 'comentario_interno'];
const regex = /(?:€\s*\d+|\d+\s*(?:eur|EUR|€)?)\s*(ndb[a]?)/gi;

if (db.queue) {
    db.queue.forEach((item, index) => {
        if (item.status === 'pending') {
            pendingCount++;
            let hasNdb = false;
            let wasModified = false;
            
            fields.forEach(field => {
                if (item[field] && typeof item[field] === 'string') {
                    if (item[field].toUpperCase().includes('NDB')) {
                        hasNdb = true;
                        const original = item[field];
                        const replaced = original.replace(regex, '$1');
                        
                        if (replaced !== original) {
                            item[field] = replaced;
                            wasModified = true;
                        }
                    }
                }
            });
            
            if (hasNdb) ndbPendingCount++;
            if (wasModified) modifiedCommentsCount++;
        }
    });
}

try {
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    console.log(`Successfully updated database.json!`);
    console.log(`Summary:`);
    console.log(`  - Total pending contacts: ${pendingCount}`);
    console.log(`  - Pending contacts with NDB: ${ndbPendingCount}`);
    console.log(`  - Successfully updated contacts: ${modifiedCommentsCount}`);
} catch (err) {
    console.error("Failed to write updated database.json:", err);
}
