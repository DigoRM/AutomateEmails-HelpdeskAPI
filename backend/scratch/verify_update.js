const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'database.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Find a backup file to compare
const dir = path.join(__dirname, '..');
const files = fs.readdirSync(dir);
const backupFiles = files.filter(f => f.startsWith('database.backup_') && f.endsWith('.json')).sort();
if (backupFiles.length === 0) {
    console.log("No backup file found to compare!");
    process.exit(1);
}

const latestBackup = backupFiles[backupFiles.length - 1];
const backupPath = path.join(dir, latestBackup);
console.log(`Comparing with backup: ${latestBackup}`);
const backupDb = JSON.parse(fs.readFileSync(backupPath, 'utf8'));

let differences = 0;
let pendingDiffs = 0;
let nonPendingDiffs = 0;

const fields = ['Comentário', 'comment', 'comentario_interno'];

backupDb.queue.forEach((oldItem, index) => {
    const newItem = db.queue[index];
    let isDifferent = false;
    const diffSample = [];
    
    fields.forEach(field => {
        if (oldItem[field] !== newItem[field]) {
            isDifferent = true;
            diffSample.push({
                field,
                old: oldItem[field],
                new: newItem[field]
            });
        }
    });
    
    if (isDifferent) {
        differences++;
        if (oldItem.status === 'pending') {
            pendingDiffs++;
        } else {
            nonPendingDiffs++;
            console.log(`WARNING: Non-pending item at index ${index} was modified!`);
            console.log(`  Old status: ${oldItem.status}`);
            diffSample.forEach(d => {
                console.log(`  Field "${d.field}":`);
                console.log(`    OLD: "${d.old}"`);
                console.log(`    NEW: "${d.new}"`);
            });
        }
    }
});

console.log("\n=== VERIFICATION REPORT ===");
console.log(`Total differences found: ${differences}`);
console.log(`Pending differences (Expected 38): ${pendingDiffs}`);
console.log(`Non-pending differences (Expected 0): ${nonPendingDiffs}`);

if (differences === 38 && pendingDiffs === 38 && nonPendingDiffs === 0) {
    console.log("\nSUCCESS: All integrity checks passed! Exactly the correct 38 pending items were modified.");
} else {
    console.log("\nFAILURE: Mismatch in expected differences!");
}
