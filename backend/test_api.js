const axios = require('axios');

async function test() {
  const token = 'NDg3ZWIyYTItYmZhMi00M2M3LTliYjUtOWE3ODZlYmQ2NTE0OnVzLXNvdXRoMTp0eXR5VTRwbkFqUGxrM1BKYlFFbHVVTnE5RHc=';
  const headers = {
    'Authorization': `Basic ${token}`,
    'Content-Type': 'application/json'
  };

  try {
    console.log("Fetching GET /v1/tags...");
    let res = await axios.get('https://api.helpdesk.com/v1/tags', { headers });
    let tagsInfo = Array.isArray(res.data) ? res.data.map(t => ({id: t.ID, name: t.name})) : res.data;
    console.log("Tags available:", JSON.stringify(tagsInfo, null, 2));
  } catch (error) {
    console.error("API error", error.message, error.response?.data);
  }
}

test();
