const xlsx = require('xlsx');
const path = require('path');

const filePath = path.join(__dirname, 'risky_vip_v2.csv');
const workbook = xlsx.readFile(filePath, { codepage: 65001 });
const sheetName = workbook.SheetNames[0];
const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

console.log(`Total rows parsed: ${data.length}`);
console.log(JSON.stringify(data.map(r => r.Jogador), null, 2));
