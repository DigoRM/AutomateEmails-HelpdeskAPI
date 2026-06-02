const axios = require('axios');

async function debug() {
  const token = 'MDhiYmJlNjEtM2FkOC00ZGZiLTgyZDItNDI4ZGVjYjY2ZmY0OnVzLXNvdXRoMTptbi11T2pCb2daX0p6Wi1ENXlPcmIxSnhnVGc=';
  const ticketId = 'ea7330b8-1ecd-4a63-9687-9e680a9bead5';
  
  try {
    const res = await axios.get(`https://api.helpdesk.com/v1/tickets/${ticketId}`, {
      headers: {
        'Authorization': `Basic ${token}`,
        'Accept': 'application/json'
      }
    });
    
    console.log("FULL TICKET RESPONSE:");
    console.log(JSON.stringify(res.data, null, 2));
    
    console.log("\nKEYS FOUND:", Object.keys(res.data));
  } catch (error) {
    console.error("Error fetching ticket:", error.message);
    if (error.response) {
      console.error("Response data:", error.response.data);
    }
  }
}

debug();
