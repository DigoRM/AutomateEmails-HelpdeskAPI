const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.json');
if (!fs.existsSync(dbPath)) {
    console.error("database.json not found at: " + dbPath);
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let pendingCount = 0;
let ndbPendingCount = 0;
let modifiedCommentsCount = 0;

const fields = ['Comentário', 'comment', 'comentario_interno'];
const regex = /(?:€\s*\d+|\d+\s*(?:eur|EUR|€)?)\s*(ndb[a]?)/gi;

const changesSample = [];

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
                            wasModified = true;
                            if (changesSample.length < 15) {
                                changesSample.push({
                                    index,
                                    field,
                                    original,
                                    replaced
                                });
                            }
                        }
                    }
                }
            });
            
            if (hasNdb) ndbPendingCount++;
            if (wasModified) modifiedCommentsCount++;
        }
    });
}

console.log(`=== SIMULATION RESULTS ===`);
console.log(`Total queue items: ${db.queue ? db.queue.length : 0}`);
console.log(`Total pending items: ${pendingCount}`);
console.log(`Pending items containing NDB in comments: ${ndbPendingCount}`);
console.log(`Pending items that will be modified: ${modifiedCommentsCount}`);

console.log(`\n=== SAMPLE CHANGES (First 15 items) ===`);
changesSample.forEach((sample, i) => {
    console.log(`Sample #${i + 1} (Index: ${sample.index}, Field: "${sample.field}")`);
    console.log(`  BEFORE: "${sample.original}"`);
    console.log(`  AFTER : "${sample.replaced}"\n`);
});
