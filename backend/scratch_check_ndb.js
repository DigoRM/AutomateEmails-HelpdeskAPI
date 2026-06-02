const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const pending = db.queue.filter(item => item.status === 'pending');

console.log(`Total pending items: ${pending.length}`);

const uniqueComments = new Set();
pending.forEach(item => {
  const comment = item.Comentário || item.comment || '';
  uniqueComments.add(comment);
});

console.log('Unique comments in pending:');
uniqueComments.forEach(c => console.log(' - ', JSON.stringify(c)));
