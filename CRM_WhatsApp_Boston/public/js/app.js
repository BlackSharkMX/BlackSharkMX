/**
 * Boston CRM Desk & WhatsApp Hub - Client Application
 * Colegio Boston - Cuernavaca
 */

// Application State
let appState = {
  chats: [],
  tasks: [],
  calendarEvents: [],
  quickReplies: [],
  activeChatId: null,
  chatFilter: 'todos',
  chatSearch: '',
  taskFilter: 'turno',
  selectedCalDate: new Date().toISOString().split('T')[0],
  calMonth: new Date().getMonth(),
  calYear: new Date().getFullYear()
};

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
  initClock();
  loadData();
  setupEventListeners();
});

// ==========================================================================
// 1. DATA LOADING & API CALLS
// ==========================================================================
async function loadData() {
  try {
    const res = await fetch('/api/all');
    const result = await res.json();
    if (result.success && result.data) {
      appState.chats = result.data.chats || [];
      appState.tasks = result.data.tasks || [];
      appState.calendarEvents = result.data.calendarEvents || [];
      appState.quickReplies = result.data.quickReplies || [];

      // Set initial active chat if none selected
      if (!appState.activeChatId && appState.chats.length > 0) {
        appState.activeChatId = appState.chats[0].id;
      }

      renderAll();
    }
  } catch (err) {
    console.error('Error al cargar datos:', err);
  }
}

function renderAll() {
  renderStats();
  renderChatList();
  renderActiveChat();
  renderTasks();
  renderCalendar();
  renderTimeline();
}

// ==========================================================================
// 2. LIVE CLOCK & SHIFT TIMER
// ==========================================================================
function initClock() {
  const clockEl = document.getElementById('liveClockTime');
  const dateEl = document.getElementById('liveClockDate');
  const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
  const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

  function update() {
    const now = new Date();
    const h = String(now.getHours()).padStart(2, '0');
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const dayName = days[now.getDay()];
    const dayNum = now.getDate();
    const monthName = months[now.getMonth()];
    const year = now.getFullYear();

    if (clockEl) clockEl.textContent = `${h}:${m}:${s}`;
    if (dateEl) dateEl.textContent = `${dayName}, ${dayNum} ${monthName} ${year}`;
  }

  update();
  setInterval(update, 1000);
}

// ==========================================================================
// 3. STATS BAR
// ==========================================================================
function renderStats() {
  const todayStr = new Date().toISOString().split('T')[0];
  const pendingTurnTasks = appState.tasks.filter(t => t.turn === 'Turno Hoy' && t.status !== 'resuelto');
  const credentialTasks = appState.tasks.filter(t => t.category.toLowerCase().includes('contraseña') || t.category.toLowerCase().includes('cuenta'));
  const todayEvents = appState.calendarEvents.filter(e => e.date === todayStr);
  const resolvedTasks = appState.tasks.filter(t => t.status === 'resuelto');

  const statPending = document.getElementById('statPendingTurn');
  const statCreds = document.getElementById('statCredentials');
  const statEvents = document.getElementById('statTodayEvents');
  const statResolved = document.getElementById('statResolved');

  if (statPending) statPending.textContent = pendingTurnTasks.length;
  if (statCreds) statCreds.textContent = credentialTasks.length;
  if (statEvents) statEvents.textContent = todayEvents.length;
  if (statResolved) statResolved.textContent = resolvedTasks.length;

  // Task counter badge in Columna 2 header
  const badgeTasks = document.getElementById('colTasksBadge');
  if (badgeTasks) badgeTasks.textContent = `${pendingTurnTasks.length} pendientes`;
}

// ==========================================================================
// 4. COLUMN 1: WHATSAPP HUB
// ==========================================================================
function renderChatList() {
  const container = document.getElementById('waChatList');
  if (!container) return;

  let filtered = appState.chats.filter(c => {
    // Search filter
    const matchSearch = c.name.toLowerCase().includes(appState.chatSearch.toLowerCase()) ||
                        c.phone.includes(appState.chatSearch) ||
                        (c.role && c.role.toLowerCase().includes(appState.chatSearch.toLowerCase()));
    if (!matchSearch) return false;

    // Category filter
    if (appState.chatFilter === 'padres') return c.category.toLowerCase().includes('padre');
    if (appState.chatFilter === 'colegas') return c.category.toLowerCase().includes('colega') || c.category.toLowerCase().includes('docente');
    if (appState.chatFilter === 'pendientes') {
      return appState.tasks.some(t => t.chatId === c.id && t.status !== 'resuelto');
    }
    return true;
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="padding: 20px; text-align: center; color: #94A3B8; font-size: 12px;">No hay conversaciones en esta categoría.</div>`;
    return;
  }

  container.innerHTML = filtered.map(chat => {
    const isActive = chat.id === appState.activeChatId;
    const lastMsg = chat.messages && chat.messages.length > 0 ? chat.messages[chat.messages.length - 1] : { text: '', time: '' };
    const hasUnresolvedTask = appState.tasks.some(t => t.chatId === chat.id && t.status !== 'resuelto');

    return `
      <div class="wa-chat-item ${isActive ? 'active' : ''}" onclick="selectChat('${chat.id}')">
        <div class="chat-avatar" style="background-color: ${chat.avatarColor || '#3B82F6'}">
          ${chat.avatar || 'CB'}
        </div>
        <div class="chat-info">
          <div class="chat-name-row">
            <span class="chat-name">${escapeHtml(chat.name)}</span>
            <span class="chat-time">${lastMsg.time || ''}</span>
          </div>
          <div class="chat-role">${escapeHtml(chat.role || chat.category)}</div>
          <div class="chat-last-snippet">
            ${hasUnresolvedTask ? '<span style="color:#EF4444; font-weight:700;">● Pendiente: </span>' : ''}
            ${escapeHtml(lastMsg.text || 'Sin mensajes')}
          </div>
        </div>
      </div>
    `;
  }).join('');
}

function selectChat(chatId) {
  appState.activeChatId = chatId;
  renderChatList();
  renderActiveChat();
}

function renderActiveChat() {
  const chat = appState.chats.find(c => c.id === appState.activeChatId);
  const headerContainer = document.getElementById('activeChatHeader');
  const messagesContainer = document.getElementById('activeChatMessages');
  const quickChipsContainer = document.getElementById('waQuickChips');

  if (!chat) {
    if (messagesContainer) {
      messagesContainer.innerHTML = `<div style="margin: auto; color: #94A3B8; font-size: 13px;">Selecciona una conversación para interactuar.</div>`;
    }
    return;
  }

  // Header
  if (headerContainer) {
    headerContainer.innerHTML = `
      <div class="wa-contact-detail">
        <h3>${escapeHtml(chat.name)}</h3>
        <p>${escapeHtml(chat.role || chat.category)} &bull; ${escapeHtml(chat.phone)}</p>
      </div>
      <div style="display: flex; gap: 6px;">
        <button class="wa-action-icon-btn" title="Abrir en WhatsApp Web Oficial" onclick="openDirectWhatsApp('${chat.phone}')">
          🌐
        </button>
        <button class="wa-action-icon-btn" title="Convertir último mensaje en tarea" onclick="quickConvertLastMessage('${chat.id}')">
          ⚡
        </button>
      </div>
    `;
  }

  // Messages Timeline
  if (messagesContainer) {
    messagesContainer.innerHTML = chat.messages.map(msg => {
      const isMe = msg.sender === 'me';
      const isConverted = msg.convertedToTask;
      const linkedTask = isConverted ? appState.tasks.find(t => t.messageId === msg.id) : null;

      return `
        <div class="msg-wrapper ${isMe ? 'msg-me' : 'msg-them'}">
          <div class="msg-bubble">
            ${escapeHtml(msg.text).replace(/\n/g, '<br>')}
            <div class="msg-meta">
              <span>${msg.time || ''}</span>
              ${isMe ? '<span>✓✓</span>' : ''}
            </div>
          </div>
          ${!isMe ? `
            <div class="msg-task-actions">
              ${isConverted ? `
                <span class="badge-task-linked">
                  ✓ Registrado en Pendientes ${linkedTask ? `(${escapeHtml(linkedTask.category)})` : ''}
                </span>
              ` : `
                <button class="btn-convert-task" onclick="openConvertTaskModal('${chat.id}', '${msg.id}')">
                  📌 Convertir en Pendiente
                </button>
                <button class="btn-convert-agenda" onclick="openAgendaModalForMessage('${chat.id}', '${msg.id}')">
                  📅 Agendar con Colega
                </button>
              `}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    // Auto-scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }

  // Quick reply chips
  if (quickChipsContainer) {
    quickChipsContainer.innerHTML = appState.quickReplies.map(qr => `
      <button class="qr-chip" onclick="insertQuickReply('${qr.title}', '${chat.name}')">
        ${escapeHtml(qr.title)}
      </button>
    `).join('');
  }
}

// Send WhatsApp message
async function sendChatMessage() {
  const input = document.getElementById('waMessageInput');
  if (!input || !input.value.trim() || !appState.activeChatId) return;

  const text = input.value.trim();
  input.value = '';

  try {
    const res = await fetch('/api/messages/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId: appState.activeChatId,
        sender: 'me',
        text: text
      })
    });
    const result = await res.json();
    if (result.success) {
      const chat = appState.chats.find(c => c.id === appState.activeChatId);
      if (chat) {
        chat.messages.push(result.message);
        renderChatList();
        renderActiveChat();
      }
    }
  } catch (err) {
    console.error('Error al enviar mensaje:', err);
  }
}

function insertQuickReply(title, contactName) {
  const qr = appState.quickReplies.find(q => q.title === title);
  const input = document.getElementById('waMessageInput');
  if (!qr || !input) return;

  let text = qr.text.replace(/\[Nombre\]/g, contactName || 'estimado(a)');
  input.value = text;
  input.focus();
}

function openDirectWhatsApp(phone) {
  const cleanPhone = phone.replace(/[^0-9]/g, '');
  window.open(`https://wa.me/${cleanPhone}`, '_blank');
}

// ==========================================================================
// 5. COLUMN 2: TASK & SHIFT MANAGER
// ==========================================================================
function renderTasks() {
  const container = document.getElementById('tasksScrollList');
  if (!container) return;

  // Filter tasks
  let filtered = appState.tasks.filter(t => {
    if (appState.taskFilter === 'turno') return t.turn === 'Turno Hoy' && t.status !== 'resuelto';
    if (appState.taskFilter === 'todos') return true;
    if (appState.taskFilter === 'agendado') return t.status === 'agendado';
    if (appState.taskFilter === 'resuelto') return t.status === 'resuelto';
    if (appState.taskFilter === 'credenciales') {
      return t.category.toLowerCase().includes('contraseña') || t.category.toLowerCase().includes('cuenta');
    }
    if (appState.taskFilter === 'colegas') {
      return t.category.toLowerCase().includes('colega') || t.category.toLowerCase().includes('docente');
    }
    return true;
  });

  // Calculate shift progress
  const shiftTasks = appState.tasks.filter(t => t.turn === 'Turno Hoy');
  const shiftResolved = shiftTasks.filter(t => t.status === 'resuelto');
  const percent = shiftTasks.length > 0 ? Math.round((shiftResolved.length / shiftTasks.length) * 100) : 100;

  const progressFill = document.getElementById('shiftProgressFill');
  const progressText = document.getElementById('shiftProgressText');
  if (progressFill) progressFill.style.width = `${percent}%`;
  if (progressText) progressText.textContent = `${shiftResolved.length} de ${shiftTasks.length} resueltos (${percent}%)`;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div style="margin: auto; text-align: center; color: #94A3B8; padding: 40px 20px;">
        <div style="font-size: 32px; margin-bottom: 8px;">🎉</div>
        <h4 style="font-size: 14px; font-weight: 700; color: #475569;">¡Bandeja al día!</h4>
        <p style="font-size: 12px; margin-top: 4px;">No hay pendientes activos en esta vista.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(task => {
    const isResolved = task.status === 'resuelto';
    const isHigh = task.priority === 'alta';
    const isScheduled = task.status === 'agendado' || task.scheduledDate;

    let catClass = 'cat-credenciales';
    if (task.category.includes('Colega')) catClass = 'cat-colegas';
    if (task.category.includes('Dirección')) catClass = 'cat-direccion';
    if (task.category.includes('Familia')) catClass = 'cat-familias';

    return `
      <div class="task-card priority-${task.priority || 'alta'} status-${task.status || 'pendiente'}">
        <div class="task-header-row">
          <span class="task-source-chip">
            📱 WhatsApp &bull; ${escapeHtml(task.contactName || 'Contacto')}
          </span>
          <span class="task-deadline-badge">
            ${isScheduled ? `📅 ${task.scheduledTime || ''} (${task.scheduledDate || ''})` : `⏰ Límite: ${task.deadline || 'Fin de Turno'}`}
          </span>
        </div>

        <h4>${escapeHtml(task.title)}</h4>
        ${task.description ? `<div class="task-desc">"${escapeHtml(task.description)}"</div>` : ''}

        <div class="task-tags-row">
          <span class="category-tag ${catClass}">${escapeHtml(task.category)}</span>
          <span class="category-tag">${escapeHtml(task.turn || 'Turno Hoy')}</span>
          ${isHigh ? '<span class="category-tag" style="background:#FEE2E2; color:#DC2626; font-weight:700;">Urgente / Salida Inmediata</span>' : ''}
        </div>

        <div class="task-footer-actions">
          <div style="display:flex; gap:6px;">
            ${isResolved ? `
              <button class="btn-task-action btn-unresolve" onclick="toggleTaskResolved('${task.id}', false)">
                ↩ Reabrir
              </button>
            ` : `
              <button class="btn-task-action btn-resolve" onclick="toggleTaskResolved('${task.id}', true)">
                ✓ Resolver / Salida
              </button>
            `}
            <button class="btn-task-action btn-reply-wa" title="Notificar al contacto por WhatsApp" onclick="replyTaskOnWhatsApp('${task.id}')">
              💬 Avisar por WA
            </button>
          </div>
          <button class="btn-delete-task" title="Eliminar tarea" onclick="deleteTask('${task.id}')">
            🗑️
          </button>
        </div>
      </div>
    `;
  }).join('');
}

async function toggleTaskResolved(taskId, resolve) {
  try {
    const res = await fetch(`/api/tasks/${taskId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        status: resolve ? 'resuelto' : 'pendiente'
      })
    });
    const result = await res.json();
    if (result.success) {
      const task = appState.tasks.find(t => t.id === taskId);
      if (task) {
        task.status = resolve ? 'resuelto' : 'pendiente';
      }
      renderStats();
      renderTasks();
      renderChatList();
    }
  } catch (err) {
    console.error('Error al actualizar tarea:', err);
  }
}

async function deleteTask(taskId) {
  if (!confirm('¿Deseas eliminar este pendiente?')) return;
  try {
    const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      appState.tasks = appState.tasks.filter(t => t.id !== taskId);
      appState.calendarEvents = appState.calendarEvents.filter(e => e.taskId !== taskId);
      renderStats();
      renderTasks();
      renderTimeline();
    }
  } catch (err) {
    console.error('Error al eliminar tarea:', err);
  }
}

function replyTaskOnWhatsApp(taskId) {
  const task = appState.tasks.find(t => t.id === taskId);
  if (!task || !task.chatId) return;

  // Select the chat
  selectChat(task.chatId);

  // Pre-fill response
  const input = document.getElementById('waMessageInput');
  if (input) {
    if (task.category.includes('Contraseña') || task.category.includes('Cuenta')) {
      input.value = `Hola ${task.contactName}, tus accesos al portal escolar ya quedaron listos y activos. Usuario: [usuario], Contraseña: [clave]. Saludos.`;
    } else {
      input.value = `Hola ${task.contactName}, con respecto a tu solicitud ("${task.title}"), te informo que ya quedó debidamente atendida y resuelta. ¡Saludos cordiales!`;
    }
    input.focus();
  }
}

// ==========================================================================
// 6. COLUMN 3: CALENDAR & AGENDA TIMELINE
// ==========================================================================
function renderCalendar() {
  const monthTitle = document.getElementById('calMonthTitle');
  const gridContainer = document.getElementById('calGridDays');
  if (!monthTitle || !gridContainer) return;

  const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  monthTitle.textContent = `${monthNames[appState.calMonth]} ${appState.calYear}`;

  const firstDay = new Date(appState.calYear, appState.calMonth, 1).getDay(); // 0 is Sunday
  const daysInMonth = new Date(appState.calYear, appState.calMonth + 1, 0).getDate();

  // Adjust so Monday is 0
  const startOffset = (firstDay + 6) % 7;

  let html = '';
  // Empty offset cells
  for (let i = 0; i < startOffset; i++) {
    html += `<div class="cal-day-cell" style="opacity: 0.2;"></div>`;
  }

  const todayStr = new Date().toISOString().split('T')[0];

  for (let day = 1; day <= daysInMonth; day++) {
    const dayStr = `${appState.calYear}-${String(appState.calMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    const isToday = dayStr === todayStr;
    const isSelected = dayStr === appState.selectedCalDate;
    const hasEvents = appState.calendarEvents.some(e => e.date === dayStr);

    html += `
      <div class="cal-day-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''} ${hasEvents ? 'has-events' : ''}"
           onclick="selectCalendarDate('${dayStr}')">
        ${day}
      </div>
    `;
  }

  gridContainer.innerHTML = html;
}

function changeMonth(delta) {
  appState.calMonth += delta;
  if (appState.calMonth < 0) {
    appState.calMonth = 11;
    appState.calYear--;
  } else if (appState.calMonth > 11) {
    appState.calMonth = 0;
    appState.calYear++;
  }
  renderCalendar();
}

function selectCalendarDate(dateStr) {
  appState.selectedCalDate = dateStr;
  renderCalendar();
  renderTimeline();
}

function renderTimeline() {
  const container = document.getElementById('timelineEventsList');
  const titleDateEl = document.getElementById('timelineSelectedDateTitle');
  if (!container) return;

  if (titleDateEl) {
    titleDateEl.textContent = `Agenda: ${appState.selectedCalDate}`;
  }

  const events = appState.calendarEvents.filter(e => e.date === appState.selectedCalDate);

  if (events.length === 0) {
    container.innerHTML = `
      <div style="padding: 20px; text-align: center; color: #94A3B8; font-size: 11.5px;">
        No hay actividades agendadas para este día.<br>
        Usa el botón <b>+ Agendar</b> para programar apoyos o reuniones.
      </div>
    `;
    return;
  }

  // Sort by time
  events.sort((a, b) => (a.time || '').localeCompare(b.time || ''));

  container.innerHTML = events.map(evt => `
    <div class="event-card">
      <div class="event-time-col">
        <span class="event-hour">${evt.time || '00:00'}</span>
        <span class="event-duration">${evt.duration || '30 min'}</span>
      </div>
      <div class="event-body">
        <div class="event-title">${escapeHtml(evt.title)}</div>
        ${evt.contact ? `<div class="event-contact">👤 ${escapeHtml(evt.contact)}</div>` : ''}
        ${evt.notes ? `<div class="event-notes">${escapeHtml(evt.notes)}</div>` : ''}
      </div>
      <button class="btn-del-event" title="Eliminar evento" onclick="deleteCalendarEvent('${evt.id}')">
        ✕
      </button>
    </div>
  `).join('');
}

async function deleteCalendarEvent(evtId) {
  if (!confirm('¿Deseas retirar esta actividad de la agenda?')) return;
  try {
    const res = await fetch(`/api/calendar/${evtId}`, { method: 'DELETE' });
    const result = await res.json();
    if (result.success) {
      appState.calendarEvents = appState.calendarEvents.filter(e => e.id !== evtId);
      renderStats();
      renderCalendar();
      renderTimeline();
    }
  } catch (err) {
    console.error('Error al eliminar evento:', err);
  }
}

// ==========================================================================
// 7. MODALS & CONVERSIONS
// ==========================================================================

// Open Modal: Convert WhatsApp Message to Task
function openConvertTaskModal(chatId, messageId) {
  const chat = appState.chats.find(c => c.id === chatId);
  if (!chat) return;
  const msg = chat.messages.find(m => m.id === messageId);
  if (!msg) return;

  const modal = document.getElementById('modalConvertTask');
  const inputChatId = document.getElementById('convChatId');
  const inputMsgId = document.getElementById('convMessageId');
  const inputTitle = document.getElementById('convTaskTitle');
  const inputDesc = document.getElementById('convOriginalMsg');
  const selectCat = document.getElementById('convCategory');
  const selectPriority = document.getElementById('convPriority');

  inputChatId.value = chatId;
  inputMsgId.value = messageId;
  inputDesc.value = msg.text;

  // Auto-detect category & title from message content
  const lower = msg.text.toLowerCase();
  if (lower.includes('contraseña') || lower.includes('usuario') || lower.includes('clave') || lower.includes('portal') || lower.includes('acceso')) {
    inputTitle.value = `Generar y enviar credenciales de portal a ${chat.name}`;
    selectCat.value = 'Contraseñas / Cuentas';
    selectPriority.value = 'alta';
  } else if (lower.includes('apoyo') || lower.includes('ayuda') || lower.includes('proyector') || lower.includes('laboratorio')) {
    inputTitle.value = `Apoyo en actividad / técnico con ${chat.name}`;
    selectCat.value = 'Apoyo a Colegas';
    selectPriority.value = 'media';
  } else if (lower.includes('informe') || lower.includes('reporte') || lower.includes('oficio')) {
    inputTitle.value = `Preparar informe académico para ${chat.name}`;
    selectCat.value = 'Dirección Académica';
    selectPriority.value = 'alta';
  } else {
    inputTitle.value = `Atender solicitud de ${chat.name}`;
    selectCat.value = 'Atención a Familias';
    selectPriority.value = 'alta';
  }

  modal.classList.add('active');
}

// Submit converted task
async function submitConvertTask(e) {
  e.preventDefault();
  const chatId = document.getElementById('convChatId').value;
  const messageId = document.getElementById('convMessageId').value;
  const title = document.getElementById('convTaskTitle').value;
  const category = document.getElementById('convCategory').value;
  const priority = document.getElementById('convPriority').value;
  const turn = document.getElementById('convTurn').value;
  const deadline = document.getElementById('convDeadline').value;
  const schedDate = document.getElementById('convSchedDate').value;
  const schedTime = document.getElementById('convSchedTime').value;

  try {
    const res = await fetch('/api/messages/convert-to-task', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chatId,
        messageId,
        title,
        category,
        priority,
        turn,
        deadline,
        scheduledDate: schedDate || null,
        scheduledTime: schedTime || null
      })
    });
    const result = await res.json();
    if (result.success) {
      appState.tasks.unshift(result.task);
      if (result.event) {
        appState.calendarEvents.push(result.event);
      }
      // Update message status in memory
      const chat = appState.chats.find(c => c.id === chatId);
      if (chat) {
        const msg = chat.messages.find(m => m.id === messageId);
        if (msg) msg.convertedToTask = true;
      }

      closeModal('modalConvertTask');
      renderAll();
    }
  } catch (err) {
    console.error('Error al convertir mensaje:', err);
  }
}

// Quick agenda modal from WhatsApp message
function openAgendaModalForMessage(chatId, messageId) {
  const chat = appState.chats.find(c => c.id === chatId);
  if (!chat) return;
  const msg = chat.messages.find(m => m.id === messageId);
  if (!msg) return;

  const modal = document.getElementById('modalAddEvent');
  document.getElementById('evtTitle').value = `Apoyo a ${chat.name}: ${msg.text.slice(0, 45)}...`;
  document.getElementById('evtContact').value = chat.name;
  document.getElementById('evtNotes').value = `Solicitado vía WhatsApp: "${msg.text}"`;
  document.getElementById('evtDate').value = appState.selectedCalDate;
  document.getElementById('evtTime').value = '11:00';

  modal.classList.add('active');
}

// Add new calendar event submit
async function submitAddEvent(e) {
  e.preventDefault();
  const title = document.getElementById('evtTitle').value;
  const contact = document.getElementById('evtContact').value;
  const date = document.getElementById('evtDate').value;
  const time = document.getElementById('evtTime').value;
  const duration = document.getElementById('evtDuration').value;
  const notes = document.getElementById('evtNotes').value;

  try {
    const res = await fetch('/api/calendar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, contact, date, time, duration, notes, category: 'Apoyo a Colegas' })
    });
    const result = await res.json();
    if (result.success) {
      appState.calendarEvents.push(result.event);
      closeModal('modalAddEvent');
      renderStats();
      renderCalendar();
      renderTimeline();
    }
  } catch (err) {
    console.error('Error al agendar evento:', err);
  }
}

// Quick convert last message of chat
function quickConvertLastMessage(chatId) {
  const chat = appState.chats.find(c => c.id === chatId);
  if (!chat || !chat.messages.length) return;
  const lastThemMsg = [...chat.messages].reverse().find(m => m.sender === 'them');
  if (lastThemMsg) {
    openConvertTaskModal(chat.id, lastThemMsg.id);
  }
}

// Add New Chat / Import Message Modal
function openNewChatModal() {
  document.getElementById('modalNewChat').classList.add('active');
}

async function submitNewChat(e) {
  e.preventDefault();
  const name = document.getElementById('ncName').value;
  const phone = document.getElementById('ncPhone').value;
  const role = document.getElementById('ncRole').value;
  const category = document.getElementById('ncCategory').value;
  const msg = document.getElementById('ncMessage').value;

  try {
    const res = await fetch('/api/chats/new', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, phone, role, category, initialMessage: msg })
    });
    const result = await res.json();
    if (result.success) {
      appState.chats.unshift(result.chat);
      appState.activeChatId = result.chat.id;
      closeModal('modalNewChat');
      renderAll();
    }
  } catch (err) {
    console.error('Error al agregar chat:', err);
  }
}

function openWorkflowModal() {
  document.getElementById('modalWorkflow').classList.add('active');
}

function closeModal(modalId) {
  const el = document.getElementById(modalId);
  if (el) el.classList.remove('active');
}

// Setup Event Listeners
function setupEventListeners() {
  // Search input in WhatsApp column
  const searchInput = document.getElementById('waSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', e => {
      appState.chatSearch = e.target.value;
      renderChatList();
    });
  }

  // Filter chips in WhatsApp column
  const chatChips = document.querySelectorAll('.wa-category-chips .chip-btn');
  chatChips.forEach(btn => {
    btn.addEventListener('click', () => {
      chatChips.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.chatFilter = btn.dataset.filter;
      renderChatList();
    });
  });

  // Task filter tabs in Column 2
  const taskTabs = document.querySelectorAll('.task-filter-tabs .task-tab-btn');
  taskTabs.forEach(btn => {
    btn.addEventListener('click', () => {
      taskTabs.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      appState.taskFilter = btn.dataset.filter;
      renderTasks();
    });
  });

  // Enter to send WhatsApp message
  const waInput = document.getElementById('waMessageInput');
  if (waInput) {
    waInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChatMessage();
      }
    });
  }
}

// Utility: HTML escaping
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
