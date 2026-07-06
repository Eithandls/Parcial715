const express = require('express');
const cors = require('cors');
const { db } = require('./database');
const path = require('path');
const { hashPassword, verifyPassword, createToken, canAccessRoute } = require('./security');
const { ValidationError, validateBody, validateDateRange } = require('./validation');

const app = express();
const PORT = process.env.PORT || 3000;

app.disable('x-powered-by');
app.use(cors({
  origin(origin, callback) {
    if (!origin || /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)) return callback(null, true);
    return callback(new Error('Origen no permitido'));
  }
}));
app.use(express.json({ limit: '100kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});
app.use(express.static(path.join(__dirname, 'public')));

// Tokens are kept server-side and generated cryptographically.
const activeTokens = new Map();
const loginAttempts = new Map();
const SESSION_TTL_MS = 8 * 60 * 60 * 1000;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_LOGIN_ATTEMPTS = 5;

// Keep the documented demo administrator available for existing databases.
if (!db.prepare('SELECT id FROM usuarios WHERE username = ?').get('admin')) {
  db.prepare(`INSERT INTO usuarios (username, password, nombre, email, rol) VALUES (?, ?, ?, ?, ?)`)
    .run('admin', hashPassword('1234'), 'Administrador', 'admin@cinemaclub.com', 'admin');
}
if (!db.prepare('SELECT id FROM usuarios WHERE username = ?').get('empleado')) {
  db.prepare(`INSERT INTO usuarios (username, password, nombre, email, rol) VALUES (?, ?, ?, ?, ?)`)
    .run('empleado', hashPassword('empleado1'), 'Operador Cinema Club', 'empleado@cinemaclub.com', 'empleado');
}

const cleanUser = (user) => ({
  id: user.id,
  username: user.username,
  nombre: user.nombre,
  email: user.email,
  rol: user.rol
});

const sendError = (res, err) => {
  if (err instanceof ValidationError) {
    return res.status(err.status).json({ error: err.message, errors: err.errors });
  }
  if (String(err.message).includes('UNIQUE constraint failed')) {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos únicos' });
  }
  console.error(err);
  return res.status(500).json({ error: 'No se pudo completar la operación' });
};

const ensureReference = (table, id, label) => {
  if (!db.prepare(`SELECT id FROM ${table} WHERE id = ? AND estado = 'Activo'`).get(id)) {
    throw new ValidationError([`${label} no existe o está inactivo`]);
  }
};

const positiveId = (value, label) => {
  const id = Number(value);
  if (!Number.isInteger(id) || id < 1) throw new ValidationError([`${label} es obligatorio`]);
  return id;
};

const createSession = (user) => {
  const token = createToken();
  activeTokens.set(token, { user, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
};

const getSession = (token) => {
  const session = activeTokens.get(token);
  if (!session) return null;
  if (session.expiresAt <= Date.now()) {
    activeTokens.delete(token);
    return null;
  }
  const current = db.prepare('SELECT estado, rol FROM usuarios WHERE id = ?').get(session.user.id);
  if (!current || current.estado !== 'Activo') {
    activeTokens.delete(token);
    return null;
  }
  session.user.rol = current.rol;
  return session;
};

app.post('/api/auth/login', (req, res) => {
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  if (username.length < 3 || username.length > 30 || password.length < 4 || password.length > 72) {
    return res.status(400).json({ error: 'Usuario y contraseña son obligatorios' });
  }

  const attemptKey = `${req.ip}:${username.toLowerCase()}`;
  const previous = loginAttempts.get(attemptKey);
  if (previous && previous.resetAt > Date.now() && previous.count >= MAX_LOGIN_ATTEMPTS) {
    return res.status(429).json({ error: 'Demasiados intentos. Intenta nuevamente en 15 minutos' });
  }
  if (previous && previous.resetAt <= Date.now()) loginAttempts.delete(attemptKey);

  const record = db.prepare('SELECT * FROM usuarios WHERE username = ? AND estado = ?').get(username, 'Activo');
  if (!record || !verifyPassword(password, record.password)) {
    const attempt = loginAttempts.get(attemptKey) || { count: 0, resetAt: Date.now() + LOGIN_WINDOW_MS };
    attempt.count += 1;
    loginAttempts.set(attemptKey, attempt);
    return res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
  }
  loginAttempts.delete(attemptKey);

  // Upgrade old demo/plain-text passwords after a successful login.
  if (!String(record.password).startsWith('scrypt$')) {
    db.prepare('UPDATE usuarios SET password = ? WHERE id = ?').run(hashPassword(password), record.id);
  }

  const user = cleanUser(record);
  const token = createSession(user);
  res.json({ token, user });
});

app.post('/api/auth/register', (req, res) => {
  const nombre = String(req.body?.nombre || '').trim();
  const email = String(req.body?.email || '').trim().toLowerCase();
  const username = String(req.body?.username || '').trim();
  const password = String(req.body?.password || '');
  const cedula = String(req.body?.cedula || '').trim() || null;
  const telefono = String(req.body?.telefono || '').trim() || null;

  const errors = [];
  if (nombre.length < 3 || nombre.length > 120) errors.push('Nombre debe tener entre 3 y 120 caracteres');
  if (/[<>]/.test(nombre)) errors.push('Nombre contiene caracteres no permitidos');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.push('Correo no tiene un formato válido');
  if (!/^[A-Za-z0-9._-]{3,30}$/.test(username)) errors.push('Usuario debe tener de 3 a 30 caracteres y solo usar letras, números, punto, guion o guion bajo');
  if (password.length < 6 || password.length > 72) errors.push('Contraseña debe tener entre 6 y 72 caracteres');
  if (cedula && !/^\d{3}-\d{7}-\d$/.test(cedula)) errors.push('Cédula debe usar el formato 000-0000000-0');
  if (telefono && !/^\d{3}-\d{3}-\d{4}$/.test(telefono)) errors.push('Teléfono debe usar el formato 809-000-0000');
  if (errors.length) return res.status(400).json({ error: errors[0], errors });

  try {
    // Siempre se registra como cliente
    const stmt = db.prepare(`INSERT INTO usuarios (nombre, email, username, password, rol) VALUES (?, ?, ?, ?, ?)`);
    const info = stmt.run(nombre, email, username, hashPassword(password), 'cliente');
    
    // Crear perfil de cliente automáticamente
    try {
      db.prepare(`INSERT INTO clientes (nombre, apellido, email, cedula, telefono) VALUES (?, '', ?, ?, ?)`).run(nombre, email, cedula || null, telefono || null);
    } catch (e) { console.error('Error creando cliente:', e.message); }
    
    const user = { id: info.lastInsertRowid, username, nombre, email, rol: 'cliente' };
    const token = createSession(user);
    
    res.json({ token, user });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'El nombre de usuario o correo ya está en uso' });
    } else {
      sendError(res, err);
    }
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  const session = getSession(token);
  
  if (session) res.json({ user: session.user });
  else res.status(401).json({ error: 'Invalid or expired token' });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    activeTokens.delete(token);
  }
  res.json({ message: 'Logged out successfully' });
});

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  const session = getSession(token);
  if (!session) return res.status(401).json({ error: 'Invalid or expired token' });
  
  req.user = session.user;
  next();
};

app.use('/api', authMiddleware); // Protect all API routes except auth

app.use('/api', (req, res, next) => {
  const path = req.originalUrl.split('?')[0];
  return canAccessRoute(req.user.rol, req.method, path)
    ? next()
    : res.status(403).json({ error: 'Tu rol no tiene permiso para esta opción' });
});

// --- Generic CRUD Helper ---
function generateCRUD(app, table) {
  app.get(`/api/${table}`, (req, res) => {
    const search = req.query.search;
    let query = `SELECT * FROM ${table} WHERE estado != 'Eliminado'`;
    let params = [];
    
    if (search) {
      // Basic search on common fields (descripcion or nombre or titulo)
      const hasDescripcion = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === 'descripcion');
      const hasNombre = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === 'nombre');
      const hasTitulo = db.prepare(`PRAGMA table_info(${table})`).all().some(c => c.name === 'titulo');
      
      let searchCols = [];
      if (hasDescripcion) searchCols.push(`descripcion LIKE ?`);
      if (hasNombre) searchCols.push(`nombre LIKE ?`);
      if (hasTitulo) searchCols.push(`titulo LIKE ?`);
      
      if (searchCols.length > 0) {
        query += ` AND (${searchCols.join(' OR ')})`;
        params = searchCols.map(() => `%${search}%`);
      }
    }
    
    try {
      const rows = db.prepare(query + ` ORDER BY id DESC`).all(...params);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get(`/api/${table}/:id`, (req, res) => {
    try {
      const row = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
      if (row) res.json(row);
      else res.status(404).json({ error: 'Not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post(`/api/${table}`, (req, res) => {
    try {
      const data = validateBody(table, req.body);
      if (table === 'peliculas') ensureReference('generos', data.genero_id, 'Género');
      const keys = Object.keys(data);
      const values = Object.values(data);
      const placeholders = keys.map(() => '?').join(',');
      const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`);
      const info = stmt.run(...values);
      res.status(201).json({ id: info.lastInsertRowid, ...data });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.put(`/api/${table}/:id`, (req, res) => {
    try {
      const data = validateBody(table, req.body, { partial: true });
      if (table === 'peliculas' && data.genero_id) ensureReference('generos', data.genero_id, 'Género');
      const keys = Object.keys(data);
      const values = Object.values(data);
      const setClause = keys.map(k => `${k} = ?`).join(',');
      const stmt = db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`);
      const info = stmt.run(...values, req.params.id);
      if (info.changes > 0) res.json({ id: req.params.id, ...data });
      else res.status(404).json({ error: 'Not found' });
    } catch (err) {
      sendError(res, err);
    }
  });

  app.delete(`/api/${table}/:id`, (req, res) => {
    try {
      // Soft delete
      const stmt = db.prepare(`UPDATE ${table} SET estado = 'Inactivo' WHERE id = ?`);
      const info = stmt.run(req.params.id);
      if (info.changes > 0) res.json({ success: true });
      else res.status(404).json({ error: 'Not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
}

// Peliculas completo — with articles + elenco + filters (must be before generic CRUD to avoid :id match)
app.get('/api/peliculas/completo', (req, res) => {
  try {
    const { genero_id, tipo_id, idioma_id, search } = req.query;

    let where = "WHERE p.estado = 'Activo'";
    let params = [];

    if (genero_id) { where += ' AND p.genero_id = ?'; params.push(genero_id); }
    if (search) { where += ' AND p.titulo LIKE ?'; params.push(`%${search}%`); }

    let peliculas = db.prepare(`
      SELECT p.*, g.descripcion as genero
      FROM peliculas p
      JOIN generos g ON p.genero_id = g.id
      ${where}
      ORDER BY p.titulo
    `).all(...params);

    let articlesWhere = "WHERE a.estado = 'Activo'";
    let articleParams = [];
    if (tipo_id) { articlesWhere += ' AND a.tipo_articulo_id = ?'; articleParams.push(tipo_id); }
    if (idioma_id) { articlesWhere += ' AND a.idioma_id = ?'; articleParams.push(idioma_id); }

    const articles = db.prepare(`
      SELECT a.*, t.descripcion as tipo_articulo, i.descripcion as idioma
      FROM articulos a
      JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
      JOIN idiomas i ON a.idioma_id = i.id
      ${articlesWhere}
      ORDER BY a.pelicula_id, t.id, i.id
    `).all(...articleParams);

    const articleMap = {};
    for (const a of articles) {
      if (!articleMap[a.pelicula_id]) articleMap[a.pelicula_id] = [];
      articleMap[a.pelicula_id].push(a);
    }

    const elencoRows = db.prepare(`
      SELECT a.pelicula_id, e.id, e.nombre, e.tipo
      FROM elenco e
      JOIN articulos_elenco ae ON e.id = ae.elenco_id
      JOIN articulos a ON ae.articulo_id = a.id
      GROUP BY a.pelicula_id, e.id
      ORDER BY e.tipo, e.nombre
    `).all();
    const elencoMap = {};
    for (const row of elencoRows) {
      if (!elencoMap[row.pelicula_id]) elencoMap[row.pelicula_id] = [];
      if (!elencoMap[row.pelicula_id].some(e => e.id === row.id)) {
        elencoMap[row.pelicula_id].push({ id: row.id, nombre: row.nombre, tipo: row.tipo });
      }
    }

    const result = peliculas.map(p => ({
      ...p,
      articulos: (articleMap[p.id] || []).filter(a => {
        if (tipo_id && a.tipo_articulo_id != tipo_id) return false;
        if (idioma_id && a.idioma_id != idioma_id) return false;
        return true;
      }),
      elenco: elencoMap[p.id] || []
    }));

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST pelicula completa — crea película + artículos + elenco en una transacción
app.post('/api/peliculas/completo', (req, res) => {
  const { titulo, genero_id, duracion, anio, sinopsis, formatos, elenco_director, elenco_reparto } = req.body;

  try {
    const pelicula = validateBody('peliculas', { titulo, genero_id, duracion, anio, sinopsis });
    if (!Array.isArray(formatos) || formatos.length === 0) throw new ValidationError(['Debe agregar al menos un formato']);
    if (formatos.length > 20) throw new ValidationError(['No puede agregar más de 20 formatos a la vez']);
    ensureReference('generos', pelicula.genero_id, 'Género');

    const formatosValidos = formatos.map((formato, index) => {
      try {
        const data = validateBody('articulos', {
          titulo: pelicula.titulo,
          genero_id: pelicula.genero_id,
          tipo_articulo_id: formato.tipo_articulo_id,
          idioma_id: formato.idioma_id,
          duracion: pelicula.duracion,
          anio: pelicula.anio,
          sinopsis: pelicula.sinopsis,
          costo_dia: formato.costo_dia,
          cantidad_disponible: formato.cantidad_disponible
        });
        ensureReference('tipos_articulo', data.tipo_articulo_id, `Tipo del formato ${index + 1}`);
        ensureReference('idiomas', data.idioma_id, `Idioma del formato ${index + 1}`);
        return data;
      } catch (err) {
        if (err instanceof ValidationError) throw new ValidationError(err.errors.map(message => `Formato ${index + 1}: ${message}`));
        throw err;
      }
    });

    const directorText = String(elenco_director || '').trim();
    const repartoText = String(elenco_reparto || '').trim();
    if (directorText.length > 1000 || repartoText.length > 2000) throw new ValidationError(['El texto del elenco es demasiado largo']);
    if (/[<>]/.test(directorText) || /[<>]/.test(repartoText)) throw new ValidationError(['El elenco contiene caracteres no permitidos']);
    let resultId;

    db.transaction(() => {
      const peliStmt = db.prepare('INSERT INTO peliculas (titulo, genero_id, duracion, anio, sinopsis, estado) VALUES (?, ?, ?, ?, ?, ?)');
      const peliInfo = peliStmt.run(pelicula.titulo, pelicula.genero_id, pelicula.duracion || null, pelicula.anio || null, pelicula.sinopsis || null, 'Activo');
      const pelicula_id = peliInfo.lastInsertRowid;
      resultId = pelicula_id;

      let firstArticuloId = null;
      const artStmt = db.prepare('INSERT INTO articulos (pelicula_id, titulo, tipo_articulo_id, genero_id, idioma_id, duracion, anio, sinopsis, costo_dia, cantidad_disponible, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

      for (const fmt of formatosValidos) {
        const artInfo = artStmt.run(
          pelicula_id, pelicula.titulo, fmt.tipo_articulo_id, pelicula.genero_id, fmt.idioma_id,
          pelicula.duracion || null, pelicula.anio || null, pelicula.sinopsis || null,
          fmt.costo_dia, fmt.cantidad_disponible, 'Activo'
        );
        if (firstArticuloId === null) firstArticuloId = artInfo.lastInsertRowid;
      }

      // Process director names (parse comma-separated)
      const directorNames = directorText.split(',').map(s => s.trim()).filter(Boolean);
      const repartoNames = repartoText.split(',').map(s => s.trim()).filter(Boolean);

      const upsertElenco = db.prepare('INSERT OR IGNORE INTO elenco (nombre, tipo) VALUES (?, ?)');
      const getElenco = db.prepare('SELECT id FROM elenco WHERE nombre = ? AND tipo = ?');
      const linkElenco = db.prepare('INSERT OR IGNORE INTO articulos_elenco (articulo_id, elenco_id) VALUES (?, ?)');

      for (const name of directorNames) {
        upsertElenco.run(name, 'Director');
        const existing = getElenco.get(name, 'Director');
        if (existing && firstArticuloId) linkElenco.run(firstArticuloId, existing.id);
      }

      for (const name of repartoNames) {
        upsertElenco.run(name, 'Actor');
        const existing = getElenco.get(name, 'Actor');
        if (existing && firstArticuloId) linkElenco.run(firstArticuloId, existing.id);
      }
    })();

    res.json({ success: true, id: resultId });
  } catch (err) {
    sendError(res, err);
  }
});

// Client hard delete (before generic CRUD to take precedence)
app.delete('/api/clientes/:id/permanente', (req, res) => {
  try {
    const clienteId = req.params.id;

    // Check if client exists
    const cliente = db.prepare('SELECT id, nombre, apellido FROM clientes WHERE id = ?').get(clienteId);
    if (!cliente) return res.status(404).json({ error: 'Cliente no encontrado' });

    // Check for active rentals
    const activas = db.prepare('SELECT COUNT(*) as count FROM rentas WHERE cliente_id = ? AND estado = ?').get(clienteId, 'Activa');
    if (activas.count > 0) {
      return res.status(400).json({ error: `El cliente tiene ${activas.count} renta(s) activa(s). Debe devolver los artículos primero.` });
    }

    db.transaction(() => {
      // Delete returned rentals
      db.prepare('DELETE FROM rentas WHERE cliente_id = ? AND estado = ?').run(clienteId, 'Devuelta');
      // Delete reservations
      db.prepare('DELETE FROM reservas WHERE cliente_id = ?').run(clienteId);
      // Delete the login user account
      db.prepare('DELETE FROM usuarios WHERE email = ?').run(cliente.email);
      // Delete the client
      db.prepare('DELETE FROM clientes WHERE id = ?').run(clienteId);
    })();

    res.json({ success: true, message: `Cliente "${cliente.nombre} ${cliente.apellido}" eliminado permanentemente` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Generate basic CRUD (reservas excluded — has custom handler)
['tipos_articulo', 'elenco', 'generos', 'idiomas', 'clientes', 'empleados', 'peliculas'].forEach(table => generateCRUD(app, table));

// Reservas admin — custom GET with JOINs
app.get('/api/reservas', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT r.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido,
             a.titulo as articulo_titulo, t.descripcion as tipo_articulo,
             i.descripcion as idioma
      FROM reservas r
      JOIN clientes c ON r.cliente_id = c.id
      JOIN articulos a ON r.articulo_id = a.id
      JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
      JOIN idiomas i ON a.idioma_id = i.id
      ORDER BY r.id DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reservas admin — PUT for status updates (admin only)
app.put('/api/reservas/:id', (req, res) => {
  const { estado } = req.body;
  if (!estado) return res.status(400).json({ error: 'Estado requerido' });
  if (!['Completada', 'Cancelada', 'Pendiente'].includes(estado)) {
    return res.status(400).json({ error: 'Estado de reserva no válido' });
  }

  try {
    if (estado === 'Completada') {
      const DIAS_DEFAULT = 3;

      db.transaction(() => {
        const reserva = db.prepare('SELECT * FROM reservas WHERE id = ? AND estado = ?').get(req.params.id, 'Pendiente');
        if (!reserva) throw new Error('Reserva no encontrada o ya procesada');

        const articulo = db.prepare('SELECT costo_dia, cantidad_disponible FROM articulos WHERE id = ?').get(reserva.articulo_id);
        if (!articulo || articulo.cantidad_disponible < 1) throw new Error('Artículo no disponible');

        const hoy = new Date().toISOString().split('T')[0];
        const fin = new Date();
        fin.setDate(fin.getDate() + DIAS_DEFAULT);
        const fechaDevolucion = fin.toISOString().split('T')[0];
        const total = DIAS_DEFAULT * articulo.costo_dia;

        db.prepare(`INSERT INTO rentas (cliente_id, empleado_id, articulo_id, fecha_renta, fecha_devolucion_prevista, costo_dia, dias, total, estado, comentario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activa', ?)`)
          .run(reserva.cliente_id, 1, reserva.articulo_id, hoy, fechaDevolucion, articulo.costo_dia, DIAS_DEFAULT, total, 'Reserva cumplida');

        db.prepare(`UPDATE articulos SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ?`).run(reserva.articulo_id);

        db.prepare(`UPDATE reservas SET estado = ? WHERE id = ?`).run('Completada', req.params.id);
      })();

      res.json({ success: true });
    } else {
      const info = db.prepare(`UPDATE reservas SET estado = ? WHERE id = ?`).run(estado, req.params.id);
      if (info.changes > 0) res.json({ success: true });
      else res.status(404).json({ error: 'Not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- Specific Endpoints ---

// Catálogo Cliente — solo disponibles (legacy)
app.get('/api/catalogo', (req, res) => {
  try {
    const articulos = db.prepare(`
      SELECT a.*, t.descripcion as tipo_articulo, g.descripcion as genero, i.descripcion as idioma
      FROM articulos a
      JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
      JOIN generos g ON a.genero_id = g.id
      JOIN idiomas i ON a.idioma_id = i.id
      WHERE a.estado = 'Activo' AND a.cantidad_disponible > 0
    `).all();
    res.json(articulos);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Catálogo v2 — agrupado por película con todos los formatos y disponibilidad
app.get('/api/catalogo/v2', (req, res) => {
  try {
    const peliculas = db.prepare(`
      SELECT p.*, g.descripcion as genero
      FROM peliculas p
      JOIN generos g ON p.genero_id = g.id
      WHERE p.estado = 'Activo'
      ORDER BY p.titulo
    `).all();

    const formatos = db.prepare(`
      SELECT a.id, a.pelicula_id, a.tipo_articulo_id, t.descripcion as tipo_articulo,
             i.descripcion as idioma, a.costo_dia, a.cantidad_disponible,
             (SELECT fecha_devolucion_prevista FROM rentas 
              WHERE articulo_id = a.id AND estado = 'Activa' 
              ORDER BY fecha_devolucion_prevista DESC LIMIT 1) as dev_estimada
      FROM articulos a
      JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
      JOIN idiomas i ON a.idioma_id = i.id
      WHERE a.estado = 'Activo'
      ORDER BY a.id
    `).all();

    // Group formats by pelicula_id
    const formatMap = {};
    for (const f of formatos) {
      if (!formatMap[f.pelicula_id]) formatMap[f.pelicula_id] = [];
      formatMap[f.pelicula_id].push({
        id: f.id,
        tipo_id: f.tipo_articulo_id,
        tipo: f.tipo_articulo,
        idioma: f.idioma,
        costo_dia: f.costo_dia,
        stock: f.cantidad_disponible,
        disponible: f.cantidad_disponible > 0,
        dev_estimada: f.dev_estimada || null
      });
    }

    // Elenco por pelicula
    const elencoRows = db.prepare(`
      SELECT a.pelicula_id, e.nombre, e.tipo
      FROM elenco e
      JOIN articulos_elenco ae ON e.id = ae.elenco_id
      JOIN articulos a ON ae.articulo_id = a.id
      GROUP BY a.pelicula_id, e.id
      ORDER BY a.pelicula_id, e.tipo, e.nombre
    `).all();
    const elencoMap = {};
    for (const row of elencoRows) {
      if (!elencoMap[row.pelicula_id]) elencoMap[row.pelicula_id] = [];
      elencoMap[row.pelicula_id].push({ nombre: row.nombre, tipo: row.tipo });
    }

    const result = peliculas.map(p => ({
      id: p.id,
      titulo: p.titulo,
      genero: p.genero,
      duracion: p.duracion,
      anio: p.anio,
      sinopsis: p.sinopsis,
      formatos: formatMap[p.id] || [],
      elenco: elencoMap[p.id] || []
    }));

    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Artículos (with JOINs)
app.get('/api/articulos', (req, res) => {
  const search = req.query.search;
  let query = `
    SELECT a.*, t.descripcion as tipo_articulo, g.descripcion as genero, i.descripcion as idioma
    FROM articulos a
    JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
    JOIN generos g ON a.genero_id = g.id
    JOIN idiomas i ON a.idioma_id = i.id
    WHERE a.estado != 'Eliminado'
  `;
  let params = [];
  if (search) {
    query += ` AND a.titulo LIKE ?`;
    params.push(`%${search}%`);
  }
  query += ` ORDER BY a.id DESC`;
  try {
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET single articulo with JOINs (needed for editing)
app.get('/api/articulos/:id', (req, res) => {
  try {
    const row = db.prepare(`
      SELECT a.*, t.descripcion as tipo_articulo, g.descripcion as genero, i.descripcion as idioma
      FROM articulos a
      JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
      JOIN generos g ON a.genero_id = g.id
      JOIN idiomas i ON a.idioma_id = i.id
      WHERE a.id = ?
    `).get(req.params.id);
    if (row) res.json(row);
    else res.status(404).json({ error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST/PUT/DELETE for articulos with auto pelicula_id assignment
function getOrCreatePelicula(titulo, genero_id, duracion, anio, sinopsis) {
  let peli = db.prepare('SELECT id FROM peliculas WHERE titulo = ?').get(titulo);
  if (!peli) {
    const info = db.prepare('INSERT INTO peliculas (titulo, genero_id, duracion, anio, sinopsis) VALUES (?, ?, ?, ?, ?)').run(titulo, genero_id, duracion, anio, sinopsis);
    return info.lastInsertRowid;
  }
  return peli.id;
}

app.post('/api/articulos', (req, res) => {
  try {
    const data = validateBody('articulos', req.body);
    ensureReference('tipos_articulo', data.tipo_articulo_id, 'Tipo de artículo');
    ensureReference('generos', data.genero_id, 'Género');
    ensureReference('idiomas', data.idioma_id, 'Idioma');
    const pelicula_id = getOrCreatePelicula(data.titulo, data.genero_id, data.duracion, data.anio, data.sinopsis);
    const stmt = db.prepare(`INSERT INTO articulos (pelicula_id, titulo, tipo_articulo_id, genero_id, idioma_id, duracion, anio, sinopsis, costo_dia, cantidad_disponible, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const info = stmt.run(pelicula_id, data.titulo, data.tipo_articulo_id, data.genero_id, data.idioma_id, data.duracion || null, data.anio || null, data.sinopsis || null, data.costo_dia, data.cantidad_disponible, data.estado || 'Activo');
    res.status(201).json({ id: info.lastInsertRowid });
  } catch (err) {
    sendError(res, err);
  }
});
app.put('/api/articulos/:id', (req, res) => {
  try {
    const data = validateBody('articulos', req.body);
    ensureReference('tipos_articulo', data.tipo_articulo_id, 'Tipo de artículo');
    ensureReference('generos', data.genero_id, 'Género');
    ensureReference('idiomas', data.idioma_id, 'Idioma');
    const pelicula_id = getOrCreatePelicula(data.titulo, data.genero_id, data.duracion, data.anio, data.sinopsis);
    const stmt = db.prepare(`UPDATE articulos SET pelicula_id=?, titulo=?, tipo_articulo_id=?, genero_id=?, idioma_id=?, duracion=?, anio=?, sinopsis=?, costo_dia=?, cantidad_disponible=?, estado=? WHERE id=?`);
    const info = stmt.run(pelicula_id, data.titulo, data.tipo_articulo_id, data.genero_id, data.idioma_id, data.duracion || null, data.anio || null, data.sinopsis || null, data.costo_dia, data.cantidad_disponible, data.estado || 'Activo', req.params.id);
    if (info.changes > 0) res.json({ id: req.params.id });
    else res.status(404).json({ error: 'Not found' });
  } catch (err) {
    sendError(res, err);
  }
});
app.delete('/api/articulos/:id', (req, res) => {
  try {
    db.prepare(`UPDATE articulos SET estado = 'Inactivo' WHERE id = ?`).run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Articulos Elenco
app.get('/api/articulos/:id/elenco', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT e.* FROM elenco e
      JOIN articulos_elenco ae ON e.id = ae.elenco_id
      WHERE ae.articulo_id = ?
    `).all(req.params.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/articulos/:id/elenco', (req, res) => {
  const articulo_id = Number(req.params.id);
  const elenco_ids = req.body.elenco_ids || [];
  try {
    positiveId(articulo_id, 'Artículo');
    if (!Array.isArray(elenco_ids) || elenco_ids.length > 100) throw new ValidationError(['Lista de elenco no válida']);
    const validIds = elenco_ids.map(id => positiveId(id, 'Integrante del elenco'));
    if (new Set(validIds).size !== validIds.length) throw new ValidationError(['El elenco contiene integrantes duplicados']);
    for (const id of validIds) ensureReference('elenco', id, 'Integrante del elenco');
    db.prepare(`DELETE FROM articulos_elenco WHERE articulo_id = ?`).run(articulo_id);
    const insert = db.prepare(`INSERT INTO articulos_elenco (articulo_id, elenco_id) VALUES (?, ?)`);
    const insertMany = db.transaction((ids) => {
      for (const id of ids) insert.run(articulo_id, id);
    });
    insertMany(validIds);
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
});

// Articulos Elenco por texto (gestionar con nombres en lugar de IDs)
app.post('/api/articulos/:id/elenco/texto', (req, res) => {
  const articulo_id = req.params.id;
  const { director, reparto } = req.body;

  try {
    const directorText = String(director || '').trim();
    const repartoText = String(reparto || '').trim();
    if (directorText.length > 1000 || repartoText.length > 2000) throw new ValidationError(['El texto del elenco es demasiado largo']);
    if (/[<>]/.test(directorText) || /[<>]/.test(repartoText)) throw new ValidationError(['El elenco contiene caracteres no permitidos']);
    if (!db.prepare('SELECT id FROM articulos WHERE id = ?').get(positiveId(articulo_id, 'Artículo'))) throw new ValidationError(['Artículo no encontrado']);
    const directorNames = directorText.split(',').map(s => s.trim()).filter(Boolean);
    const repartoNames = repartoText.split(',').map(s => s.trim()).filter(Boolean);
    if (directorNames.length + repartoNames.length > 100) throw new ValidationError(['No puede agregar más de 100 personas al elenco']);

    db.transaction(() => {
      db.prepare('DELETE FROM articulos_elenco WHERE articulo_id = ?').run(articulo_id);

      const upsertElenco = db.prepare('INSERT OR IGNORE INTO elenco (nombre, tipo) VALUES (?, ?)');
      const getElenco = db.prepare('SELECT id FROM elenco WHERE nombre = ? AND tipo = ?');
      const linkElenco = db.prepare('INSERT OR IGNORE INTO articulos_elenco (articulo_id, elenco_id) VALUES (?, ?)');

      for (const name of directorNames) {
        upsertElenco.run(name, 'Director');
        const existing = getElenco.get(name, 'Director');
        if (existing) linkElenco.run(articulo_id, existing.id);
      }

      for (const name of repartoNames) {
        upsertElenco.run(name, 'Actor');
        const existing = getElenco.get(name, 'Actor');
        if (existing) linkElenco.run(articulo_id, existing.id);
      }
    })();

    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
});

// Rentas
app.get('/api/rentas', (req, res) => {
  try {
    const rows = db.prepare(`
      SELECT r.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, a.titulo as articulo_titulo, 
             e.nombre as empleado_nombre, e.apellido as empleado_apellido
      FROM rentas r
      JOIN clientes c ON r.cliente_id = c.id
      JOIN articulos a ON r.articulo_id = a.id
      JOIN empleados e ON r.empleado_id = e.id
      ORDER BY r.id DESC
    `).all();
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/rentas', (req, res) => {
  const { cliente_id, empleado_id, articulo_id, fecha_renta, fecha_devolucion_prevista, comentario } = req.body;

  try {
    const clienteId = positiveId(cliente_id, 'Cliente');
    const empleadoId = positiveId(empleado_id, 'Empleado');
    const articuloId = positiveId(articulo_id, 'Artículo');
    validateDateRange(fecha_renta, fecha_devolucion_prevista);
    if (!fecha_renta || !fecha_devolucion_prevista) throw new ValidationError(['Ambas fechas son requeridas']);
    if (String(comentario || '').length > 1000) throw new ValidationError(['Comentario no puede superar 1000 caracteres']);
    ensureReference('clientes', clienteId, 'Cliente');
    ensureReference('empleados', empleadoId, 'Empleado');

    db.transaction(() => {
      const articulo = db.prepare(`SELECT costo_dia, cantidad_disponible FROM articulos WHERE id = ? AND estado = 'Activo'`).get(articuloId);
      if (!articulo || articulo.cantidad_disponible <= 0) throw new ValidationError(['Artículo no disponible']);
      
      const start = new Date(fecha_renta);
      const end = new Date(fecha_devolucion_prevista);
      const dias = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
      const total = dias * articulo.costo_dia;

      const stmt = db.prepare(`INSERT INTO rentas (cliente_id, empleado_id, articulo_id, fecha_renta, fecha_devolucion_prevista, costo_dia, dias, total, estado, comentario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activa', ?)`);
      stmt.run(clienteId, empleadoId, articuloId, fecha_renta, fecha_devolucion_prevista, articulo.costo_dia, dias, total, String(comentario || '').trim() || null);
      
      db.prepare(`UPDATE articulos SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ?`).run(articuloId);
    })();
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
});

// Autoservicio: Rentas Cliente
app.post('/api/rentas/cliente', (req, res) => {
  const { articulo_id, fecha_renta, fecha_devolucion_prevista } = req.body;

  try {
    const articuloId = positiveId(articulo_id, 'Artículo');
    validateDateRange(fecha_renta, fecha_devolucion_prevista);
    if (!fecha_renta || !fecha_devolucion_prevista) throw new ValidationError(['Ambas fechas son requeridas']);
    const today = new Date().toISOString().split('T')[0];
    if (fecha_renta < today) throw new ValidationError(['La fecha de renta no puede ser anterior a hoy']);

    const cliente = db.prepare('SELECT id FROM clientes WHERE email = ?').get(req.user.email);
    if (!cliente) throw new ValidationError(['Perfil de cliente no encontrado']);
    
    db.transaction(() => {
      const art = db.prepare("SELECT costo_dia, cantidad_disponible FROM articulos WHERE id = ? AND estado = 'Activo'").get(articuloId);
      if (!art || art.cantidad_disponible < 1) throw new ValidationError(['Artículo no disponible']);
      
      const start = new Date(fecha_renta);
      const end = new Date(fecha_devolucion_prevista);
      let dias = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (dias < 1) dias = 1;
      const total = dias * art.costo_dia;
      
      // employee_id 1 is the Admin/System for web rentals
      const stmt = db.prepare(`INSERT INTO rentas (cliente_id, empleado_id, articulo_id, fecha_renta, fecha_devolucion_prevista, costo_dia, dias, total, estado, comentario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activa', ?)`);
      stmt.run(cliente.id, 1, articuloId, fecha_renta, fecha_devolucion_prevista, art.costo_dia, dias, total, 'Autoservicio Web');
      
      db.prepare(`UPDATE articulos SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ?`).run(articuloId);
    })();
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
});

// Reservas
app.post('/api/reservas', (req, res) => {
  try {
    const articulo_id = positiveId(req.body?.articulo_id, 'Artículo');
    const cliente = db.prepare('SELECT id FROM clientes WHERE email = ?').get(req.user.email);
    if (!cliente) return res.status(400).json({ error: 'Perfil de cliente no encontrado' });

    const articulo = db.prepare('SELECT cantidad_disponible, titulo FROM articulos WHERE id = ? AND estado = ?').get(articulo_id, 'Activo');
    if (!articulo) return res.status(404).json({ error: 'Artículo no encontrado' });

    // Check if already reserved by this client
    const existing = db.prepare('SELECT id, estado FROM reservas WHERE cliente_id = ? AND articulo_id = ? AND estado = ?').get(cliente.id, articulo_id, 'Pendiente');
    if (existing) return res.status(400).json({ error: 'Ya tienes una reserva activa para este formato' });

    // Calculate estimated availability
    const activeRenta = db.prepare(`
      SELECT fecha_devolucion_prevista FROM rentas 
      WHERE articulo_id = ? AND estado = 'Activa' 
      ORDER BY fecha_devolucion_prevista DESC LIMIT 1
    `).get(articulo_id);

    let fechaEstimada;
    if (activeRenta) {
      const d = new Date(activeRenta.fecha_devolucion_prevista);
      d.setDate(d.getDate() + 1);
      fechaEstimada = d.toISOString().split('T')[0];
    } else {
      fechaEstimada = new Date().toISOString().split('T')[0];
    }
    
    const stmt = db.prepare('INSERT INTO reservas (cliente_id, articulo_id, fecha_estimada_disponible) VALUES (?, ?, ?)');
    const info = stmt.run(cliente.id, articulo_id, fechaEstimada);
    res.json({ id: info.lastInsertRowid, fecha_estimada_disponible: fechaEstimada });
  } catch (err) {
    sendError(res, err);
  }
});

app.get('/api/mis-reservas', (req, res) => {
  try {
    const cliente = db.prepare('SELECT id FROM clientes WHERE email = ?').get(req.user.email);
    if (!cliente) return res.json([]);
    const rows = db.prepare(`
      SELECT r.*, a.titulo as articulo_titulo, t.descripcion as tipo_articulo,
             i.descripcion as idioma
      FROM reservas r
      JOIN articulos a ON r.articulo_id = a.id
      JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
      JOIN idiomas i ON a.idioma_id = i.id
      WHERE r.cliente_id = ?
      ORDER BY r.id DESC
    `).all(cliente.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reservas/:id', (req, res) => {
  try {
    const cliente = db.prepare('SELECT id FROM clientes WHERE email = ?').get(req.user.email);
    if (!cliente) return res.status(400).json({ error: 'Perfil de cliente no encontrado' });

    const reserva = db.prepare('SELECT * FROM reservas WHERE id = ? AND cliente_id = ?').get(req.params.id, cliente.id);
    if (!reserva) return res.status(404).json({ error: 'Reserva no encontrada' });

    db.prepare("UPDATE reservas SET estado = 'Cancelada' WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Historial Cliente
app.get('/api/mis-rentas', (req, res) => {
  try {
    const cliente = db.prepare('SELECT id FROM clientes WHERE email = ?').get(req.user.email);
    if (!cliente) return res.json([]);
    const rows = db.prepare(`
      SELECT r.*, a.titulo as articulo_titulo
      FROM rentas r
      JOIN articulos a ON r.articulo_id = a.id
      WHERE r.cliente_id = ? AND r.estado != 'Devuelta'
      ORDER BY r.id DESC
    `).all(cliente.id);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/rentas/:id/devolver', (req, res) => {
  const { fecha_devolucion_real, comentario } = req.body;
  try {
    validateDateRange(fecha_devolucion_real, fecha_devolucion_real);
    if (!fecha_devolucion_real) throw new ValidationError(['Fecha de devolución es obligatoria']);
    if (String(comentario || '').length > 1000) throw new ValidationError(['Comentario no puede superar 1000 caracteres']);
    db.transaction(() => {
      const renta = db.prepare(`SELECT articulo_id, estado, fecha_devolucion_prevista, costo_dia, total FROM rentas WHERE id = ?`).get(req.params.id);
      if (!renta || renta.estado !== 'Activa') throw new Error('Renta no encontrada o ya devuelta');
      
      let finalTotal = renta.total;
      let finalComentario = comentario || '';
      
      const real = new Date(fecha_devolucion_real);
      const prevista = new Date(renta.fecha_devolucion_prevista);
      const diffTime = real - prevista;
      const daysLate = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (daysLate > 0) {
        const penalidad = daysLate * (renta.costo_dia * 1.5); // Costo normal + 50%
        finalTotal += penalidad;
        finalComentario += `\n[PENALIDAD] ${daysLate} días de atraso. Recargo de mora: RD$ ${penalidad.toFixed(2)}`;
      }
      
      db.prepare(`UPDATE rentas SET estado = 'Devuelta', fecha_devolucion_real = ?, comentario = ?, total = ? WHERE id = ?`).run(fecha_devolucion_real, finalComentario.trim(), finalTotal, req.params.id);
      
      db.prepare(`UPDATE articulos SET cantidad_disponible = cantidad_disponible + 1 WHERE id = ?`).run(renta.articulo_id);
    })();
    res.json({ success: true });
  } catch (err) {
    sendError(res, err);
  }
});

// Dashboard KPIs
app.get('/api/dashboard', (req, res) => {
  try {
    const totalArticulos = db.prepare(`SELECT COUNT(*) as c FROM articulos WHERE estado='Activo'`).get().c;
    const rentasActivas = db.prepare(`SELECT COUNT(*) as c FROM rentas WHERE estado='Activa'`).get().c;
    const devPendientesHoy = db.prepare(`SELECT COUNT(*) as c FROM rentas WHERE estado='Activa' AND date(fecha_devolucion_prevista) <= date('now')`).get().c;
    const ingresosMes = db.prepare(`SELECT SUM(total) as t FROM rentas WHERE strftime('%Y-%m', fecha_renta) = strftime('%Y-%m', 'now')`).get().t || 0;
    
    const rentasRecientes = db.prepare(`
      SELECT r.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, a.titulo as articulo_titulo
      FROM rentas r
      JOIN clientes c ON r.cliente_id = c.id
      JOIN articulos a ON r.articulo_id = a.id
      ORDER BY r.id DESC LIMIT 5
    `).all();

    const distTipo = db.prepare(`
      SELECT t.descripcion as label, COUNT(a.id) as count
      FROM articulos a
      JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
      WHERE a.estado='Activo'
      GROUP BY t.id
    `).all();

    res.json({
      kpis: { totalArticulos, rentasActivas, devPendientesHoy, ingresosMes },
      rentasRecientes,
      distribucion: distTipo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Consultas
app.get('/api/consultas', (req, res) => {
  try {
    const {
      cliente_id, empleado_id, fecha_desde, fecha_hasta, articulo_id,
      tipo_articulo_id, genero_id, idioma_id, estado, texto,
      total_min, total_max, orden = 'fecha_desc', limite = '200'
    } = req.query;

    validateDateRange(fecha_desde, fecha_hasta);
    const filters = [];
    const params = [];

    const addIdFilter = (value, column, label) => {
      if (!value) return;
      filters.push(`${column} = ?`);
      params.push(positiveId(value, label));
    };

    addIdFilter(cliente_id, 'r.cliente_id', 'Cliente');
    addIdFilter(empleado_id, 'r.empleado_id', 'Empleado');
    addIdFilter(articulo_id, 'r.articulo_id', 'Artículo');
    addIdFilter(tipo_articulo_id, 'a.tipo_articulo_id', 'Tipo de artículo');
    addIdFilter(genero_id, 'a.genero_id', 'Género');
    addIdFilter(idioma_id, 'a.idioma_id', 'Idioma');

    if (fecha_desde) { filters.push('date(r.fecha_renta) >= date(?)'); params.push(fecha_desde); }
    if (fecha_hasta) { filters.push('date(r.fecha_renta) <= date(?)'); params.push(fecha_hasta); }

    if (estado && estado !== 'Todos') {
      const estados = ['Activa', 'Devuelta', 'Vencida'];
      if (!estados.includes(estado)) throw new ValidationError(['Estado de renta no válido']);
      if (estado === 'Vencida') filters.push("r.estado = 'Activa' AND date(r.fecha_devolucion_prevista) < date('now')");
      else { filters.push('r.estado = ?'); params.push(estado); }
    }

    if (texto) {
      const term = String(texto).trim();
      if (term.length > 100) throw new ValidationError(['Búsqueda no puede superar 100 caracteres']);
      filters.push("(a.titulo LIKE ? OR c.nombre LIKE ? OR c.apellido LIKE ? OR c.email LIKE ? OR e.nombre LIKE ? OR e.apellido LIKE ?)");
      for (let i = 0; i < 6; i++) params.push(`%${term}%`);
    }

    const min = total_min === undefined || total_min === '' ? null : Number(total_min);
    const max = total_max === undefined || total_max === '' ? null : Number(total_max);
    if (min !== null && (!Number.isFinite(min) || min < 0)) throw new ValidationError(['Total mínimo no es válido']);
    if (max !== null && (!Number.isFinite(max) || max < 0)) throw new ValidationError(['Total máximo no es válido']);
    if (min !== null && max !== null && min > max) throw new ValidationError(['Total mínimo no puede ser mayor al máximo']);
    if (min !== null) { filters.push('r.total >= ?'); params.push(min); }
    if (max !== null) { filters.push('r.total <= ?'); params.push(max); }

    const orderOptions = {
      fecha_desc: 'r.fecha_renta DESC, r.id DESC',
      fecha_asc: 'r.fecha_renta ASC, r.id ASC',
      total_desc: 'r.total DESC, r.id DESC',
      total_asc: 'r.total ASC, r.id ASC',
      cliente_asc: 'c.nombre ASC, c.apellido ASC, r.id DESC'
    };
    if (!orderOptions[orden]) throw new ValidationError(['Orden no válido']);
    const limit = Number(limite);
    if (!Number.isInteger(limit) || limit < 1 || limit > 500) throw new ValidationError(['Límite debe estar entre 1 y 500']);

    const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
    const query = `
      SELECT r.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido,
             c.email as cliente_email, a.titulo as articulo_titulo,
             t.descripcion as tipo_articulo, g.descripcion as genero,
             i.descripcion as idioma, e.nombre as empleado_nombre,
             e.apellido as empleado_apellido,
             CASE WHEN r.estado = 'Activa' AND date(r.fecha_devolucion_prevista) < date('now')
                  THEN 'Vencida' ELSE r.estado END as estado_calculado
      FROM rentas r
      JOIN clientes c ON r.cliente_id = c.id
      JOIN articulos a ON r.articulo_id = a.id
      JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
      JOIN generos g ON a.genero_id = g.id
      JOIN idiomas i ON a.idioma_id = i.id
      JOIN empleados e ON r.empleado_id = e.id
      ${where}
      ORDER BY ${orderOptions[orden]}
      LIMIT ?
    `;
    params.push(limit);
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    sendError(res, err);
  }
});

// Reportes
app.get('/api/reportes', (req, res) => {
  const { fecha_desde, fecha_hasta, tipo_articulo_id } = req.query;
  let whereClauses = [];
  let params = [];

  try {
    validateDateRange(fecha_desde, fecha_hasta);
    if (tipo_articulo_id && tipo_articulo_id !== 'Todos') positiveId(tipo_articulo_id, 'Tipo de artículo');
  } catch (err) {
    return sendError(res, err);
  }

  if (fecha_desde) { whereClauses.push(`date(r.fecha_renta) >= date(?)`); params.push(fecha_desde); }
  if (fecha_hasta) { whereClauses.push(`date(r.fecha_renta) <= date(?)`); params.push(fecha_hasta); }
  if (tipo_articulo_id && tipo_articulo_id !== 'Todos') { whereClauses.push(`a.tipo_articulo_id = ?`); params.push(tipo_articulo_id); }

  const whereString = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';

  try {
    const rentas = db.prepare(`
      SELECT r.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, a.titulo as articulo_titulo, t.descripcion as tipo_articulo
      FROM rentas r
      JOIN clientes c ON r.cliente_id = c.id
      JOIN articulos a ON r.articulo_id = a.id
      JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
      ${whereString}
      ORDER BY r.fecha_renta DESC
    `).all(...params);

    let totalRentas = rentas.length;
    let ingresosTotales = rentas.reduce((sum, r) => sum + r.total, 0);
    let promedioRenta = totalRentas > 0 ? ingresosTotales / totalRentas : 0;

    // Articulo mas rentado
    let articuloMasRentado = '';
    if (totalRentas > 0) {
      const artCount = db.prepare(`
        SELECT a.titulo, COUNT(r.id) as count
        FROM rentas r
        JOIN articulos a ON r.articulo_id = a.id
        ${whereString}
        GROUP BY a.id ORDER BY count DESC LIMIT 1
      `).get(...params);
      if (artCount) articuloMasRentado = artCount.titulo;
    }

    res.json({
      summary: { totalRentas, ingresosTotales, promedioRenta, articuloMasRentado },
      data: rentas
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Fallback to SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
