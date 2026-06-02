const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'database.json');

try {
    const data = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    let updateCount = 0;

    if (data.queue && Array.isArray(data.queue)) {
        data.queue.forEach(item => {
            if (item.status === 'pending') {
                // Check both potential key names for comments
                const commentKeys = ['Comentário', 'comment', 'comentario_interno'];
                
                commentKeys.forEach(key => {
                    if (item[key] && typeof item[key] === 'string') {
                        if (item[key].includes('100% bonus')) {
                            const original = item[key];
                            item[key] = item[key].replace(/100% bonus/g, '150% bonus');
                            if (original !== item[key]) {
                                updateCount++;
                            }
                        }
                    }
                });
            }
        });
    }

    if (updateCount > 0) {
        fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`Success: Updated ${updateCount} pending comments.`);
    } else {
        console.log('No pending items with "100% bonus" found to update.');
    }

} catch (error) {
    console.error('Error processing database:', error);
}
