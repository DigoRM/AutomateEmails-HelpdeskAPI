const fs = require('fs');
const path = require('path');

try {
  const dbPath = path.join(__dirname, 'database.json');
  const dbData = fs.readFileSync(dbPath, 'utf8');
  const db = JSON.parse(dbData);
  let updatedCount = 0;

  const targetComment = 'd4 tried to call but no answer + new month promo + 75% DBA';

  db.queue.forEach(item => {
    // Check if the item is pending
    if (item.status === 'pending') {
      // The keys in the object can be "Comentário" or "comment"
      // Based on the database.json view, it seems to be "Comentário" for newer entries
      if (item.hasOwnProperty('Comentário')) {
        item['Comentário'] = targetComment;
        updatedCount++;
      } else if (item.hasOwnProperty('comment')) {
        item['comment'] = targetComment;
        updatedCount++;
      } else {
        // Fallback: if neither exists, we might want to add it if it's a valid contact
        item['comment'] = targetComment;
        updatedCount++;
      }
    }
  });

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log(`Successfully updated ${updatedCount} pending contacts with the new comment.`);
} catch (error) {
  console.error('Error updating comments:', error);
}
