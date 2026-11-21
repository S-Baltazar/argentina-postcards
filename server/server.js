require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { loadDb, saveDb } = require('./db');

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'postales_vintage_dev_secret';
const ENVIO_INMEDIATO = process.env.ENVIO_INMEDIATO !== 'false';

app.use(cors());
app.use(express.json({ limit: '5mb' }));

function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
}

function generateFriendCode() {
  return 'POSTAL-' + crypto.randomBytes(3).toString('hex').toUpperCase();
}

// Registro de usuario
app.post('/api/auth/register', async (req, res, next) => { try {
  const { username, password, city } = req.body;
  if (!username || !password || username.trim().length < 3 || password.length < 4) {
    return res.status(400).json({ error: 'Usuario (mín. 3 caracteres) y contraseña (mín. 4 caracteres) son obligatorios.' });
  }
  const db = await loadDb();
  const cleanUser = username.trim().toLowerCase();
  if (db.users.find(u => u.username.toLowerCase() === cleanUser)) {
    return res.status(409).json({ error: 'Ese nombre de usuario ya existe.' });
  }
  const passwordHash = await bcrypt.hash(password, 10);
  const newUser = {
    id: crypto.randomUUID(),
    username: username.trim(),
    passwordHash,
    city: (city || 'Buenos Aires').trim(),
    friendCode: generateFriendCode(),
    createdAt: new Date().toISOString()
  };
  db.users.push(newUser);
  await saveDb(db);
  const token = jwt.sign({ id: newUser.id, username: newUser.username }, JWT_SECRET, { expiresIn: '7d' });
  res.status(201).json({
    token,
    user: { id: newUser.id, username: newUser.username, city: newUser.city, friendCode: newUser.friendCode }
  });
  } catch (err) { next(err); }
});

// Inicio de sesión
app.post('/api/auth/login', async (req, res, next) => { try {
  const { username, password } = req.body;
  const db = await loadDb();
  const user = db.users.find(u => u.username.toLowerCase() === (username || '').trim().toLowerCase());
  if (!user) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  const valid = await bcrypt.compare(password || '', user.passwordHash);
  if (!valid) return res.status(401).json({ error: 'Usuario o contraseña incorrectos.' });
  const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
  res.json({
    token,
    user: { id: user.id, username: user.username, city: user.city, friendCode: user.friendCode }
  });
  } catch (err) { next(err); }
});

// Perfil actual
app.get('/api/me', authMiddleware, async (req, res, next) => { try {
  const db = await loadDb();
  const user = db.users.find(u => u.id === req.user.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json({ id: user.id, username: user.username, city: user.city, friendCode: user.friendCode });
  } catch (err) { next(err); }
});

// Listar amigos
app.get('/api/friends', authMiddleware, async (req, res, next) => { try {
  const db = await loadDb();
  const ids = db.friendships
    .filter(f => f.userA === req.user.id || f.userB === req.user.id)
    .map(f => (f.userA === req.user.id ? f.userB : f.userA));
  const friends = db.users
    .filter(u => ids.includes(u.id) && u.id !== req.user.id)
    .map(u => ({ id: u.id, username: u.username, city: u.city, friendCode: u.friendCode }));
  res.json(friends);
  } catch (err) { next(err); }
});

// Listar solicitudes de amistad (recibidas y enviadas pendientes)
app.get('/api/friends/requests', authMiddleware, async (req, res, next) => { try {
  const db = await loadDb();
  const mapUser = (u) => u ? { id: u.id, username: u.username, city: u.city, friendCode: u.friendCode } : null;

  const incoming = db.friendRequests
    .filter(r => r.toId === req.user.id)
    .map(r => {
      const from = mapUser(db.users.find(u => u.id === r.fromId));
      return from ? { requestId: r.id, createdAt: r.createdAt, ...from } : null;
    })
    .filter(Boolean);

  const outgoing = db.friendRequests
    .filter(r => r.fromId === req.user.id)
    .map(r => {
      const to = mapUser(db.users.find(u => u.id === r.toId));
      return to ? { requestId: r.id, createdAt: r.createdAt, ...to } : null;
    })
    .filter(Boolean);

  res.json({ incoming, outgoing });
  } catch (err) { next(err); }
});

// Enviar solicitud de amistad por código o nombre de usuario
app.post('/api/friends/add', authMiddleware, async (req, res, next) => { try {
  const { query } = req.body;
  const db = await loadDb();
  const q = (query || '').trim().toLowerCase();
  const target = db.users.find(
    u => u.friendCode.toLowerCase() === q || u.username.toLowerCase() === q
  );
  if (!target) return res.status(404).json({ error: 'No se encontró ningún usuario con ese nombre o código.' });
  if (target.id === req.user.id) return res.status(400).json({ error: 'No puedes agregarte a ti mismo.' });

  const alreadyFriends = db.friendships.some(
    f => (f.userA === req.user.id && f.userB === target.id) || (f.userA === target.id && f.userB === req.user.id)
  );
  if (alreadyFriends) {
    return res.status(409).json({ error: `${target.username} ya está en tu lista de amigos.` });
  }

  // Si el otro usuario ya te había enviado solicitud, se acepta mutuamente
  const reverseIdx = db.friendRequests.findIndex(r => r.fromId === target.id && r.toId === req.user.id);
  if (reverseIdx !== -1) {
    db.friendRequests.splice(reverseIdx, 1);
    db.friendships.push({ userA: target.id, userB: req.user.id, createdAt: new Date().toISOString() });
    await saveDb(db);
    return res.json({
      status: 'accepted',
      friend: { id: target.id, username: target.username, city: target.city, friendCode: target.friendCode }
    });
  }

  const alreadySent = db.friendRequests.some(r => r.fromId === req.user.id && r.toId === target.id);
  if (alreadySent) {
    return res.status(409).json({ error: `Ya enviaste una solicitud pendiente a ${target.username}.` });
  }

  const reqObj = {
    id: crypto.randomUUID(),
    fromId: req.user.id,
    toId: target.id,
    createdAt: new Date().toISOString()
  };
  db.friendRequests.push(reqObj);
  await saveDb(db);

  res.status(201).json({
    status: 'pending',
    request: {
      requestId: reqObj.id,
      createdAt: reqObj.createdAt,
      id: target.id,
      username: target.username,
      city: target.city,
      friendCode: target.friendCode
    }
  });
  } catch (err) { next(err); }
});

// Aceptar solicitud de amistad
app.post('/api/friends/requests/:id/accept', authMiddleware, async (req, res, next) => { try {
  const db = await loadDb();
  const idx = db.friendRequests.findIndex(r => r.id === req.params.id && r.toId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Solicitud de amistad no encontrada.' });

  const [request] = db.friendRequests.splice(idx, 1);
  const exists = db.friendships.some(
    f => (f.userA === request.fromId && f.userB === request.toId) || (f.userA === request.toId && f.userB === request.fromId)
  );
  if (!exists) {
    db.friendships.push({ userA: request.fromId, userB: request.toId, createdAt: new Date().toISOString() });
  }
  await saveDb(db);

  const friend = db.users.find(u => u.id === request.fromId);
  res.json({
    friend: friend ? { id: friend.id, username: friend.username, city: friend.city, friendCode: friend.friendCode } : null
  });
  } catch (err) { next(err); }
});

// Denegar / rechazar solicitud de amistad
app.post('/api/friends/requests/:id/reject', authMiddleware, async (req, res, next) => { try {
  const db = await loadDb();
  const idx = db.friendRequests.findIndex(r => r.id === req.params.id && r.toId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Solicitud de amistad no encontrada.' });

  db.friendRequests.splice(idx, 1);
  await saveDb(db);
  res.json({ rejectedId: req.params.id });
  } catch (err) { next(err); }
});

// Eliminar un amigo actual (corta la amistad en ambos sentidos)
app.delete('/api/friends/:friendId', authMiddleware, async (req, res, next) => { try {
  const { friendId } = req.params;
  const db = await loadDb();
  const before = db.friendships.length;
  db.friendships = db.friendships.filter(
    f => !((f.userA === req.user.id && f.userB === friendId) || (f.userA === friendId && f.userB === req.user.id))
  );
  if (db.friendships.length === before) {
    return res.status(404).json({ error: 'Amistad no encontrada.' });
  }
  await saveDb(db);
  res.json({ removedId: friendId });
  } catch (err) { next(err); }
});

// Enviar carta/postal
app.post('/api/letters', authMiddleware, async (req, res, next) => { try {
  const { recipientId, title, body, stamp } = req.body;
  if (!recipientId || !body || !body.trim()) {
    return res.status(400).json({ error: 'Debes elegir un destinatario y escribir el mensaje de la carta.' });
  }
  if (recipientId === req.user.id) {
    return res.status(400).json({ error: 'No puedes enviarte una carta a ti mismo.' });
  }
  const db = await loadDb();
  const sender = db.users.find(u => u.id === req.user.id);
  const recipient = db.users.find(u => u.id === recipientId);
  if (!recipient) return res.status(404).json({ error: 'Destinatario no encontrado.' });

  const isFriend = db.friendships.some(
    f => (f.userA === req.user.id && f.userB === recipientId) || (f.userA === recipientId && f.userB === req.user.id)
  );
  if (!isFriend) {
    return res.status(403).json({ error: 'Solo puedes enviar cartas a amigos que hayan aceptado tu solicitud.' });
  }

  const now = new Date();
  // Si en el futuro activas ENVIO_INMEDIATO=false, aquí calculas la demora según distancia
  const deliveredAt = ENVIO_INMEDIATO
    ? now.toISOString()
    : new Date(now.getTime() + 1000 * 60 * 60 * 4).toISOString();

  const letter = {
    id: crypto.randomUUID(),
    senderId: sender.id,
    senderName: sender.username,
    senderCity: sender.city,
    recipientId: recipient.id,
    recipientName: recipient.username,
    title: (title || 'Sin asunto').trim(),
    body: body.trim(),
    stamp: stamp || { type: 'preset', id: 'wreath' },
    sentAt: now.toISOString(),
    deliveredAt,
    opened: false
  };
  db.letters.push(letter);
  await saveDb(db);
  res.status(201).json(letter);
  } catch (err) { next(err); }
});

// Bandeja de entrada y enviados
app.get('/api/letters', authMiddleware, async (req, res, next) => { try {
  const db = await loadDb();
  const now = Date.now();
  const friendIds = new Set(
    db.friendships
      .filter(f => f.userA === req.user.id || f.userB === req.user.id)
      .map(f => (f.userA === req.user.id ? f.userB : f.userA))
  );
  const inbox = db.letters
    .filter(l => l.recipientId === req.user.id && friendIds.has(l.senderId) && new Date(l.deliveredAt).getTime() <= now)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  const sent = db.letters
    .filter(l => l.senderId === req.user.id)
    .sort((a, b) => new Date(b.sentAt) - new Date(a.sentAt));
  res.json({ inbox, sent });
  } catch (err) { next(err); }
});

// Marcar carta como abierta
app.patch('/api/letters/:id/open', authMiddleware, async (req, res, next) => { try {
  const db = await loadDb();
  const letter = db.letters.find(l => l.id === req.params.id && l.recipientId === req.user.id);
  if (!letter) return res.status(404).json({ error: 'Carta no encontrada' });
  letter.opened = true;
  await saveDb(db);
  res.json(letter);
  } catch (err) { next(err); }
});

// Borrar todas las cartas enviadas por el usuario (se eliminan para ambas partes)
app.delete('/api/letters/sent/all', authMiddleware, async (req, res, next) => { try {
  const db = await loadDb();
  const before = db.letters.length;
  db.letters = db.letters.filter(l => l.senderId !== req.user.id);
  const deletedCount = before - db.letters.length;
  await saveDb(db);
  res.json({ deletedCount });
  } catch (err) { next(err); }
});

// Borrar carta enviada (se elimina para ambas partes)
app.delete('/api/letters/:id', authMiddleware, async (req, res, next) => { try {
  const db = await loadDb();
  const idx = db.letters.findIndex(l => l.id === req.params.id && l.senderId === req.user.id);
  if (idx === -1) return res.status(404).json({ error: 'Carta no encontrada o no tienes permiso para borrarla.' });
  db.letters.splice(idx, 1);
  await saveDb(db);
  res.json({ deletedId: req.params.id });
  } catch (err) { next(err); }
});

app.use('/api', (req, res) => {
  res.status(404).json({ error: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor de Postales Vintage corriendo en http://localhost:${PORT} (ENVIO_INMEDIATO=${ENVIO_INMEDIATO})`);
  });
}

module.exports = app;
