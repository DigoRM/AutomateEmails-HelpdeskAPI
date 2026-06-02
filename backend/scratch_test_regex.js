const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

const pending = db.queue.filter(item => item.status === 'pending');

console.log('Testing Regex replacement on pending comments:');

pending.forEach((item, index) => {
  const comment = item.Comentário || item.comment || '';
  if (comment.toUpperCase().includes('NDB')) {
    // Let's construct a general regex:
    // 1. Matches "€\d+ NDB", "€ \d+ NDB", "\d+ NDB", "\d+eur NDB", etc.
    // 2. Matches "NDB €\d+", "NDB € \d+", "NDB \d+", etc.
    let updatedComment = comment
      .replace(/€\s*\d+\s*NDB/gi, 'NDB')
      .replace(/NDB\s*€\s*\d+/gi, 'NDB')
      .replace(/\d+\s*(?:eur|usd|gbp|brl)?\s*NDB/gi, 'NDB')
      .replace(/NDB\s*\d+\s*(?:eur|usd|gbp|brl)?/gi, 'NDB');

    // Also let's clean up double spaces if any were introduced
    updatedComment = updatedComment.replace(/\s+/g, ' ');

    if (updatedComment !== comment) {
      console.log(`Original: ${JSON.stringify(comment)}`);
      console.log(`Updated : ${JSON.stringify(updatedComment)}`);
      console.log('---');
    }
  }
});
