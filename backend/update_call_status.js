const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');

try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let updateCount = 0;

    if (data.queue && Array.isArray(data.queue)) {
        data.queue.forEach(item => {
            if (item.status === 'pending') {
                const commentKeys = ['Comentário', 'comment', 'comentario_interno'];
                
                commentKeys.forEach(key => {
                    if (item[key] && typeof item[key] === 'string' && item[key].includes('d2')) {
                        // Check if already added to avoid duplicates
                        if (!item[key].includes('tried to call but no answer')) {
                            // Insert right after 'd2'
                            // We replace 'd2' with 'd2 - tried to call but no answer'
                            // If it already had a hyphen like 'd2 - ...', we'll get 'd2 - tried to call but no answer - ...'
                            item[key] = item[key].replace(/d2/g, 'd2 - tried to call but no answer');
                            updateCount++;
                        }
                    }
                });
            }
        });
    }

    if (updateCount > 0) {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Success: Updated ${updateCount} pending comments with "tried to call" note.`);
    } else {
        console.log('No pending items with "d2" found (or already updated).');
    }

} catch (error) {
    console.error('Error processing database:', error);
}
