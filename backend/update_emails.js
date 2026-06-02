const fs = require('fs');

const dbPath = './database.json';
const dbData = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

let updatedCount = 0;

const oldText = "exclusive Monday offers";
const newText = "exclusive offers";

if (dbData && Array.isArray(dbData.queue)) {
    dbData.queue.forEach(item => {
        if (item.status === 'pending' && item.Corpo && item.Corpo.includes(oldText)) {
            item.Corpo = item.Corpo.replace(oldText, newText);
            updatedCount++;
        }
    });

    if (updatedCount > 0) {
        fs.writeFileSync(dbPath, JSON.stringify(dbData, null, 2), 'utf8');
        console.log(`Updated ${updatedCount} pending items in database.json`);
    } else {
        console.log('No pending items found to update in database.json.');
    }
} else {
    console.log('Invalid database.json format: queue array not found.');
}
