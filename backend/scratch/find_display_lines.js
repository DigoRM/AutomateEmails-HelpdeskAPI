const fs = require('fs');
const path = require('path');

const appJsxPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'App.jsx');
const content = fs.readFileSync(appJsxPath, 'utf8');
const lines = content.split('\n');

for (let i = 1390; i < 1440; i++) {
    if (lines[i]) {
        console.log(`${i + 1}: ${lines[i]}`);
    }
}
