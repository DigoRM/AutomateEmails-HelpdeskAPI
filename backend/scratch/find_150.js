const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.json');
if (!fs.existsSync(dbPath)) {
    console.error("database.json not found");
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let pendingCount = 0;
let pending150Count = 0;
const sampleMatches = [];

const fields = ['Comentário', 'comment', 'comentario_interno'];

if (db.queue) {
    db.queue.forEach((item, index) => {
        if (item.status === 'pending') {
            pendingCount++;
            let has150 = false;
            fields.forEach(field => {
                if (item[field] && typeof item[field] === 'string' && item[field].includes('150%')) {
                    has150 = true;
                    sampleMatches.push({
                        index,
                        field,
                        value: item[field]
                    });
                }
            });
            if (has150) {
                pending150Count++;
            }
        }
    });
}

console.log(`Total pending items: ${pendingCount}`);
console.log(`Pending items containing "150%": ${pending150Count}`);
console.log(`\nSamples:`);
sampleMatches.forEach((m, idx) => {
    console.log(`[${idx + 1}] Index ${m.index} (Field: "${m.field}")`);
    console.log(`    Content: "${m.value}"`);
});
