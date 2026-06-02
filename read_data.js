const fs = require('fs');
const pdf = require('pdf-parse');
const xlsx = require('xlsx');

async function main() {
    console.log("=== READING EXCEL ===");
    try {
        const workbook = xlsx.readFile('c:\\Users\\rodri\\OneDrive\\Ambiente de Trabalho\\AutomateEmails\\sunday_promo_emails.xlsx');
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = xlsx.utils.sheet_to_json(sheet);
        console.log("Columns:", Object.keys(data[0] || {}).join(", "));
        console.log("First row:", JSON.stringify(data[0], null, 2));
    } catch (e) {
        console.error("Excel Error:", e);
    }
    
    console.log("\n=== READING PDF ===");
    try {
        const dataBuffer = fs.readFileSync('c:\\Users\\rodri\\OneDrive\\Ambiente de Trabalho\\AutomateEmails\\API Helpdesk - Criar Ticket.pdf');
        const data = await pdf(dataBuffer);
        console.log(data.text.substring(0, 2000));
    } catch (e) {
        console.error("PDF Error:", e);
    }
}

main();
