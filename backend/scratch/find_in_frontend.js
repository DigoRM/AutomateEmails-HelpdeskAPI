const fs = require('fs');
const path = require('path');

const appJsxPath = path.join(__dirname, '..', '..', 'frontend', 'src', 'App.jsx');
if (!fs.existsSync(appJsxPath)) {
    console.log("App.jsx not found");
    process.exit(1);
}

const content = fs.readFileSync(appJsxPath, 'utf8');
const lines = content.split('\n');

const terms = ['Inativo', 'Depósitos', 'Saques', 'Bônus', 'Avg', 'dias', 'financial', 'hold', 'inactive', 'deposits', 'cashouts', 'average'];
const matches = [];

lines.forEach((line, index) => {
    terms.forEach(term => {
        if (line.toLowerCase().includes(term.toLowerCase())) {
            matches.push({
                lineNumber: index + 1,
                term,
                line: line.trim()
            });
        }
    });
});

console.log(`Found ${matches.length} matches for financial/inactive terms in App.jsx:`);
matches.slice(0, 50).forEach(m => {
    console.log(`Line ${m.lineNumber} (matched "${m.term}"): ${m.line}`);
});
if (matches.length > 50) {
    console.log(`... and ${matches.length - 50} more matches`);
}
