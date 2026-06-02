import { useState, useEffect, useRef } from 'react'
import './App.css'

const API_BASE = 'http://localhost:3001/api';

function App() {
  const [config, setConfig] = useState({ brands: {}, interval: 300 });
  const [activeBrand, setActiveBrand] = useState('All');
  const [status, setStatus] = useState({
    isRunning: false,
    total: 0,
    completed: 0,
    remaining: 0,
    remainingTimeHours: 0,
    currentItem: null,
    history: [],
    stats: { vipTotal: 0, vipCompleted: 0, potentialTotal: 0, potentialCompleted: 0 }
  });
  const [toast, setToast] = useState('');
  const fileInputRef = useRef(null);

  // Notificações: States & Refs
  const [activeNotifications, setActiveNotifications] = useState([]);
  const [lastProcessedItem, setLastProcessedItem] = useState(null);
  const lastAutoOpenedTicketRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const prevIsRunningRef = useRef(false);

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 4000);
  };

  // Som de Notificação (Ping)
  const playPing = () => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // Mi alto
      oscillator.frequency.exponentialRampToValueAtTime(440, audioCtx.currentTime + 0.5);

      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error("Erro ao tocar áudio:", e);
    }
  };

  // New states for tabs and history
  const [activeTab, setActiveTab] = useState('dashboard');
  const [uploadCategory, setUploadCategory] = useState('');
  const [uploadBrand, setUploadBrand] = useState('RoyalSpins');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPagePending, setCurrentPagePending] = useState(1);
  const itemsPerPage = 50;

  // Multiple Delete states
  const [selectedToDelete, setSelectedToDelete] = useState([]);

  // CRM Edit states
  const [editingItem, setEditingItem] = useState(null);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [editComment, setEditComment] = useState('');
  const [editEmail, setEditEmail] = useState('');

  // Manual Contact states
  const [manualContact, setManualContact] = useState({
    rawText: '',
    casino_user_id: '',
    to_email: '',
    subject: '',
    body: '',
    comment: '',
    category: 'Potential VIP',
    brand: 'RoyalSpins'
  });
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [showManualForm, setShowManualForm] = useState(false);

  // Batch Manual states
  const [batchManual, setBatchManual] = useState({
    rawText: '',
    subject: '',
    body: '',
    comment: '',
    category: 'Potential VIP',
    brand: 'RoyalSpins'
  });
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);
  const [showBatchForm, setShowBatchForm] = useState(false);
  const [parsedContacts, setParsedContacts] = useState([]);

  // Validations
  const validateEmail = (email) => {
    return email && email.includes('@');
  };

  const validateId = (id) => {
    return id && /^\d+$/.test(String(id));
  };

  // Smart Parser for Batch Manual
  const parseRawText = (text) => {
    // Regex patterns
    const emailRegex = /Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/gi;
    const idRegex = /Global ID:\s*(\d+)/gi;

    const emails = [];
    let match;
    while ((match = emailRegex.exec(text)) !== null) {
      emails.push({ email: match[1], index: match.index });
    }

    const ids = [];
    while ((match = idRegex.exec(text)) !== null) {
      ids.push({ id: match[1], index: match.index });
    }

    // Pair them up based on proximity
    const pairs = [];
    emails.forEach((e) => {
      // Find the closest ID that appears AFTER the email or just before it in the same block
      // Usually, in these logs, the Email appears first, then ID.
      // We'll just pair them by order for simplicity if the count matches, 
      // otherwise we can do something more complex.
    });

    // Simple order-based pairing if counts match, otherwise heuristic
    const result = [];
    const count = Math.min(emails.length, ids.length);
    for (let i = 0; i < count; i++) {
      result.push({
        casino_user_id: ids[i].id,
        to_email: emails[i].email
      });
    }
    setParsedContacts(result);
  };

  useEffect(() => {
    parseRawText(batchManual.rawText);
  }, [batchManual.rawText]);

  // Parser for Individual Contact
  useEffect(() => {
    if (manualContact.rawText) {
      const emailRegex = /Email:\s*([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/i;
      const idRegex = /Global ID:\s*(\d+)/i;
      
      const emailMatch = manualContact.rawText.match(emailRegex);
      const idMatch = manualContact.rawText.match(idRegex);
      const brandMatch = manualContact.rawText.match(/Brand:\s*([^\s\n\r]+)/i);
      
      let detectedBrand = null;
      if (brandMatch) {
        const rawBrand = brandMatch[1].toLowerCase();
        if (rawBrand.includes('odin')) detectedBrand = 'MegaJackpot';
        else if (rawBrand.includes('lucky')) detectedBrand = 'RoyalSpins';
      }

      if (emailMatch || idMatch || detectedBrand) {
        setManualContact(prev => ({
          ...prev,
          to_email: emailMatch ? emailMatch[1] : prev.to_email,
          casino_user_id: idMatch ? idMatch[1] : prev.casino_user_id,
          brand: detectedBrand || prev.brand
        }));
      }
    }
  }, [manualContact.rawText]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`${API_BASE}/status`);
      const data = await res.json();
      setStatus({
        ...data,
        history: data.history || [],
        stats: data.stats || { vipTotal: 0, vipCompleted: 0, potentialTotal: 0, potentialCompleted: 0 }
      });

      // Sincroniza configuração com o backend
      if (data.config) {
        setConfig({
          brands: data.config.brands || {},
          interval: data.config.interval || 300
        });
      }

      if (data.lastCompletedItem?.status === 'completed' && data.lastCompletedItem?.ticketID) {
        const newTicketID = data.lastCompletedItem.ticketID;
        if (isInitialLoadRef.current) {
          lastAutoOpenedTicketRef.current = newTicketID;
          isInitialLoadRef.current = false;
          setLastProcessedItem(data.lastCompletedItem);
        } else {
          setLastProcessedItem(prev =>
            prev?.ticketID !== newTicketID ? data.lastCompletedItem : prev
          );
        }
      } else if (isInitialLoadRef.current) {
        isInitialLoadRef.current = false;
      }
    } catch (err) {
      console.error("Backend not reachable");
    }
  };

  // Poll status
  useEffect(() => {
    fetchStatus();
    const timer = setInterval(fetchStatus, 2000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setCurrentPage(1);
    setCurrentPagePending(1);
  }, [filterCategory, filterStartDate, filterEndDate]);

  const setDatePreset = (preset) => {
    const today = new Date().toISOString().split('T')[0];
    if (preset === 'hoje') {
      setFilterStartDate(today);
      setFilterEndDate(today);
    } else if (preset === 'ontem') {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      setFilterStartDate(yesterdayStr);
      setFilterEndDate(yesterdayStr);
    } else if (preset === 'limpar') {
      setFilterStartDate('');
      setFilterEndDate('');
    }
  };

  // Detector de Finalização do Lote
  useEffect(() => {
    if (prevIsRunningRef.current === true && status.isRunning === false) {
      // O processo parou. Vamos verificar se foi por finalização
      const pendingReady = status.history.filter(i => i.status === 'pending' && i.is_ready === true).length;
      if (pendingReady === 0) {
        showToast('✅ Lote Finalizado! Todos os contatos revisados foram enviados.');
        playPing(); // Toca o som para avisar que acabou
      }
    }
    prevIsRunningRef.current = status.isRunning;
  }, [status.isRunning, status.history]);

  // 🔔 Gerenciador de Notificações Ativas
  useEffect(() => {
    if (!lastProcessedItem) return;
    if (lastProcessedItem.ticketID === lastAutoOpenedTicketRef.current) return;

    // Registra como processado para não repetir
    lastAutoOpenedTicketRef.current = lastProcessedItem.ticketID;

    // Adiciona à lista de notificações (pode empilhar se estiver ausente)
    setActiveNotifications(prev => [...prev, lastProcessedItem]);

    // Toca o alerta sonoro
    playPing();
  }, [lastProcessedItem]);

  const closeNotification = (ticketID) => {
    setActiveNotifications(prev => prev.filter(n => n.ticketID !== ticketID));
  };

  const handleNotificationAction = (item) => {
    // 1. Prepara texto
    let internalComment = item.comment || item.Comentário || item.comentario_interno || '';
    const displayTicketID = item.shortID || item.ticketID;
    if (displayTicketID) {
      internalComment += `\n${displayTicketID}`;
    }

    // 2. Copia para clipboard (funciona 100% pois é via clique direto)
    navigator.clipboard.writeText(internalComment)
      .then(() => {
        setToast('✅ Copiado e abrindo link...');
        setTimeout(() => setToast(''), 3000);
      })
      .catch(err => console.error('Erro ao copiar:', err));

    // 3. Abre link
    const finalUserId = item.casino_user_id || item.ID || item['User ID'];
    const brandName = item.brand || 'RoyalSpins';
    const brandConf = config.brands?.[brandName] || { baseUrl: 'https://a.RoyalSpins.com' };
    const generatedCommentUrl = finalUserId ? `${brandConf.baseUrl}/user/usercomments/${finalUserId}?userId=${finalUserId}&needFilter=true` : '';
    const link = item.link_comentario || item.comment_url || generatedCommentUrl;
    if (link) {
      window.open(link, '_blank');
    }

    // 4. Remove a notificação da tela
    closeNotification(item.ticketID);
  };


  const handleConfigSave = async () => {
    try {
      const res = await fetch(`${API_BASE}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      if (res.ok) {
        showToast('✅ Configurações salvas!');
        fetchStatus();
      }
    } catch (err) {
      console.error("Erro ao salvar config:", err);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!uploadCategory) {
      alert("Por favor, selecione uma Categoria (VIP ou Potential VIP) antes de fazer o upload.");
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', uploadCategory);
    formData.append('brand', uploadBrand);

    try {
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Carregado: ${data.addedCount} novos (Total: ${data.total})`);
      }
    } catch (err) {
      alert("Erro no upload do arquivo.");
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const triggerUploadClick = () => {
    if (!uploadCategory) {
      alert("Selecione a Categoria primeiro!");
      return;
    }
    fileInputRef.current.click();
  };

  const handleStart = async () => {
    // 1. Verificar quantos estão marcados como PRONTO na fila para a marca ativa
    const readyToProcess = status.history.filter(i => 
      i.status === 'pending' && 
      i.is_ready === true && 
      (activeBrand === 'All' || (i.brand || 'RoyalSpins') === activeBrand)
    );
    const readyCount = readyToProcess.length;

    if (readyCount === 0) {
      alert("⚠️ Não há contatos marcados como 'Ok' para processar.\n\nPor favor, revise os contatos e marque o checkbox 'Ok' na coluna da esquerda.");
      return;
    }

    // 2. Confirmação de segurança
    const message = `🚀 Deseja iniciar o disparo automático para ${readyCount} contatos marcados como 'Ok'?\n\n(Apenas os itens revisados serão enviados)`;
    if (!window.confirm(message)) return;

    try {
      const res = await fetch(`${API_BASE}/start`, { method: 'POST' });
      const data = await res.json();
      if (!data.success) {
        alert(data.message || "Erro ao iniciar.");
      } else {
        showToast("🚀 Disparos iniciados!");
      }
    } catch (e) {
      alert("Erro ao comunicar com o servidor. Verifique se o backend está rodando.");
    }
  };

  const handlePause = async () => {
    try {
      await fetch(`${API_BASE}/pause`, { method: 'POST' });
      showToast("Pausado!");
    } catch (e) { }
  };

  const handleAuditoria = () => {
    if (!status.currentItem) return;
    handleAuditoriaItem(status.currentItem);
  };

  const handleAuditoriaItem = (item) => {
    if (!item) return;

    const commentText = item.comment || item.Comentário || item.comentario_interno || '';
    const finalUserId = item.casino_user_id || item.ID || item['User ID'];
    const brandName = item.brand || 'RoyalSpins';
    const brandConf = config.brands?.[brandName] || { baseUrl: 'https://a.RoyalSpins.com' };
    const generatedCommentUrl = finalUserId ? `${brandConf.baseUrl}/user/usercomments/${finalUserId}?userId=${finalUserId}&needFilter=true` : '';
    const link = item.comment_url || item.link_comentario || generatedCommentUrl;
    
    let copyText = commentText;
    const displayTicketID = item.shortID || item.ticketID;
    if (displayTicketID) {
      copyText += `\n${displayTicketID}`;
    }

    if (copyText) {
      navigator.clipboard.writeText(copyText)
        .then(() => showToast('Comentário e Link copiados!'))
        .catch(err => console.error('Erro ao copiar', err));
    }

    if (link) {
      window.open(link, '_blank');
    }
  };

  const handleDeleteItem = async (uuid) => {
    if (!window.confirm("Certeza que deseja excluir este item PENDENTE da fila?")) return;
    try {
      const res = await fetch(`${API_BASE}/queue/${uuid}`, { method: 'DELETE' });
      if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Server returned ${res.status}: ${txt}`);
      }
      const data = await res.json();
      if (data.error) showToast(data.error);
      else {
        showToast('Item removido com sucesso!');
        fetchStatus();
      }
    } catch (e) {
      console.error("Delete Error:", e);
      alert("Erro ao excluir detalhado: " + e.message);
    }
  };
  const handleSaveCRM = async () => {
    if (!editingItem) return;
    try {
      const res = await fetch(`${API_BASE}/queue/${editingItem.uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject: editSubject, body: editBody, comment: editComment, email: editEmail, is_ready: true })
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Alterações salvas no CRM!');
        setEditingItem(null);
        fetchStatus();
      } else {
        alert(data.message || 'Erro ao salvar alterações');
      }
    } catch (err) {
      console.error("Erro fetch CRM:", err);
      alert('Erro de conexão ao salvar no CRM. Detalhes: ' + err.message);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualContact.casino_user_id || !manualContact.to_email || !manualContact.subject || !manualContact.body || !manualContact.category) {
      alert("Por favor, preencha todos os campos obrigatórios.");
      return;
    }

    if (!validateId(manualContact.casino_user_id)) {
      alert("❌ O ID do Jogador deve conter apenas números.");
      return;
    }

    if (!validateEmail(manualContact.to_email)) {
      alert("❌ O E-mail inserido é inválido (deve conter @).");
      return;
    }

    setIsSubmittingManual(true);
    try {
      const res = await fetch(`${API_BASE}/queue/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(manualContact)
      });
      const data = await res.json();
      if (data.success) {
        showToast('✅ Contato adicionado com sucesso!');
        setManualContact(prev => ({
          ...prev,
          rawText: '',
          casino_user_id: '',
          to_email: '',
          // Mantemos subject, body e comment para o próximo uso
        }));
        fetchStatus();
      } else {
        alert(data.message || 'Erro ao adicionar contato');
      }
    } catch (err) {
      console.error("Erro manual submit:", err);
      alert('Erro de conexão ao adicionar contato.');
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const handleBatchManualSubmit = async (e) => {
    e.preventDefault();
    if (parsedContacts.length === 0) {
      alert("⚠️ Nenhum contato válido identificado no texto colado.");
      return;
    }
    if (!batchManual.subject || !batchManual.body || !batchManual.category) {
      alert("Por favor, preencha o Template (Assunto, Corpo e Categoria).");
      return;
    }

    setIsSubmittingBatch(true);
    try {
      const res = await fetch(`${API_BASE}/queue/batch-manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contacts: parsedContacts,
          subject: batchManual.subject,
          body: batchManual.body,
          comment: batchManual.comment,
          category: batchManual.category,
          brand: batchManual.brand
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ${data.message}`);
        setBatchManual(prev => ({
          ...prev,
          rawText: '',
          // Mantemos subject, body e comment para o próximo uso
        }));
        setParsedContacts([]);
        fetchStatus();
      } else {
        alert(data.message || 'Erro ao adicionar contatos');
      }
    } catch (err) {
      console.error("Erro batch manual submit:", err);
      alert('Erro de conexão ao adicionar contatos.');
    } finally {
      setIsSubmittingBatch(false);
    }
  };

  const handleToggleReady = async (item) => {
    // Optimistic Update
    const oldStatus = !!item.is_ready;
    const newStatus = !oldStatus;
    
    // Update local state immediately for better UI feel
    setStatus(prev => ({
      ...prev,
      history: prev.history.map(h => 
        String(h.uuid) === String(item.uuid) ? { ...h, is_ready: newStatus } : h
      )
    }));

    if (newStatus) {
      setSelectedToDelete(prev => prev.filter(id => String(id) !== String(item.uuid)));
    }

    try {
      const res = await fetch(`${API_BASE}/queue/${item.uuid}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_ready: newStatus })
      });
      if (res.ok) {
        // Sync with server state
        fetchStatus();
      } else {
        // Rollback if failed
        fetchStatus();
      }
    } catch (err) {
      console.error("Erro ao alternar status de pronto:", err);
      fetchStatus();
    }
  };

  const handleBatchReady = async (ready) => {
    try {
      const res = await fetch(`${API_BASE}/queue/batch-ready`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category: filterCategory, ready })
      });
      if (res.ok) {
        showToast(`✅ Lote marcado como ${ready ? 'Revisado' : 'Não Revisado'}`);
        fetchStatus();
      }
    } catch (err) {
      console.error("Erro no batch ready:", err);
    }
  };

  const handleToggleDelete = (uuid, isReady) => {
    if (isReady) return; 
    setSelectedToDelete(prev => 
      prev.includes(uuid) ? prev.filter(id => String(id) !== String(uuid)) : [...prev, uuid]
    );
  };

  const handleSelectAllToDelete = () => {
    // Only select items that are NOT ready (since ready items cannot be deleted in batch)
    const itemsToSelect = pendingItems.filter(i => !i.is_ready).map(i => i.uuid);
    
    if (selectedToDelete.length === itemsToSelect.length) {
      setSelectedToDelete([]);
    } else {
      setSelectedToDelete(itemsToSelect);
    }
  };

  const handleWipeDatabase = async () => {
    const pendingIds = (status.history || []).filter(i => i.status === 'pending').map(i => i.uuid);
    if (!pendingIds.length) return showToast('Nenhum pendente.');
    if (!window.confirm(`Tem certeza que deseja apagar TODOS os ${pendingIds.length} pendentes do banco?`)) return;

    showToast('Limpando a fila pendente item por item, aguarde...');
    for (let id of pendingIds) {
      try {
        await fetch(`${API_BASE}/queue/${id}`, { method: 'DELETE' });
      } catch (e) {
        console.error(e);
      }
    }
    showToast('✅ Limpeza total concluída!');
    fetchStatus();
  };

  const handleBatchDelete = async () => {
    if (selectedToDelete.length === 0) return;
    if (!window.confirm(`Tem certeza que deseja excluir ${selectedToDelete.length} itens selecionados?`)) return;

    try {
      const res = await fetch(`${API_BASE}/queue/batch-delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uuids: selectedToDelete })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`✅ ${data.message}`);
        setSelectedToDelete([]);
        fetchStatus();
      } else {
        alert(data.message || 'Erro ao excluir');
      }
    } catch (e) {
      alert("Erro ao excluir. Verifique a conexão com o backend.");
    }
  };

  const openPlayerScreens = (item) => {
    const userId = item.casino_user_id || item.ID || item['User ID'];
    const brandName = item.brand || 'RoyalSpins';
    const brandConf = config.brands?.[brandName] || { baseUrl: 'https://a.RoyalSpins.com' };
    
    const generatedCommentUrl = userId ? `${brandConf.baseUrl}/user/usercomments/${userId}?userId=${userId}&needFilter=true` : '';
    const urls = [
      userId ? `${brandConf.baseUrl}/user2/details/${userId}` : '',
      item.comment_url || item.link_comentario || generatedCommentUrl,
      userId ? `${brandConf.baseUrl}/bonusesNew/userBonuses/${userId}` : ''
    ];
    
    urls.forEach(url => {
      if (url) window.open(url, '_blank');
    });
  };

  const exportToCSV = () => {
    if (!status.history || status.history.length === 0) {
      showToast('Nenhum histórico para exportar.');
      return;
    }

    const headers = ['User ID', 'Profile', 'Comments Link', 'Category', 'Contact Method', 'Action', 'Data Envio'];

    const csvContent = [
      headers.join(';'),
      ...filteredHistory.map(item => {
        const userId = item.casino_user_id || item.ID || item['User ID'] || '';
        const brandName = item.brand || 'RoyalSpins';
        const brandConf = config.brands?.[brandName] || { baseUrl: 'https://a.RoyalSpins.com' };

        const profileURL = userId ? `${brandConf.baseUrl}/user2/details/${userId}` : '';
        const generatedCommentUrl = userId ? `${brandConf.baseUrl}/user/usercomments/${userId}?userId=${userId}&needFilter=true` : '';
        const commentURL = item.comment_url || item.link_comentario || generatedCommentUrl;
        const cat = item.category || 'N/A';
        
        // Mapeamento para as colunas solicitadas
        const profileCell = profileURL; // Apenas a URL como solicitado no padrão Profile
        const commentCell = commentURL; 
        const displayTicketID = item.shortID || item.ticketID;
        const contactMethod = displayTicketID ? `https://app.helpdesk.com/tickets/${displayTicketID}` : '-';
        
        // Colocar o comentário na coluna de Ação
        let commentText = item.comment || item.Comentário || item.comentario_interno || "Proactive Reply";
        // Limpar possíveis quebras de linha e aspas para não quebrar o CSV
        const action = commentText.replace(/"/g, '""').replace(/\n/g, ' ');

        const sentDate = item.dispatchedAt ? new Date(item.dispatchedAt).toLocaleString() : '-';

        return `"${userId}";"${profileCell}";"${commentCell}";"${cat}";"${contactMethod}";"${action}";"${sentDate}"`;
      })
    ].join('\n');

    const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Aniksi_Export_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleSort = async (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') direction = 'desc';
    setSortConfig({ key, direction });

    const pending = (status.history || []).filter(i => i.status === 'pending');
    
    // Se a chave for de histórico, apenas setamos o estado para o filtro local
    if (key === 'dispatchedAt') return;

    pending.sort((a, b) => {
      // SEMPRE manter contatos manuais no TOPO
      if (a.isManual && !b.isManual) return -1;
      if (!a.isManual && b.isManual) return 1;

      let valA = 0, valB = 0;
      if (key === 'inactive') {
        const da = a.days_inactive !== undefined ? a.days_inactive : a['Inativo (dias)'];
        const db = b.days_inactive !== undefined ? b.days_inactive : b['Inativo (dias)'];
        valA = Number(da) || 0;
        valB = Number(db) || 0;
      } else if (key === 'deposits') {
        const da = a.deposits_amount !== undefined ? a.deposits_amount : a.Depósitos;
        const db = b.deposits_amount !== undefined ? b.deposits_amount : b.Depósitos;
        valA = Number(da) || 0;
        valB = Number(db) || 0;
      }
      return direction === 'asc' ? valA - valB : valB - valA;
    });

    const order = pending.map(i => i.uuid);

    try {
      await fetch(`${API_BASE}/queue/reorder`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order })
      });
      fetchStatus();
    } catch (err) {
      console.error("Erro ao reordenar:", err);
    }
  };

  const filteredHistory = (status.history || []).filter(item => {
    // Filtro por marca ativa
    if (activeBrand !== 'All' && (item.brand || 'RoyalSpins') !== activeBrand) return false;

    // Apenas contatos disparados (completed) aparecem no histórico por padrão
    if (item.status !== 'completed') return false;

    let matchesCat = filterCategory === 'All' || item.category === filterCategory;
    let matchesDate = true;
    if (item.dispatchedAt) {
      const d = item.dispatchedAt.split('T')[0];
      if (filterStartDate && d < filterStartDate) matchesDate = false;
      if (filterEndDate && d > filterEndDate) matchesDate = false;
    } else if (filterStartDate || filterEndDate) {
      matchesDate = false;
    }
    return matchesCat && matchesDate;
  });

  if (sortConfig.key === 'dispatchedAt') {
    filteredHistory.sort((a, b) => {
      const dateA = a.dispatchedAt ? new Date(a.dispatchedAt).getTime() : 0;
      const dateB = b.dispatchedAt ? new Date(b.dispatchedAt).getTime() : 0;
      return sortConfig.direction === 'asc' ? dateA - dateB : dateB - dateA;
    });
  }

  // Cálculos Dinâmicos para Dashboard (baseados no filtro)
  const dynamicStats = filteredHistory.reduce((acc, item) => {
    const isVip = item.category === 'VIP';
    const isCompleted = item.status === 'completed';
    if (isVip) {
      acc.vipTotal++;
      if (isCompleted) acc.vipCompleted++;
    } else if (item.category === 'Potential VIP') {
      acc.potentialTotal++;
      if (isCompleted) acc.potentialCompleted++;
    }
    return acc;
  }, { vipTotal: 0, vipCompleted: 0, potentialTotal: 0, potentialCompleted: 0 });

  const allGlobalPending = (status.history || []).filter(i => i.status === 'pending');
  const globalPendingCount = allGlobalPending.length;
  const globalReadyCount = allGlobalPending.filter(i => i.is_ready).length;
  
  // Breakdown para Fila Global
  const lgPendingGlobal = allGlobalPending.filter(i => (i.brand || 'RoyalSpins') === 'RoyalSpins').length;
  const ofPendingGlobal = allGlobalPending.filter(i => (i.brand || 'RoyalSpins') === 'MegaJackpot').length;

  // Breakdown para VIPs Pendentes
  const vipPending = allGlobalPending.filter(i => i.category === 'VIP');
  const lgVipPending = vipPending.filter(i => (i.brand || 'RoyalSpins') === 'RoyalSpins').length;
  const ofVipPending = vipPending.filter(i => (i.brand || 'RoyalSpins') === 'MegaJackpot').length;

  // Breakdown para Potential Pendentes
  const potentialPending = allGlobalPending.filter(i => i.category === 'Potential VIP');
  const lgPotPending = potentialPending.filter(i => (i.brand || 'RoyalSpins') === 'RoyalSpins').length;
  const ofPotPending = potentialPending.filter(i => (i.brand || 'RoyalSpins') === 'MegaJackpot').length;

  const intervalSeconds = config?.interval || 300;
  const remainingTimeHours = ((globalReadyCount * intervalSeconds) / 3600).toFixed(2);

  // Cálculo de Concluídos HOJE (Dinâmico)
  const todayStr = new Date().toISOString().split('T')[0];
  const itemsCompletedToday = (status.history || []).filter(i => 
    i.status === 'completed' && i.dispatchedAt && i.dispatchedAt.startsWith(todayStr)
  );
  const todayTotal = itemsCompletedToday.length;
  const todayLG = itemsCompletedToday.filter(i => (i.brand || 'RoyalSpins') === 'RoyalSpins').length;
  const todayOF = itemsCompletedToday.filter(i => (i.brand || 'RoyalSpins') === 'MegaJackpot').length;

  // Lógica de Paginação (History)
  const filteredTotal = filteredHistory.length;
  const totalPages = Math.ceil(filteredTotal / itemsPerPage);
  const paginatedHistory = filteredHistory.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const pendingItems = (status.history || []).filter(i => {
    if (activeBrand !== 'All' && (i.brand || 'RoyalSpins') !== activeBrand) return false;
    let matchesCat = filterCategory === 'All' || i.category === filterCategory;
    return i.status === 'pending' && matchesCat;
  });
  
  if (sortConfig.key) {
    pendingItems.sort((a, b) => {
      // SEMPRE manter contatos manuais no TOPO
      if (a.isManual && !b.isManual) return -1;
      if (!a.isManual && b.isManual) return 1;

      let valA = 0, valB = 0;
      if (sortConfig.key === 'inactive') {
        const da = a.days_inactive !== undefined ? a.days_inactive : a['Inativo (dias)'];
        const db = b.days_inactive !== undefined ? b.days_inactive : b['Inativo (dias)'];
        valA = Number(da) || 0;
        valB = Number(db) || 0;
      } else if (sortConfig.key === 'deposits') {
        const da = a.deposits_amount !== undefined ? a.deposits_amount : a.Depósitos;
        const db = b.deposits_amount !== undefined ? b.deposits_amount : b.Depósitos;
        valA = Number(da) || 0;
        valB = Number(db) || 0;
      }
      return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
    });
  }

  const pendingTotal = pendingItems.length;
  const pendingTotalPages = Math.ceil(pendingTotal / itemsPerPage);
  const paginatedPending = pendingItems.slice(
    (currentPagePending - 1) * itemsPerPage,
    currentPagePending * itemsPerPage
  );

  return (
    <div className="app-container">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 2rem', background: 'rgba(15, 15, 26, 0.8)', backdropFilter: 'blur(10px)', borderBottom: '1px solid rgba(255,255,255,0.05)', position: 'sticky', top: 0, zIndex: 1000 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.8rem' }}>
          <h1 style={{ margin: 0, fontSize: '1.8rem', background: 'linear-gradient(90deg, #ff4b4b, #ffb86c)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>ANIKSI</h1>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)', fontWeight: '500' }}>VIP Bridge Multi-Brand</span>
        </div>

        <div className="header-brand-selector" style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '4px', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
          <button 
            className={`header-brand-btn ${activeBrand === 'All' ? 'active' : ''}`}
            onClick={() => setActiveBrand('All')}
            style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', background: activeBrand === 'All' ? '#ff4b4b' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.3s' }}
          >
            Todas as Marcas
          </button>
          <button 
            className={`header-brand-btn ${activeBrand === 'RoyalSpins' ? 'active' : ''}`}
            onClick={() => setActiveBrand('RoyalSpins')}
            style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', background: activeBrand === 'RoyalSpins' ? '#2ecc71' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.3s' }}
          >
            RoyalSpins
          </button>
          <button 
            className={`header-brand-btn ${activeBrand === 'MegaJackpot' ? 'active' : ''}`}
            onClick={() => setActiveBrand('MegaJackpot')}
            style={{ padding: '0.5rem 1.2rem', borderRadius: '8px', border: 'none', background: activeBrand === 'MegaJackpot' ? '#00b0ff' : 'transparent', color: 'white', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 'bold', transition: 'all 0.3s' }}
          >
            Odin Fortune
          </button>
        </div>

        <div className="header-status" style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '6px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <div className={`status-dot ${status.isRunning ? 'running' : 'paused'}`} style={{ width: '8px', height: '8px', borderRadius: '50%', background: status.isRunning ? '#50fa7b' : '#ff5555', boxShadow: status.isRunning ? '0 0 10px #50fa7b' : 'none' }}></div>
            <span style={{ fontSize: '0.85rem', fontWeight: '600', color: status.isRunning ? '#50fa7b' : '#ff5555' }}>
              {status.isRunning ? 'SISTEMA ONLINE' : 'SISTEMA EM PAUSA'}
            </span>
          </div>
        </div>
      </header>

      <main className="main-content">
        <section className="glass-panel top-controls" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '2rem', flexWrap: 'wrap' }}>
          <div className="panel-title" style={{ marginRight: 'auto' }}>⚙️ Painel de Controle</div>

          <div style={{ display: 'flex', gap: '0.8rem' }}>
            <button className="btn secondary" onClick={() => handleBatchReady(true)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem' }}>
              ✔️ Marcar Todos Revisado
            </button>
            <button className="btn secondary" onClick={() => handleBatchReady(false)} style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#ff4b4b' }}>
              ❌ Limpar Revisados
            </button>
          </div>

          <div className="input-group" style={{ flex: 1, minWidth: '180px' }}>
            <label>Site/Marca (CSV) *</label>
            <select
              value={uploadBrand}
              onChange={(e) => setUploadBrand(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', background: '#0F0F1A', border: '1px solid #2e2e48', borderRadius: '8px', color: 'white' }}
            >
              <option value="RoyalSpins">RoyalSpins</option>
              <option value="MegaJackpot">Odin Fortune</option>
            </select>
          </div>

          <div className="input-group" style={{ flex: 1, minWidth: '180px' }}>
            <label>Categoria (CSV) *</label>
            <select
              value={uploadCategory}
              onChange={(e) => setUploadCategory(e.target.value)}
              style={{ width: '100%', padding: '0.8rem', background: '#0F0F1A', border: '1px solid #2e2e48', borderRadius: '8px', color: 'white' }}
            >
              <option value="">-- Selecione --</option>
              <option value="VIP">VIP</option>
              <option value="Potential VIP">Potential VIP</option>
            </select>
          </div>

          <div
            className="file-upload-horizontal"
            onClick={triggerUploadClick}
            style={{ border: '2px dashed var(--panel-border)', borderRadius: '12px', padding: '0.5rem 1.5rem', textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".xlsx, .csv"
              onChange={handleFileUpload}
              style={{ display: 'none' }}
            />
            <span>📁 Importar Planilha</span>
          </div>

          <div className="input-group" style={{ flex: 1, minWidth: '300px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <label>Intervalo de Envio: <strong>{config.interval}s</strong></label>
            </div>
            <input
              type="range"
              min="125"
              max="421"
              value={config.interval}
              onChange={(e) => setConfig({ ...config, interval: Number(e.target.value) })}
              onMouseUp={handleConfigSave}
              onTouchEnd={handleConfigSave}
              style={{ width: '100%', accentColor: 'var(--accent-color)', cursor: 'pointer' }}
            />
          </div>
        </section>

        <section className="glass-panel manual-entry-panel" style={{ marginBottom: '1.5rem' }}>
          <div 
            className="panel-title" 
            onClick={() => setShowManualForm(!showManualForm)} 
            style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          >
            <span>✨ Novo Contato Individual</span>
            <span style={{ fontSize: '1rem', opacity: 0.7 }}>{showManualForm ? '🔼 Recolher' : '🔽 Expandir'}</span>
          </div>
          
          {showManualForm && (
            <form onSubmit={handleManualSubmit} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginTop: '1rem', animation: 'fadeIn 0.3s ease' }}>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Dados do Jogador (Cole o bloco do sistema aqui para preenchimento automático)</label>
                <textarea 
                  rows="4" 
                  placeholder="Cole o texto contendo 'Email:' e 'Global ID:'..."
                  value={manualContact.rawText}
                  onChange={(e) => setManualContact({...manualContact, rawText: e.target.value})}
                  style={{ width: '100%', padding: '0.8rem', background: '#0F0F1A', border: '1px solid #2e2e48', borderRadius: '8px', color: 'white', resize: 'vertical', fontSize: '0.85rem' }}
                ></textarea>
              </div>
              
              <div className="input-group">
                <label>ID do Jogador *</label>
                <input 
                  type="text" 
                  placeholder="Preenchido automaticamente..."
                  value={manualContact.casino_user_id}
                  onChange={(e) => setManualContact({...manualContact, casino_user_id: e.target.value})}
                  required
                />
              </div>
              <div className="input-group">
                <label>E-mail do Jogador *</label>
                <input 
                  type="email" 
                  placeholder="Preenchido automaticamente..."
                  value={manualContact.to_email}
                  onChange={(e) => setManualContact({...manualContact, to_email: e.target.value})}
                  required
                />
              </div>
              <div className="input-group">
                <label>Tipo de Contato *</label>
                <select 
                  value={manualContact.category}
                  onChange={(e) => setManualContact({...manualContact, category: e.target.value})}
                  required
                >
                  <option value="Potential VIP">Potential VIP</option>
                  <option value="VIP">VIP</option>
                </select>
              </div>
              <div className="input-group">
                <label>Site/Marca *</label>
                <select 
                  value={manualContact.brand}
                  onChange={(e) => setManualContact({...manualContact, brand: e.target.value})}
                  required
                >
                  <option value="RoyalSpins">RoyalSpins</option>
                  <option value="MegaJackpot">Odin Fortune</option>
                </select>
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Assunto *</label>
                <input 
                  type="text" 
                  placeholder="Assunto do ticket..."
                  value={manualContact.subject}
                  onChange={(e) => setManualContact({...manualContact, subject: e.target.value})}
                  required
                />
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Corpo da Mensagem *</label>
                <textarea 
                  rows="12" 
                  placeholder="Cole o corpo do e-mail aqui..."
                  value={manualContact.body}
                  onChange={(e) => setManualContact({...manualContact, body: e.target.value})}
                  required
                  style={{ width: '100%', padding: '0.8rem', background: '#0F0F1A', border: '1px solid #2e2e48', borderRadius: '8px', color: 'white', resize: 'vertical' }}
                ></textarea>
              </div>
              <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                <label>Comentário Interno (CRM)</label>
                <input 
                  type="text" 
                  placeholder="Ex: d2 - tried to call and no answer..."
                  value={manualContact.comment}
                  onChange={(e) => setManualContact({...manualContact, comment: e.target.value})}
                />
              </div>
              <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'flex-end' }}>
                <button type="submit" className="btn primary" disabled={isSubmittingManual} style={{ padding: '0.8rem 2.5rem' }}>
                  {isSubmittingManual ? 'Adicionando...' : '➕ Adicionar à Fila'}
                </button>
              </div>
            </form>
          )}
        </section>

        {/* Removido: Novo Contato em Lote */}

        <section className="glass-panel main-panel" style={{ display: 'flex', flexDirection: 'column' }}>
          <div className="tabs" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
            <button
              style={{ flex: 1, padding: '1rem', background: activeTab === 'dashboard' ? '#ff4b4b' : 'transparent', border: '1px solid #ff4b4b', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button
              style={{ flex: 1, padding: '1rem', background: activeTab === 'history' ? '#ff4b4b' : 'transparent', border: '1px solid #ff4b4b', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => setActiveTab('history')}
            >
              Histórico
            </button>
            <button
              style={{ flex: 1, padding: '1rem', background: activeTab === 'config' ? '#ff4b4b' : 'transparent', border: '1px solid #ff4b4b', color: 'white', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold' }}
              onClick={() => setActiveTab('config')}
            >
              Configurações
            </button>
          </div>

          <div className="tab-content" style={{ flex: 1 }}>
            {activeTab === 'config' && (
              <div className="config-tab-container">
                <div className="config-grid">
                  {Object.keys(config.brands).map(brandName => (
                    <div key={brandName} className="config-card glass-panel">
                      <div className="panel-title">⚙️ Configurações: {brandName}</div>
                      <div className="form-group">
                        <label>Team ID (VIP)</label>
                        <input
                          type="text"
                          value={config.brands[brandName].teamVIP}
                          onChange={(e) => {
                            const newBrands = { ...config.brands };
                            newBrands[brandName].teamVIP = e.target.value;
                            setConfig({ ...config, brands: newBrands });
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Team ID (Potential)</label>
                        <input
                          type="text"
                          value={config.brands[brandName].teamPotential}
                          onChange={(e) => {
                            const newBrands = { ...config.brands };
                            newBrands[brandName].teamPotential = e.target.value;
                            setConfig({ ...config, brands: newBrands });
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Tag ID</label>
                        <input
                          type="text"
                          value={config.brands[brandName].tagID}
                          onChange={(e) => {
                            const newBrands = { ...config.brands };
                            newBrands[brandName].tagID = e.target.value;
                            setConfig({ ...config, brands: newBrands });
                          }}
                        />
                      </div>
                      <div className="form-group">
                        <label>Base URL (Admin Panel)</label>
                        <input
                          type="text"
                          value={config.brands[brandName].baseUrl}
                          onChange={(e) => {
                            const newBrands = { ...config.brands };
                            newBrands[brandName].baseUrl = e.target.value;
                            setConfig({ ...config, brands: newBrands });
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="config-card glass-panel global-config" style={{ marginTop: '2rem' }}>
                  <div className="panel-title">🌍 Configurações Globais</div>
                  <div className="form-group">
                    <label>Intervalo entre envios (segundos)</label>
                    <input
                      type="number"
                      value={config.interval}
                      onChange={(e) => setConfig({ ...config, interval: Number(e.target.value) })}
                    />
                  </div>
                  <button className="btn primary" onClick={handleConfigSave}>Salvar Todas as Configurações</button>
                </div>
              </div>
            )}

            {activeTab === 'dashboard' && (
              <>
                <div className="panel-title">📈 Analytics de Outreach & Performance</div>

                <div className="metrics-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
                  <div className="metric-card" style={{ borderLeft: '4px solid #6272a4', background: 'rgba(98, 114, 164, 0.05)' }}>
                    <span className="metric-label">📋 Fila Global</span>
                    <span className="metric-value">{globalPendingCount}</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', display: 'inline-block', fontWeight: 'bold' }}>
                      <span style={{ color: '#50fa7b' }}>LG: {lgPendingGlobal}</span> | <span style={{ color: '#8be9fd' }}>OF: {ofPendingGlobal}</span>
                    </div>
                  </div>

                  <div className="metric-card" style={{ borderLeft: '4px solid #ffb86c', background: 'rgba(255, 184, 108, 0.05)' }}>
                    <span className="metric-label">🔥 Pendentes VIP</span>
                    <span className="metric-value">{vipPending.length}</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', display: 'inline-block', fontWeight: 'bold' }}>
                      <span style={{ color: '#50fa7b' }}>LG: {lgVipPending}</span> | <span style={{ color: '#8be9fd' }}>OF: {ofVipPending}</span>
                    </div>
                  </div>

                  <div className="metric-card" style={{ borderLeft: '4px solid #ff79c6', background: 'rgba(255, 121, 198, 0.05)' }}>
                    <span className="metric-label">⚡ Pendentes Potential</span>
                    <span className="metric-value">{potentialPending.length}</span>
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginTop: '8px', padding: '6px 10px', background: 'rgba(0,0,0,0.2)', borderRadius: '4px', display: 'inline-block', fontWeight: 'bold' }}>
                      <span style={{ color: '#50fa7b' }}>LG: {lgPotPending}</span> | <span style={{ color: '#8be9fd' }}>OF: {ofPotPending}</span>
                    </div>
                  </div>

                  <div className="metric-card" style={{ borderLeft: '4px solid #50fa7b', background: 'rgba(80, 250, 123, 0.05)' }}>
                    <span className="metric-label">🚀 Pronto p/ Envio</span>
                    <span className="metric-value" style={{ color: '#50fa7b' }}>{globalReadyCount}</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '500' }}>Aguardando "Iniciar"</span>
                  </div>

                  <div className="metric-card" style={{ borderLeft: '4px solid #f1fa8c', background: 'rgba(241, 250, 140, 0.05)' }}>
                    <span className="metric-label">⏱️ Tempo Est.</span>
                    <span className="metric-value" style={{ color: '#f1fa8c' }}>{remainingTimeHours}h</span>
                    <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginTop: '6px', fontWeight: '500' }}>Para conclusão total</span>
                  </div>
                </div>

                <div className="metrics-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
                  <div className="metric-card" style={{ borderLeft: '4px solid #bd93f9', background: 'rgba(189, 147, 249, 0.05)', display: 'flex', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span className="metric-label">✅ Concluídos Hoje (Total)</span>
                      <span className="metric-value" style={{ fontSize: '2.2rem', marginTop: '10px' }}>{todayTotal}</span>
                    </div>
                    <div style={{ textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-muted)', paddingLeft: '1.5rem', borderLeft: '1px solid rgba(255,255,255,0.1)' }}>
                      <div style={{ marginBottom: '4px' }}>RoyalSpins: <strong style={{ color: '#50fa7b' }}>{todayLG}</strong></div>
                      <div>MegaJackpot: <strong style={{ color: '#8be9fd' }}>{todayOF}</strong></div>
                    </div>
                  </div>
                </div>


                {!status.isRunning ?
                  (
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                      <button
                        className="btn primary"
                        onClick={handleStart}
                        disabled={status.total === 0 || status.remaining === 0}
                      >
                        🚀 INICIAR DISPAROS PROATIVOS
                      </button>
                      <button
                        className="btn tooltip-btn"
                        style={{ padding: '0.8rem 1.2rem', background: 'transparent', border: '1px solid #ff4b4b', color: '#ff4b4b', borderRadius: '8px', cursor: selectedToDelete.length === 0 ? 'not-allowed' : 'pointer', opacity: selectedToDelete.length === 0 ? 0.5 : 1 }}
                        onClick={handleBatchDelete}
                        disabled={selectedToDelete.length === 0}
                        title="Excluir selecionados na coluna Del"
                      >
                        🗑️ Excluir Selecionados ({selectedToDelete.length})
                      </button>
                    </div>
                  ) : (
                    <button
                      className="btn primary"
                      style={{ background: '#ff9800' }}
                      onClick={handlePause}
                    >
                      ⏸ PAUSAR OPERAÇÃO
                    </button>
                  )
                }

                <div className="crm-section" style={{ marginTop: '2rem' }}>
                  <div className="panel-title">👥 Fila de Contatos (CRM)</div>
                  <div className="table-responsive" style={{ marginTop: '1rem', overflowX: 'auto', maxHeight: '500px' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                      <thead>
                        <tr style={{ borderBottom: '2px solid #2e2e48', position: 'sticky', top: 0, background: '#1A1A2E', zIndex: 10 }}>
                          <th style={{ padding: '1rem', color: '#ff5555', width: '70px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                            <input 
                              type="checkbox" 
                              onChange={handleSelectAllToDelete} 
                              checked={pendingItems.length > 0 && pendingItems.filter(i => !i.is_ready).every(i => selectedToDelete.includes(i.uuid))}
                              style={{ cursor: 'pointer', accentColor: '#ff5555' }}
                            />
                            Del
                          </th>
                          <th style={{ padding: '1rem', color: '#ffb86c', width: '50px' }}>Ok</th>
                          <th style={{ padding: '1rem', color: '#ffb86c', width: '60px' }}>Site</th>
                          <th style={{ padding: '1rem', color: '#ffb86c', width: '120px' }}>Jogador</th>
                          <th 
                            style={{ 
                              padding: '0.6rem 1rem', 
                              color: sortConfig.key === 'inactive' ? '#fff' : '#ffb86c', 
                              width: '80px', 
                              cursor: 'pointer', 
                              whiteSpace: 'nowrap',
                              background: sortConfig.key === 'inactive' ? 'rgba(255, 184, 108, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 184, 108, 0.3)',
                              borderRadius: '6px',
                              userSelect: 'none',
                              textAlign: 'center'
                            }}
                            onClick={() => handleSort('inactive')}
                            title="Clique para ordenar (Ascendente/Descendente)"
                          >
                            Inativo {sortConfig.key === 'inactive' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                          </th>
                          <th 
                            style={{ 
                              padding: '0.6rem 1rem', 
                              color: sortConfig.key === 'deposits' ? '#fff' : '#ffb86c', 
                              width: '100px', 
                              cursor: 'pointer', 
                              whiteSpace: 'nowrap',
                              background: sortConfig.key === 'deposits' ? 'rgba(255, 184, 108, 0.2)' : 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid rgba(255, 184, 108, 0.3)',
                              borderRadius: '6px',
                              userSelect: 'none',
                              textAlign: 'center'
                            }}
                            onClick={() => handleSort('deposits')}
                            title="Clique para ordenar (Ascendente/Descendente)"
                          >
                            Depósitos {sortConfig.key === 'deposits' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                          </th>
                          <th style={{ padding: '1rem', color: '#ffb86c', width: '100px' }}>Saques</th>
                          <th style={{ padding: '1rem', color: '#ffb86c', width: '80px' }}>Bônus</th>
                          <th style={{ padding: '1rem', color: '#ffb86c', width: '100px' }}>Avg Bet</th>
                          <th style={{ padding: '1rem', color: '#ffb86c', maxWidth: '150px' }}>Assunto</th>
                          <th style={{ padding: '1rem', color: '#ffb86c', maxWidth: '200px' }}>Corpo</th>
                          <th style={{ padding: '1rem', color: '#ffb86c', maxWidth: '150px' }}>Comentário</th>
                          <th style={{ padding: '1rem', color: '#ffb86c', width: '150px' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginatedPending.map((item, idx) => (
                          <tr key={idx} style={{ 
                            borderBottom: '1px solid #2e2e48', 
                            background: item.is_ready ? 'rgba(80, 250, 123, 0.08)' : 'rgba(255,255,255,0.02)',
                            transition: 'all 0.2s'
                          }}>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={selectedToDelete.includes(item.uuid)} 
                                disabled={!!item.is_ready}
                                onChange={() => handleToggleDelete(item.uuid, item.is_ready)}
                                style={{ width: '18px', height: '18px', cursor: item.is_ready ? 'not-allowed' : 'pointer', accentColor: '#ff5555' }}
                                title={item.is_ready ? "Desmarque o 'Ok' primeiro para excluir" : "Marcar para exclusão"}
                              />
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              <input 
                                type="checkbox" 
                                checked={!!item.is_ready} 
                                onChange={() => handleToggleReady(item)}
                                style={{ width: '26px', height: '26px', cursor: 'pointer', accentColor: '#50fa7b' }}
                              />
                            </td>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              {(item.brand === 'MegaJackpot' || item.brand === 'OF') ? (
                                <span className="brand-badge of">OF</span>
                              ) : (
                                <span className="brand-badge lg">LG</span>
                              )}
                            </td>
                            <td style={{ padding: '1rem', maxWidth: '120px' }}>
                              <div style={{ fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.to_email || item.Email || item.email || item.username || item.Jogador || item.nome}>{item.to_email || item.Email || item.email || item.username || item.Jogador || item.nome}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                {item.isManual && <span title="Adicionado Manualmente" style={{ color: '#ffb86c', marginRight: '4px' }}>✨</span>}
                                ID: {item.casino_user_id || item.ID || item['User ID']}
                              </div>
                            </td>
                            <td style={{ padding: '1rem', color: (item.days_inactive || item['Inativo (dias)']) > 14 ? '#ff5555' : 'inherit' }}>
                              {(item.days_inactive !== undefined && item.days_inactive !== '' || item['Inativo (dias)'] !== undefined && item['Inativo (dias)'] !== '') 
                                ? `${item.days_inactive !== undefined ? item.days_inactive : item['Inativo (dias)']}d` 
                                : <span style={{ color: '#ffb86c', fontWeight: 'bold' }}>M</span>}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              {(item.deposits_amount !== undefined || item.Depósitos !== undefined) ? `€${Number(item.deposits_amount !== undefined ? item.deposits_amount : item.Depósitos).toLocaleString('de-DE')}` : '-'}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              {(item.cashouts_amount !== undefined || item.Saques !== undefined) ? `€${Number(item.cashouts_amount !== undefined ? item.cashouts_amount : item.Saques).toLocaleString('de-DE')}` : '-'}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              {item.Bônus !== undefined ? item.Bônus : (item.bonus !== undefined ? item.bonus : (item.bonus_amount !== undefined ? `€${Number(item.bonus_amount).toLocaleString('de-DE')}` : '-'))}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              {(item.avg_bet !== undefined || item['Avg Bet'] !== undefined) ? `€${Number(item.avg_bet !== undefined ? item.avg_bet : item['Avg Bet']).toLocaleString('de-DE')}` : '-'}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ color: '#8be9fd', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.subject || item.Assunto}>
                                {item.subject || item.Assunto}
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ color: 'var(--text-muted)', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }} title={item.body || item.Corpo || item.email_body}>
                                {item.body || item.Corpo || item.email_body}
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ color: 'var(--text-muted)', maxWidth: '150px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.85rem' }} title={item.comment || item.Comentário || item.comentario_interno}>
                                {item.comment || item.Comentário || item.comentario_interno}
                              </div>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <div style={{ display: 'flex', gap: '0.4rem' }}>
                                <button className="btn secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem', whiteSpace: 'nowrap' }} onClick={() => openPlayerScreens(item)}>
                                  🚀 Abrir
                                </button>
                                <button className="btn secondary" style={{ padding: '0.4rem 0.6rem', fontSize: '0.8rem' }} onClick={() => {
                                  setEditingItem(item);
                                  setEditSubject(item.subject || item.Assunto || '');
                                  setEditBody(item.body || item.Corpo || item.email_body || '');
                                  setEditComment(item.comment || item.Comentário || item.comentario_interno || '');
                                  setEditEmail(item.to_email || item.Email || item.email || '');
                                }}>
                                  ✏️
                                </button>
                                <button onClick={() => handleDeleteItem(item.uuid)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.1rem' }} title="Excluir">
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                        {pendingTotal === 0 && (
                          <tr>
                            <td colSpan="11" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                              Nenhum contato pendente nesta fila.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {pendingTotalPages > 1 && (
                    <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', alignItems: 'center' }}>
                      <button
                        className="btn secondary"
                        style={{ padding: '0.5rem 1rem', width: 'auto' }}
                        disabled={currentPagePending === 1}
                        onClick={() => setCurrentPagePending(p => Math.max(1, p - 1))}
                      >
                        Anterior
                      </button>

                      <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                        Página {currentPagePending} de {pendingTotalPages} ({pendingTotal} pendentes)
                      </span>

                      <button
                        className="btn secondary"
                        style={{ padding: '0.5rem 1rem', width: 'auto' }}
                        disabled={currentPagePending === pendingTotalPages}
                        onClick={() => setCurrentPagePending(p => Math.min(pendingTotalPages, p + 1))}
                      >
                        Próxima
                      </button>
                    </div>
                  )}
                </div>

                {/* Edit Modal */}
                {editingItem && (
                  <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 10000 }}>
                    <div className="glass-panel" style={{ width: '90%', maxWidth: '600px', maxHeight: '90%', overflowY: 'auto' }}>
                      <div className="panel-title">✏️ Editar Contato: {editingItem.to_email || editingItem.Email || editingItem.email || editingItem.username}</div>
                      
                      <div className="input-group">
                        <label>E-mail do Jogador</label>
                        <input value={editEmail} onChange={(e) => setEditEmail(e.target.value)} placeholder="Digite o e-mail do jogador..." />
                      </div>

                      <div className="input-group">
                        <label>Assunto do E-mail</label>
                        <input value={editSubject} onChange={(e) => setEditSubject(e.target.value)} />
                      </div>

                      <div className="input-group">
                        <label>Corpo do E-mail</label>
                        <textarea 
                          value={editBody} 
                          onChange={(e) => setEditBody(e.target.value)} 
                          rows="12" 
                          style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: 'white', padding: '0.8rem', fontFamily: 'inherit' }}
                        />
                      </div>

                      <div className="input-group">
                        <label>Comentário Interno (HelpDesk)</label>
                        <textarea 
                          value={editComment} 
                          onChange={(e) => setEditComment(e.target.value)} 
                          rows="3" 
                          style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid var(--panel-border)', borderRadius: '8px', color: 'white', padding: '0.8rem', fontFamily: 'inherit' }}
                        />
                      </div>

                      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                        <button className="btn primary" onClick={handleSaveCRM}>Salvar Alterações</button>
                        <button className="btn secondary" onClick={() => setEditingItem(null)}>Cancelar</button>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}

            {activeTab === 'history' && (
              <>
                <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>📋 Histórico de Disparos <span style={{ fontSize: '0.9rem', color: '#ffb86c', marginLeft: '10px' }}>({filteredTotal} notificações)</span></span>
                  <button className="btn secondary" onClick={exportToCSV} style={{ padding: '0.5rem 1rem', width: 'auto' }}>
                    ⬇️ Exportar CSV
                  </button>
                </div>

                <div className="filters-container" style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', background: 'rgba(255,255,255,0.05)', padding: '1rem', borderRadius: '8px' }}>
                  <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label>Filtrar por Site</label>
                    <select
                      value={activeBrand}
                      onChange={(e) => setActiveBrand(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', background: '#0F0F1A', border: '1px solid #2e2e48', borderRadius: '88px', color: 'white' }}
                    >
                      <option value="All">Todos os Sites</option>
                      <option value="RoyalSpins">RoyalSpins</option>
                      <option value="MegaJackpot">Odin Fortune</option>
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0, flex: 1 }}>
                    <label>Filtrar por Categoria</label>
                    <select
                      value={filterCategory}
                      onChange={(e) => setFilterCategory(e.target.value)}
                      style={{ width: '100%', padding: '0.6rem', background: '#0F0F1A', border: '1px solid #2e2e48', borderRadius: '88px', color: 'white' }}
                    >
                      <option value="All">Todas</option>
                      <option value="VIP">VIP</option>
                      <option value="Potential VIP">Potential VIP</option>
                    </select>
                  </div>

                  <div className="input-group" style={{ marginBottom: 0, flex: 2 }}>
                    <label>Período de Disparo</label>
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <input
                        type="date"
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        style={{ flex: 1, background: '#0F0F1A', border: '1px solid #2e2e48', borderRadius: '8px', color: 'white', padding: '0.6rem' }}
                      />
                      <span style={{ color: 'var(--text-muted)' }}>até</span>
                      <input
                        type="date"
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        style={{ flex: 1, background: '#0F0F1A', border: '1px solid #2e2e48', borderRadius: '8px', color: 'white', padding: '0.6rem' }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.5rem' }}>
                      <button className="btn secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid #ffb86c', color: '#ffb86c' }} onClick={() => setDatePreset('hoje')}>Hoje</button>
                      <button className="btn secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid #ffb86c', color: '#ffb86c' }} onClick={() => setDatePreset('ontem')}>Ontem</button>
                      <button className="btn secondary" style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem', border: '1px solid #6272a4', color: '#6272a4' }} onClick={() => setDatePreset('limpar')}>Limpar</button>
                    </div>
                  </div>
                </div>

                <div className="table-responsive" style={{ overflowX: 'auto', maxHeight: '400px', overflowY: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '2px solid #2e2e48', position: 'sticky', top: 0, background: '#1A1A2E' }}>
                        <th style={{ padding: '1rem', color: '#ffb86c', width: '60px' }}>Site</th>
                        <th style={{ padding: '1rem', color: '#ffb86c' }}>Email</th>
                        <th style={{ padding: '1rem', color: '#ffb86c' }}>Categoria</th>
                        <th style={{ padding: '1rem', color: '#ffb86c' }}>Status</th>
                        <th style={{ padding: '1rem', color: '#ffb86c' }}>Ticket ID</th>
                        <th 
                          style={{ 
                            padding: '0.6rem 1rem', 
                            color: sortConfig.key === 'dispatchedAt' ? '#fff' : '#ffb86c', 
                            cursor: 'pointer', 
                            background: sortConfig.key === 'dispatchedAt' ? 'rgba(255, 184, 108, 0.2)' : 'transparent',
                            borderRadius: '6px',
                            userSelect: 'none'
                          }}
                          onClick={() => handleSort('dispatchedAt')}
                        >
                          Data Disparo {sortConfig.key === 'dispatchedAt' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}
                        </th>
                        <th style={{ padding: '1rem', color: '#ffb86c' }}>Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedHistory.map((item, idx) => {
                        const email = item.to_email || item.Email || item.email || '(Sem E-mail)';
                        const cat = item.category || 'N/A';
                        const st = item.status;
                        const finalUserId = item.casino_user_id || item.ID || item['User ID'];
                        let dtStr = '-';
                        if (item.dispatchedAt) dtStr = new Date(item.dispatchedAt).toLocaleString();

                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #2e2e48' }}>
                            <td style={{ padding: '1rem', textAlign: 'center' }}>
                              {(item.brand === 'MegaJackpot' || item.brand === 'OF') ? (
                                <span className="brand-badge of">OF</span>
                              ) : (
                                <span className="brand-badge lg">LG</span>
                              )}
                            </td>
                            <td style={{ padding: '1rem' }}>
                              <a 
                                href={finalUserId ? `https://a.RoyalSpins.com/user2/details/${finalUserId}` : '#'} 
                                target="_blank" 
                                rel="noreferrer" 
                                style={{ color: '#8be9fd', textDecoration: 'underline' }}
                              >
                                {email}
                              </a>
                            </td>
                            <td style={{ padding: '1rem' }}>{cat}</td>
                            <td style={{ padding: '1rem' }}>
                              <span style={{
                                padding: '4px 8px', borderRadius: '4px', fontSize: '0.85rem',
                                background: st === 'completed' ? '#50fa7b22' : '#ffb86c22',
                                color: st === 'completed' ? '#50fa7b' : '#ffb86c'
                              }}>
                                {st}
                              </span>
                            </td>
                            <td style={{ padding: '1rem' }}>
                              {item.shortID || item.ticketID ? (
                                <a href={`https://app.helpdesk.com/tickets/${item.shortID || item.ticketID}`} target="_blank" rel="noreferrer" style={{ color: '#ffb86c', textDecoration: 'underline' }}>
                                  {item.shortID || item.ticketID}
                                </a>
                              ) : '-'}
                            </td>
                            <td style={{ padding: '1rem' }}>{dtStr}</td>
                            <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', background: '#2b2b40' }} onClick={() => handleAuditoriaItem(item)}>
                                📋 Copiar & Abrir
                              </button>
                              <button className="btn" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => openPlayerScreens(item)}>
                                🚀 Abrir Tudo
                              </button>
                              {st === 'pending' && (
                                <button onClick={() => handleDeleteItem(item.uuid)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }} title="Excluir da Fila">
                                  🗑️
                                </button>
                              )}
                            </td>
                          </tr>
                        )
                      })}
                      {paginatedHistory.length === 0 && (
                        <tr><td colSpan="6" style={{ padding: '2rem', textAlign: 'center' }}>Nenhum registro encontrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', marginTop: '1.5rem', alignItems: 'center' }}>
                    <button
                      className="btn secondary"
                      style={{ padding: '0.5rem 1rem', width: 'auto' }}
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    >
                      Anterior
                    </button>

                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                      Página {currentPage} de {totalPages}
                    </span>

                    <button
                      className="btn secondary"
                      style={{ padding: '0.5rem 1rem', width: 'auto' }}
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    >
                      Próxima
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>

      {toast && <div className="toast">{toast}</div>}

      {/* 🔔 Pilha de Notificações Interativas */}
      <div className="notifications-stack">
        {activeNotifications.map((n) => (
          <div key={n.ticketID} className="notif-card">
            <div className="notif-header">
              <span className="notif-title">Ticket criado em {n.dispatchedAt ? new Date(n.dispatchedAt).toLocaleString() : ''}</span>
              <button className="notif-close" onClick={() => closeNotification(n.ticketID)}>×</button>
            </div>
            <div className="notif-body">
              <span>Jogador: <strong>{n.to_email || n.Email || n.email || '(Sem E-mail)'}</strong></span>
              <span>ID: {n.casino_user_id || n.ID || n['User ID']}</span>
              <span>Status: <span style={{ color: '#50fa7b' }}>Ready to reply</span></span>
            </div>
            <button className="notif-action-btn" onClick={() => handleNotificationAction(n)}>
              🚀 Abrir e Copiar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;

