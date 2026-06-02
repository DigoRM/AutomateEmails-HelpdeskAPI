const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.json');
if (!fs.existsSync(dbPath)) {
    console.log("database.json not found");
    process.exit(1);
}

const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const uniqueComments = new Set();

if (db.queue) {
    db.queue.forEach(item => {
        const fields = ['Comentário', 'comment', 'comentario_interno'];
        fields.forEach(field => {
            if (item[field] && typeof item[field] === 'string' && item[field].toUpperCase().includes('NDB')) {
                uniqueComments.add(item[field]);
            }
        });
    });
}

const sortedComments = Array.from(uniqueComments).sort();
fs.writeFileSync(path.join(__dirname, 'all_ndb_comments.txt'), sortedComments.join('\n'), 'utf8');
console.log(`Saved ${sortedComments.length} unique NDB comments to all_ndb_comments.txt`);
