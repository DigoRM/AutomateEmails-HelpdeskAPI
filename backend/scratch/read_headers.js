const fs = require('fs');
const path = require('path');
const xlsx = require('xlsx');

const rootDir = path.join(__dirname, '..', '..');
const files = fs.readdirSync(rootDir);

files.forEach(file => {
    if (file.endsWith('.csv') || file.endsWith('.xlsx')) {
        const filePath = path.join(rootDir, file);
        console.log(`\n=== Headers for ${file} ===`);
        try {
            if (file.endsWith('.csv')) {
                const content = fs.readFileSync(filePath, 'utf8');
                const firstLine = content.split('\n')[0];
                console.log(firstLine.trim());
            } else if (file.endsWith('.xlsx')) {
                const workbook = xlsx.readFile(filePath);
                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const data = xlsx.utils.sheet_to_json(sheet);
                    if (data.length > 0) {
                        console.log(`Sheet "${sheetName}":`, Object.keys(data[0]).join(', '));
                    } else {
                        console.log(`Sheet "${sheetName}" is empty.`);
                    }
                });
            }
        } catch (err) {
            console.error(`Error reading ${file}:`, err.message);
        }
    }
});
