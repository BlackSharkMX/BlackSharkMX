const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'crm_store.json');
const PUBLIC_DIR = path.join(__dirname, 'public');

// Helper to read data safely
function loadData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('Error reading data file:', err);
    return { chats: [], tasks: [], calendarEvents: [], quickReplies: [] };
  }
}

// Helper to write data safely
function saveData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error('Error saving data file:', err);
    return false;
  }
}

// Helper to read JSON request body
function parseRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        const parsed = body ? JSON.parse(body) : {};
        resolve(parsed);
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

// Helper to send JSON responses
function sendJSON(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

// MIME types for static files
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
  const parsedUrl = url.parse(req.url, true);
  const pathname = parsedUrl.pathname;
  const method = req.method;

  // Handle CORS preflight
  if (method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    return res.end();
  }

  // --- API ROUTES ---
  if (pathname === '/api/all' && method === 'GET') {
    const data = loadData();
    return sendJSON(res, 200, { success: true, data });
  }

  // Convert WhatsApp Message to Task / Activity
  if (pathname === '/api/messages/convert-to-task' && method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const data = loadData();

      const {
        chatId,
        messageId,
        title,
        category,
        priority,
        turn,
        deadline,
        scheduledDate,
        scheduledTime,
        notes
      } = body;

      const chat = data.chats.find(c => c.id === chatId);
      let messageText = '';
      let contactName = chat ? chat.name : 'Contacto WhatsApp';
      let contactPhone = chat ? chat.phone : '';

      if (chat) {
        const msg = chat.messages.find(m => m.id === messageId);
        if (msg) {
          msg.convertedToTask = true;
          messageText = msg.text;
        }
      }

      const taskId = 'task_' + Date.now();
      const newTask = {
        id: taskId,
        title: title || (messageText.slice(0, 60) + '...'),
        description: messageText || notes || '',
        source: 'WhatsApp',
        chatId,
        messageId,
        contactName,
        contactPhone,
        category: category || 'General',
        priority: priority || 'alta',
        status: scheduledDate ? 'agendado' : 'pendiente',
        turn: turn || 'Turno Hoy',
        deadline: deadline || 'Fin de Turno',
        scheduledDate: scheduledDate || null,
        scheduledTime: scheduledTime || null,
        notes: notes || '',
        createdAt: new Date().toISOString(),
        resolvedAt: null
      };

      if (chat) {
        const msg = chat.messages.find(m => m.id === messageId);
        if (msg) msg.taskId = taskId;
      }

      data.tasks.unshift(newTask);

      // If it has scheduled date and time, also add to calendar
      let newEvent = null;
      if (scheduledDate && scheduledTime) {
        newEvent = {
          id: 'evt_' + Date.now(),
          title: title || `Apoyo / Reunión con ${contactName}`,
          date: scheduledDate,
          time: scheduledTime,
          duration: '30 min',
          category: category || 'Apoyo a Colegas',
          taskId: taskId,
          contact: contactName,
          notes: notes || messageText
        };
        data.calendarEvents.push(newEvent);
      }

      saveData(data);
      return sendJSON(res, 201, { success: true, task: newTask, event: newEvent });
    } catch (err) {
      console.error(err);
      return sendJSON(res, 400, { success: false, error: err.message });
    }
  }

  // Update task status / details
  if (pathname.startsWith('/api/tasks/') && (method === 'PUT' || method === 'PATCH')) {
    try {
      const taskId = pathname.split('/')[3];
      const updates = await parseRequestBody(req);
      const data = loadData();

      const index = data.tasks.findIndex(t => t.id === taskId);
      if (index === -1) {
        return sendJSON(res, 404, { success: false, message: 'Tarea no encontrada' });
      }

      if (updates.status === 'resuelto' && !data.tasks[index].resolvedAt) {
        updates.resolvedAt = new Date().toISOString();
      } else if (updates.status && updates.status !== 'resuelto') {
        updates.resolvedAt = null;
      }

      data.tasks[index] = { ...data.tasks[index], ...updates };
      saveData(data);
      return sendJSON(res, 200, { success: true, task: data.tasks[index] });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: err.message });
    }
  }

  // Delete task
  if (pathname.startsWith('/api/tasks/') && method === 'DELETE') {
    const taskId = pathname.split('/')[3];
    const data = loadData();
    data.tasks = data.tasks.filter(t => t.id !== taskId);
    // remove linked calendar event
    data.calendarEvents = data.calendarEvents.filter(e => e.taskId !== taskId);
    saveData(data);
    return sendJSON(res, 200, { success: true, message: 'Tarea eliminada' });
  }

  // Create calendar event
  if (pathname === '/api/calendar' && method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const data = loadData();
      const newEvent = {
        id: 'evt_' + Date.now(),
        title: body.title || 'Nueva Actividad',
        date: body.date || new Date().toISOString().split('T')[0],
        time: body.time || '10:00',
        duration: body.duration || '30 min',
        category: body.category || 'General',
        taskId: body.taskId || null,
        contact: body.contact || '',
        notes: body.notes || ''
      };
      data.calendarEvents.push(newEvent);
      saveData(data);
      return sendJSON(res, 201, { success: true, event: newEvent });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: err.message });
    }
  }

  // Delete calendar event
  if (pathname.startsWith('/api/calendar/') && method === 'DELETE') {
    const evtId = pathname.split('/')[3];
    const data = loadData();
    data.calendarEvents = data.calendarEvents.filter(e => e.id !== evtId);
    saveData(data);
    return sendJSON(res, 200, { success: true, message: 'Evento eliminado' });
  }

  // Send / simulate WhatsApp message
  if (pathname === '/api/messages/send' && method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const data = loadData();
      const chat = data.chats.find(c => c.id === body.chatId);
      if (!chat) {
        return sendJSON(res, 404, { success: false, message: 'Chat no encontrado' });
      }

      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      const dateStr = now.toISOString().split('T')[0];

      const newMsg = {
        id: 'msg_' + Date.now(),
        sender: body.sender || 'me',
        text: body.text || '',
        time: timeStr,
        date: dateStr,
        status: 'sent'
      };

      chat.messages.push(newMsg);
      saveData(data);
      return sendJSON(res, 201, { success: true, message: newMsg });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: err.message });
    }
  }

  // Add new contact or incoming message
  if (pathname === '/api/chats/new' && method === 'POST') {
    try {
      const body = await parseRequestBody(req);
      const data = loadData();

      const newChat = {
        id: 'chat_' + Date.now(),
        name: body.name || 'Nuevo Contacto',
        phone: body.phone || '+52 777 ...',
        category: body.category || 'Atención General',
        role: body.role || 'Colegio Boston',
        avatar: (body.name || 'NC').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase(),
        avatarColor: '#2563EB',
        unread: true,
        messages: [
          {
            id: 'msg_' + Date.now(),
            sender: 'them',
            text: body.initialMessage || 'Hola, solicito apoyo.',
            time: `${new Date().getHours()}:${String(new Date().getMinutes()).padStart(2, '0')}`,
            date: new Date().toISOString().split('T')[0],
            status: 'read'
          }
        ]
      };

      data.chats.unshift(newChat);
      saveData(data);
      return sendJSON(res, 201, { success: true, chat: newChat });
    } catch (err) {
      return sendJSON(res, 400, { success: false, error: err.message });
    }
  }

  // --- STATIC FILES ---
  let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 No encontrado');
      } else {
        res.writeHead(500);
        res.end(`Error del servidor: ${err.code}`);
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 Boston CRM & WhatsApp Hub activo en puerto ${PORT}`);
  console.log(`🔗 Acceso: http://localhost:${PORT}`);
  console.log(`====================================================`);
});
