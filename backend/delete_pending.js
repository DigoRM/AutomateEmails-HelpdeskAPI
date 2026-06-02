const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, 'database.json');

try {
    const data = fs.readFileSync(DB_PATH, 'utf8');
    const db = JSON.parse(data);
    
    const initialCount = db.queue.length;
    const pendingCount = db.queue.filter(item => item.status === 'pending').length;
    
    // Filter out items with status 'pending'
    db.queue = db.queue.filter(item => item.status !== 'pending');
    
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf8');
    
    console.log(`Successfully processed database.json`);
    console.log(`Initial items: ${initialCount}`);
    console.log(`Pending items removed: ${pendingCount}`);
    console.log(`Remaining items (completed/error): ${db.queue.length}`);
} catch (err) {
    console.error("Error cleaning database:", err);
}
