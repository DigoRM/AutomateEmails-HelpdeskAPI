const express = require('express');
const cors = require('cors');
const multer = require('multer');
const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { randomUUID } = require('crypto');

const app = express();
app.use(cors());
app.use(express.json());

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR);

const DB_PATH = path.join(__dirname, 'database.json');
const CONFIG_PATH = path.join(__dirname, 'config.json');

const upload = multer({ dest: UPLOADS_DIR });

// In-memory states
let isRunning = false;
let currentTimeoutName = null;

// Helper to read JSON
const readJSON = (filePath, defaultVal = {}) => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (err) {
    return defaultVal;
  }
};

const writeJSON = (filePath, data) => {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Safe Write Failed:', e);
  }
};

// Start Endpoint
app.post('/api/start', (req, res) => {
  if (isRunning) return res.json({ success: false, message: 'Already running' });

  const config = readJSON(CONFIG_PATH, {});
  // Verificação básica se há pelo menos uma marca configurada
  const brands = config.brands || {};
  if (Object.keys(brands).length === 0) {
    return res.status(400).json({ success: false, message: 'No brands configured. Please check config.json.' });
  }

  isRunning = true;
  processQueue(); // start the loop
  res.json({ success: true, message: 'Started' });
});

// Pause Endpoint
app.post('/api/pause', (req, res) => {
  isRunning = false;
  if (currentTimeoutName) {
    clearTimeout(currentTimeoutName);
    currentTimeoutName = null;
  }
  res.json({ success: true, message: 'Paused' });
});

// Status Endpoint
app.get('/api/status', (req, res) => {
  const db = readJSON(DB_PATH, { queue: [] });
  const config = readJSON(CONFIG_PATH, { interval: 300 }); // Default 5 mins

  const total = db.queue.length;
  const completed = db.queue.filter(item => item.status === 'completed').length;
  const remaining = total - completed;
  let remainingTimeHours = ((remaining * config.interval) / 3600).toFixed(2);
  if (isNaN(remainingTimeHours)) remainingTimeHours = 0;

  const currentItemProcessing = db.queue.find(item => item.status === 'pending') || null;

  const vipTotal = db.queue.filter(i => i.category === 'VIP').length;
  const vipCompleted = db.queue.filter(i => i.category === 'VIP' && i.status === 'completed').length;
  const potentialTotal = db.queue.filter(i => i.category === 'Potential VIP').length;
  const potentialCompleted = db.queue.filter(i => i.category === 'Potential VIP' && i.status === 'completed').length;

  // Estatísticas por Marca
  const brandStats = {};
  const brandsFound = ['RoyalSpins', 'MegaJackpot'];
  brandsFound.forEach(b => {
    brandStats[b] = {
      vipTotal: db.queue.filter(i => (i.brand || 'RoyalSpins') === b && i.category === 'VIP').length,
      vipCompleted: db.queue.filter(i => (i.brand || 'RoyalSpins') === b && i.category === 'VIP' && i.status === 'completed').length,
      potentialTotal: db.queue.filter(i => (i.brand || 'RoyalSpins') === b && i.category === 'Potential VIP').length,
      potentialCompleted: db.queue.filter(i => (i.brand || 'RoyalSpins') === b && i.category === 'Potential VIP' && i.status === 'completed').length,
    };
  });

  res.json({
    isRunning,
    total,
    completed,
    remaining,
    remainingTimeHours,
    currentItem: currentItemProcessing || db.lastProcessedItem || null,
    lastCompletedItem: db.lastProcessedItem || null,
    history: db.queue,
    stats: {
      vipTotal, vipCompleted, potentialTotal, potentialCompleted,
      byBrand: brandStats
    },
    config: {
      brands: config.brands || {},
      interval: config.interval || 300
    }
  });
});

// Config Endpoint
app.post('/api/config', (req, res) => {
  console.log('--> Recebendo solicitação de alteração de configuração...');
  try {
    const { brands, interval } = req.body;
    const newConfigData = readJSON(CONFIG_PATH, {});
    
    if (brands !== undefined) newConfigData.brands = brands;
    if (interval !== undefined) newConfigData.interval = parseInt(interval, 10);
    
    writeJSON(CONFIG_PATH, newConfigData);
    console.log('✅ Configuração salva no arquivo com sucesso!');
    res.json({ success: true, config: newConfigData });
  } catch (err) {
    console.error("❌ Erro interno ao salvar config:", err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
});

function parseCSVToObjects(text) {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  text = text.replace(/\r\n?/g, '\n');

  // Detect whether comma (,) or semicolon (;) is the primary delimiter
  const firstLine = text.split('\n')[0] || '';
  const commaCount = (firstLine.match(/,/g) || []).length;
  const semicolonCount = (firstLine.match(/;/g) || []).length;
  const separator = semicolonCount > commaCount ? ';' : ',';

  let p = '', i = 0, r = 0, s = true;
  let row = [''];
  let ret = [row];

  for (let l of text) {
    if ('"' === l) {
      if (s && l === p) row[i] += l;
      s = !s;
    } else if (separator === l && s) {
      l = row[++i] = '';
    } else if ('\n' === l && s) {
      row = ret[++r] = [''];
      i = 0;
    } else {
      row[i] += l;
    }
    p = l;
  }
  
  if (ret[ret.length - 1].length === 1 && ret[ret.length - 1][0] === '') {
    ret.pop();
  }

  const headers = ret[0];
  const data = [];
  for (let j = 1; j < ret.length; j++) {
    const obj = {};
    for (let k = 0; k < headers.length; k++) {
      if (headers[k]) {
        obj[headers[k].trim()] = ret[j][k] ? ret[j][k] : '';
      }
    }
    data.push(obj);
  }
  return data;
}

// Manual Contact Creation Endpoint
app.post('/api/queue/manual', (req, res) => {
  try {
    const { casino_user_id, to_email, subject, body, comment, category, username, brand } = req.body;

    if (!casino_user_id || !to_email || !subject || !body || !category) {
      return res.status(400).json({ success: false, message: 'Faltam campos obrigatórios (ID, Email, Assunto, Corpo, Categoria)' });
    }

    const db = readJSON(DB_PATH, { queue: [] });

    const newItem = {
      uuid: randomUUID(),
      casino_user_id: String(casino_user_id),
      to_email,
      username: username || "Jogador VIP",
      subject,
      body,
      comment,
      category,
      brand: brand || 'RoyalSpins',
      createdAt: new Date().toISOString(),
      status: 'pending',
      is_ready: false,
      isManual: true
    };

    // Duplication check (ID + Subject + status pending)
    const existingIndex = db.queue.findIndex(q => 
      String(q.casino_user_id) === String(newItem.casino_user_id) && 
      q.subject === newItem.subject &&
      q.status === 'pending'
    );

    if (existingIndex > -1) {
      db.queue[existingIndex] = { ...db.queue[existingIndex], ...newItem, uuid: db.queue[existingIndex].uuid };
    } else {
      // Adiciona no INÍCIO da fila para ser disparado primeiro
      db.queue.unshift(newItem);
    }

    writeJSON(DB_PATH, db);
    res.json({ success: true, message: 'Contato adicionado à fila com sucesso', item: newItem });
  } catch (err) {
    console.error("Erro no POST /api/queue/manual:", err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
});

// Batch Manual Contact Creation Endpoint
app.post('/api/queue/batch-manual', (req, res) => {
  try {
    const { contacts, subject, body, comment, category, brand } = req.body;

    if (!Array.isArray(contacts) || !subject || !body || !category) {
      return res.status(400).json({ success: false, message: 'Faltam campos obrigatórios (Lista de Contatos, Assunto, Corpo, Categoria)' });
    }

    const db = readJSON(DB_PATH, { queue: [] });
    let addedCount = 0;

    contacts.forEach(contact => {
      const { casino_user_id, to_email, username } = contact;
      if (!casino_user_id || !to_email) return;

      const newItem = {
        uuid: randomUUID(),
        casino_user_id: String(casino_user_id),
        to_email,
        username: username || "Jogador VIP",
        subject,
        body,
        comment,
        category,
        brand: brand || 'RoyalSpins',
        createdAt: new Date().toISOString(),
        status: 'pending',
        is_ready: false,
        isManual: true
      };

      // Duplication check
      const existingIndex = db.queue.findIndex(q => 
        String(q.casino_user_id) === String(newItem.casino_user_id) && 
        q.subject === newItem.subject &&
        q.status === 'pending'
      );

      if (existingIndex > -1) {
        db.queue[existingIndex] = { ...db.queue[existingIndex], ...newItem, uuid: db.queue[existingIndex].uuid };
      } else {
        db.queue.unshift(newItem);
        addedCount++;
      }
    });

    writeJSON(DB_PATH, db);
    res.json({ success: true, message: `${addedCount} contatos adicionados à fila com sucesso` });
  } catch (err) {
    console.error("Erro no POST /api/queue/batch-manual:", err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor' });
  }
});

// Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  let data = [];
  if (req.file.originalname.toLowerCase().endsWith('.csv')) {
    const fs = require('fs');
    const text = fs.readFileSync(req.file.path, 'utf8');
    data = parseCSVToObjects(text);
  } else {
    // Fallback para XLSX ou outros
    const workbook = xlsx.readFile(req.file.path, { codepage: 65001 });
    const sheetName = workbook.SheetNames[0];
    data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);
  }

  const db = readJSON(DB_PATH, { queue: [] });

  // Add new rows, but ignore duplicates based on email or casino_user_id
  let addedCount = 0;

  const category = req.body.category || 'Potential VIP';
  const brand = req.body.brand || 'RoyalSpins';

  data.forEach((row) => {
    // Identificador único de quem está na planilha (Email ou ID) para evitar duplicação em fila
    const userId = row.casino_user_id || row.ID || row['User ID'];
    const userEmail = row.to_email || row.Email || row.email;
    const existingIndex = db.queue.findIndex(q => 
      String(q.casino_user_id || q.ID || q['User ID']) === String(userId) && 
      (q.subject || q.Assunto) === (row.subject || row.Assunto) &&
      q.status === 'pending'
    );

    // Map required API fields and others
    const newItem = {
      ...row,
      uuid: randomUUID(),
      category,
      brand,
      createdAt: new Date().toISOString(),
      status: 'pending', 
      is_ready: false
    };

    if (existingIndex > -1) {
      // Se já existe pendente igual, apenas atualizamos os dados (caso tenha mudado algo na planilha)
      db.queue[existingIndex] = { ...db.queue[existingIndex], ...newItem, uuid: db.queue[existingIndex].uuid };
    } else {
      db.queue.push(newItem);
      addedCount++;
    }
  });

  writeJSON(DB_PATH, db);
  fs.unlinkSync(req.file.path); // cleanup

  res.json({ success: true, addedCount, total: db.queue.length });
});

app.delete('/api/queue/:id', (req, res) => {
  const { id } = req.params;
  const db = readJSON(DB_PATH, { queue: [] });
  const initialLength = db.queue.length;

  db.queue = db.queue.filter(item => !(String(item.uuid) === String(id) && item.status === 'pending'));

  if (db.queue.length < initialLength) {
    writeJSON(DB_PATH, db);
    res.json({ message: 'Item removido da fila' });
  } else {
  }
});

app.post('/api/queue/batch-delete', (req, res) => {
  const { uuids } = req.body;
  if (!Array.isArray(uuids)) return res.status(400).json({ error: 'uuids must be an array' });

  const db = readJSON(DB_PATH, { queue: [] });
  const initialLength = db.queue.length;

  db.queue = db.queue.filter(item => !(uuids.includes(item.uuid) && item.status === 'pending'));

  if (db.queue.length < initialLength) {
    writeJSON(DB_PATH, db);
    res.json({ success: true, message: `${initialLength - db.queue.length} items removed` });
  } else {
    res.json({ success: false, message: 'No items were removed' });
  }
});

app.get('/api/dev/delete-all-pending', (req, res) => {
  const db = readJSON(DB_PATH, { queue: [] });
  db.queue = db.queue.filter(item => item.status !== 'pending');
  writeJSON(DB_PATH, db);
  res.json({ message: 'All pending items successfully deleted.' });
});

app.post('/api/queue/reorder', (req, res) => {
  try {
    const { order } = req.body; // Array of UUIDs
    if (!Array.isArray(order)) return res.status(400).json({ error: 'Order must be an array of UUIDs' });

    const db = readJSON(DB_PATH, { queue: [] });
    
    // Separa os itens que não serão afetados
    const others = db.queue.filter(item => item.status !== 'pending' || !order.includes(item.uuid));
    
    // Puxa os itens pendentes
    const pendingToOrder = db.queue.filter(item => item.status === 'pending' && order.includes(item.uuid));
    
    // Ordena eles usando a exata sequência passada na matriz "order" do front-end
    pendingToOrder.sort((a, b) => order.indexOf(a.uuid) - order.indexOf(b.uuid));
    
    // Mescla todos novamente. O loop "processQueue" sempre puxará pela ordem visualizada na estrutura!
    db.queue = [...others, ...pendingToOrder];
    
    writeJSON(DB_PATH, db);
    res.json({ success: true, message: 'Fila reordenada com sucesso' });
  } catch (err) {
    console.error("Erro no POST /api/queue/reorder:", err);
    res.status(500).json({ success: false, message: 'Erro interno ao reordenar fila' });
  }
});

// Update Endpoint (CRM Edit)
app.put('/api/queue/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { subject, body, comment, is_ready, email } = req.body;
    
    const db = readJSON(DB_PATH, { queue: [] });

    // Localizar pelo UUID único (ID de Disparo) para evitar qualquer conflito
    const itemIndex = db.queue.findIndex(item => String(item.uuid) === String(id));

    if (itemIndex > -1) {
      const item = db.queue[itemIndex];
      
      // Update Subject
      if (subject !== undefined) {
        if (item.Assunto !== undefined) item.Assunto = subject;
        else item.subject = subject;
      }
      
      // Update Body
      if (body !== undefined) {
        if (item.Corpo !== undefined) item.Corpo = body;
        else if (item.email_body !== undefined) item.email_body = body;
        else item.body = body;
      }
      
      // Update Comment
      if (comment !== undefined) {
        if (item.Comentário !== undefined) item.Comentário = comment;
        else if (item.comentario_interno !== undefined) item.comentario_interno = comment;
        else item.comment = comment;
      }

      if (is_ready !== undefined) {
        item.is_ready = is_ready === true || is_ready === 'true';
      }

      // Update Email
      if (email !== undefined) {
        let hasEmailKey = false;
        if (item.to_email !== undefined) { item.to_email = email; hasEmailKey = true; }
        if (item.Email !== undefined) { item.Email = email; hasEmailKey = true; }
        if (item.email !== undefined) { item.email = email; hasEmailKey = true; }
        
        if (!hasEmailKey) {
          item.to_email = email;
        }
      }
      
      writeJSON(DB_PATH, db);
      return res.json({ success: true, message: 'Item atualizado com sucesso' });
    } else {
      return res.status(404).json({ success: false, message: 'Item não encontrado na fila' });
    }
  } catch (err) {
    console.error("Erro no PUT /api/queue/:id:", err);
    res.status(500).json({ success: false, message: 'Erro interno no servidor ao salvar' });
  }
});

app.post('/api/queue/batch-ready', (req, res) => {
  try {
    const { category, ready } = req.body;
    const db = readJSON(DB_PATH, { queue: [] });
    
    db.queue = db.queue.map(item => {
      if (item.status === 'pending' && (category === 'All' || item.category === category)) {
        return { ...item, is_ready: !!ready };
      }
      return item;
    });

    writeJSON(DB_PATH, db);
    res.json({ success: true, message: `Lote marcado como ${ready ? 'Revisado' : 'Não Revisado'}` });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Erro ao processar lote' });
  }
});

async function processQueue() {
  if (!isRunning) return;

  const db = readJSON(DB_PATH, { queue: [] });
  const config = readJSON(CONFIG_PATH, {});
  const brands = config.brands || {};

  const index = db.queue.findIndex(i => i.status === 'pending' && i.is_ready === true);
  if (index === -1) {
    isRunning = false; // completed all
    return;
  }

  const item = db.queue[index];
  const brandName = item.brand || 'RoyalSpins';
  const brandConfig = brands[brandName];

  if (!brandConfig || !brandConfig.apiToken) {
    console.error(`❌ Configuração de API não encontrada para a marca: ${brandName}`);
    // Marcar como erro para não travar a fila infinitamente
    db.queue[index].status = 'error';
    writeJSON(DB_PATH, db);
    setTimeout(processQueue, 1000);
    return;
  }

  try {
    // IDs dos Grupos (Teams) vindos da config ou fallback hardcoded
    const teamVIP = brandConfig.teamVIP;
    const teamPotential = brandConfig.teamPotential;
    const targetTag = brandConfig.tagID;

    const targetTeam = item.category === 'VIP' ? teamVIP : teamPotential;

    const finalUserId = item.casino_user_id || item.ID || item['User ID'];
    const finalEmail = item.to_email || item.Email || item.email;
    const finalUsername = item.username || item.Jogador || item.nome || "Jogador VIP";
    const finalSubject = item.subject || item.Assunto || 'Novidades VIP para você!';
    const finalBody = item.body || item.Corpo || item.email_body || "(Mensagem vazia ou coluna do arquivo base não reconhecida.)";

    const payload = {
      subject: finalSubject,
      status: "solved", // Ticket já cai como Resolvido!
      teamIDs: [targetTeam],
      assignment: {
        team: { ID: targetTeam },
        agent: null
      },
      requester: {
        email: finalEmail,
        name: finalUsername 
      },
      message: {
        text: finalBody
      }
    };

    // Adiciona a tag da marca
    payload.tagIDs = targetTag ? [targetTag] : [];

    // Requisição REAL de Produção
    const response = await axios.post('https://api.helpdesk.com/v1/tickets', payload, {
      headers: {
        'Authorization': `Basic ${brandConfig.apiToken}`,
        'Content-Type': 'application/json'
      }
    });

    // Pega os IDs retornados pela API real
    const ticketID = response.data.ID; // UUID para chamadas de API (PATCH, etc)
    let shortID = ticketID; // Fallback para o UUID

    // Pequena pausa para garantir que o HelpDesk gerou o shortID (evita race condition)
    await new Promise(resolve => setTimeout(resolve, 1500));

    try {
      const getTicket = await axios.get(`https://api.helpdesk.com/v1/tickets/${ticketID}`, {
        headers: {
          'Authorization': `Basic ${brandConfig.apiToken}`,
          'Accept': 'application/json'
        }
      });
      // Tenta capturar de várias formas possíveis (shortID, short_id, etc)
      const capturedID = getTicket.data.shortID || getTicket.data.short_id || getTicket.data.ShortID;
      if (capturedID) {
        shortID = capturedID;
        console.log(`🔍 Ticket ID Curto capturado: ${shortID}`);
      }
    } catch (getErr) {
      console.error(`⚠️ Erro ao buscar shortID para ${ticketID}:`, getErr.message);
    }
    
    // Constrói a URL do comentário dinamicamente caso falte a coluna
    const baseUrl = brandConfig.baseUrl || 'https://a.RoyalSpins.com';
    const generatedCommentUrl = finalUserId ? `${baseUrl}/user/usercomments/${finalUserId}?userId=${finalUserId}&needFilter=true` : '';
    const linkToAttach = item.comment_url || item.link_comentario || generatedCommentUrl;

    if (linkToAttach) {
      try {
        await axios.patch(`https://api.helpdesk.com/v1/tickets/${ticketID}`, {
          isPrivate: true,
          message: { text: linkToAttach }
        }, {
          headers: {
            'Authorization': `Basic ${brandConfig.apiToken}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (patchErr) {
        console.error(`Warning: Failed to attach private note for ${ticketID}`, patchErr.message);
      }
    }
    // Re-leitura do DB antes de salvar para evitar sobrescrever edições do usuário (CRM) durante o await
    const freshDb = readJSON(DB_PATH, { queue: [] });
    const freshIndex = freshDb.queue.findIndex(i => String(i.uuid) === String(item.uuid));

    if (freshIndex > -1) {
      const timestamp = new Date().toISOString();
      freshDb.queue[freshIndex].status = 'completed';
      freshDb.queue[freshIndex].ticketID = ticketID; // Mantém o UUID
      freshDb.queue[freshIndex].shortID = shortID;   // Salva o ID amigável
      freshDb.queue[freshIndex].dispatchedAt = timestamp;

      // Mantemos o item atualizado para o log do frontend
      const updatedItem = { ...freshDb.queue[freshIndex] };
      freshDb.lastProcessedItem = updatedItem;

      writeJSON(DB_PATH, freshDb);
      console.log(`✅ Ticket processado para: ${finalEmail} (ID: ${shortID})`);
    }
  } catch (error) {
    const finalEmail = item.to_email || item.Email || item.email || 'E-mail desconhecido';
    console.error(`❌ Erro ao processar ticket para ${finalEmail}:`, error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.error('⚠️ DICA: O servidor não conseguiu encontrar o endereço "api.helpdesk.com". Verifique sua conexão com a internet ou se existe algum firewall bloqueando o acesso.');
    }
    const freshDb = readJSON(DB_PATH, { queue: [] });
    const freshIndex = freshDb.queue.findIndex(i => String(i.uuid) === String(item.uuid));
    if (freshIndex > -1) {
      freshDb.queue[freshIndex].status = 'error';
      writeJSON(DB_PATH, freshDb);
    }
  }

  if (isRunning) {
    const delay = (config.interval || 300) * 1000;
    currentTimeoutName = setTimeout(processQueue, delay);
  }
}

const PORT = 3001;
app.listen(PORT, () => console.log(`Backend Bridge running on http://localhost:${PORT}`));

