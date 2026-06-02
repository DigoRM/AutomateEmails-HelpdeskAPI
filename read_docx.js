const mammoth = require("mammoth");

mammoth.extractRawText({path: "c:\\Users\\rodri\\OneDrive\\Ambiente de Trabalho\\AutomateEmails\\API Helpdesk - Criar Ticket.docx"})
    .then(function(result) {
        const text = result.value; // The raw text
        console.log(text.substring(0, 3000)); // Log the first 3000 characters
        if (text.length > 3000) {
            console.log("\n...\n" + text.substring(text.length - 1000));
        }
    })
    .catch(function(err) {
        console.error(err);
    });
