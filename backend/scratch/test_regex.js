const fs = require('fs');
const path = require('path');

const commentsPath = path.join(__dirname, 'all_ndb_comments.txt');
if (!fs.existsSync(commentsPath)) {
    console.error("all_ndb_comments.txt not found");
    process.exit(1);
}

const comments = fs.readFileSync(commentsPath, 'utf8').split('\n').filter(Boolean);

const regex = /(?:€\s*\d+|\d+\s*(?:eur|EUR|€)?)\s*(ndb[a]?)/gi;

const results = [];
comments.forEach(comment => {
    const original = comment;
    const replaced = original.replace(regex, '$1');
    results.push({ original, replaced });
});

let output = '';
results.forEach(res => {
    output += `BEFORE: ${res.original}\nAFTER : ${res.replaced}\n\n`;
});

fs.writeFileSync(path.join(__dirname, 'regex_results.txt'), output, 'utf8');
console.log(`Saved comparison of ${results.length} comments to regex_results.txt`);
