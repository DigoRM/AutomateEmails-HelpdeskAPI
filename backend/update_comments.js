const fs = require('fs');

try {
  const dbPath = './database.json';
  const dbData = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(dbData);
  let updated = 0;

  db.queue.forEach(item => {
    // We only update if status is not completed
    if (item.status !== 'completed') {
      const fields = ['Comentário', 'comment', 'comentario_interno'];
      
      for (const field of fields) {
        if (item[field] && typeof item[field] === 'string' && item[field].includes('d4')) {
          if (!item[field].includes('d4 tried to call no answer')) {
            item[field] = item[field].replace('d4', 'd4 tried to call no answer');
            updated++;
          }
          break; // Stop after updating one field since they usually represent the same comment
        }
      }
    }
  });

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Successfully updated ${updated} pending records in database.json`);
} catch (error) {
  console.error('Error updating comments:', error);
}
