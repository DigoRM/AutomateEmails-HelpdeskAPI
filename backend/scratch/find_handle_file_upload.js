const fs = require('fs');
const path = require('path');

const appJsxPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'App.jsx');
const content = fs.readFileSync(appJsxPath, 'utf8');
const lines = content.split('\n');

let startLine = -1;
lines.forEach((line, index) => {
    if (line.includes('const handleFileUpload') || line.includes('async function handleFileUpload')) {
        startLine = index;
    }
});

if (startLine !== -1) {
    console.log(`Found handleFileUpload starting at line ${startLine + 1}`);
    for (let i = startLine; i < startLine + 60; i++) {
        if (lines[i] !== undefined) {
            console.log(`${i + 1}: ${lines[i]}`);
        }
    }
} else {
    console.log("handleFileUpload not found in App.jsx");
}
