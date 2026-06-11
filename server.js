const express = require('express');
const cors = require('cors');
const { db } = require('./database');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Simple Token-based Auth (In-memory)
const activeTokens = new Map();

// Admin fijo (no necesita estar en la DB)
const ADMIN_USER = { id: 0, username: 'admin', nombre: 'Administrador', email: 'admin@cinemaclub.com', rol: 'admin' };

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  // Admin hardcodeado
  if (username === 'admin' && password === '1234') {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    activeTokens.set(token, ADMIN_USER);
    return res.json({ token, user: ADMIN_USER });
  }

  // Clientes registrados en DB
  const user = db.prepare('SELECT id, username, nombre, email, rol FROM usuarios WHERE username = ? AND password = ? AND estado = ?').get(username, password, 'Activo');
  
  if (user) {
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    activeTokens.set(token, user);
    res.json({ token, user });
  } else {
    res.status(401).json({ error: 'Credenciales inválidas o usuario inactivo' });
  }
});

app.post('/api/auth/register', (req, res) => {
  const { nombre, email, username, password, cedula, telefono } = req.body;
  
  if (!nombre || !email || !username || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios' });
  }

  try {
    // Siempre se registra como cliente
    const stmt = db.prepare(`INSERT INTO usuarios (nombre, email, username, password, rol) VALUES (?, ?, ?, ?, ?)`);
    const info = stmt.run(nombre, email, username, password, 'cliente');
    
    // Crear perfil de cliente automáticamente
    try {
      db.prepare(`INSERT INTO clientes (nombre, apellido, email, cedula, telefono) VALUES (?, '', ?, ?, ?)`).run(nombre, email, cedula || null, telefono || null);
    } catch (e) { console.error('Error creando cliente:', e.message); }
    
    const user = { id: info.lastInsertRowid, username, nombre, email, rol: 'cliente' };
    const token = Math.random().toString(36).substring(2) + Date.now().toString(36);
    activeTokens.set(token, user);
    
    res.json({ token, user });
  } catch (err) {
    if (err.message.includes('UNIQUE constraint failed')) {
      res.status(400).json({ error: 'El nombre de usuario o correo ya está en uso' });
    } else {
      res.status(500).json({ error: err.message });
    }
  }
});

app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return res.status(401).json({ error: 'No token provided' });
  
  const token = authHeader.split(' ')[1];
  const user = activeTokens.get(token);
  
  if (user) res.json({ user });
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
  const user = activeTokens.get(token);
  if (!user) return res.status(401).json({ error: 'Invalid or expired token' });
  
  req.user = user;
  next();
};

app.use('/api', authMiddleware); // Protect all API routes except auth

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
    const keys = Object.keys(req.body);
    const values = Object.values(req.body);
    const placeholders = keys.map(() => '?').join(',');
    try {
      const stmt = db.prepare(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`);
      const info = stmt.run(...values);
      res.json({ id: info.lastInsertRowid, ...req.body });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put(`/api/${table}/:id`, (req, res) => {
    const keys = Object.keys(req.body);
    const values = Object.values(req.body);
    const setClause = keys.map(k => `${k} = ?`).join(',');
    try {
      const stmt = db.prepare(`UPDATE ${table} SET ${setClause} WHERE id = ?`);
      const info = stmt.run(...values, req.params.id);
      if (info.changes > 0) res.json({ id: req.params.id, ...req.body });
      else res.status(404).json({ error: 'Not found' });
    } catch (err) {
      res.status(500).json({ error: err.message });
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

  if (!titulo || !genero_id) {
    return res.status(400).json({ error: 'Título y género son requeridos' });
  }
  if (!formatos || formatos.length === 0) {
    return res.status(400).json({ error: 'Debe agregar al menos un formato' });
  }

  try {
    let resultId;

    db.transaction(() => {
      const peliStmt = db.prepare('INSERT INTO peliculas (titulo, genero_id, duracion, anio, sinopsis, estado) VALUES (?, ?, ?, ?, ?, ?)');
      const peliInfo = peliStmt.run(titulo, genero_id, duracion || null, anio || null, sinopsis || null, 'Activo');
      const pelicula_id = peliInfo.lastInsertRowid;
      resultId = pelicula_id;

      let firstArticuloId = null;
      const artStmt = db.prepare('INSERT INTO articulos (pelicula_id, titulo, tipo_articulo_id, genero_id, idioma_id, duracion, anio, sinopsis, costo_dia, cantidad_disponible, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');

      for (const fmt of formatos) {
        const artInfo = artStmt.run(
          pelicula_id, titulo, fmt.tipo_articulo_id, genero_id, fmt.idioma_id,
          duracion || null, anio || null, sinopsis || null,
          fmt.costo_dia || 0, fmt.cantidad_disponible || 1, 'Activo'
        );
        if (firstArticuloId === null) firstArticuloId = artInfo.lastInsertRowid;
      }

      // Process director names (parse comma-separated)
      const directorNames = (elenco_director || '').split(',').map(s => s.trim()).filter(Boolean);
      const repartoNames = (elenco_reparto || '').split(',').map(s => s.trim()).filter(Boolean);

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
    res.status(500).json({ error: err.message });
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
  const { titulo, tipo_articulo_id, genero_id, idioma_id, duracion, anio, sinopsis, costo_dia, cantidad_disponible, estado } = req.body;
  try {
    const pelicula_id = getOrCreatePelicula(titulo, genero_id, duracion, anio, sinopsis);
    const stmt = db.prepare(`INSERT INTO articulos (pelicula_id, titulo, tipo_articulo_id, genero_id, idioma_id, duracion, anio, sinopsis, costo_dia, cantidad_disponible, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const info = stmt.run(pelicula_id, titulo, tipo_articulo_id, genero_id, idioma_id, duracion, anio, sinopsis, costo_dia, cantidad_disponible, estado);
    res.json({ id: info.lastInsertRowid });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
app.put('/api/articulos/:id', (req, res) => {
  const { titulo, tipo_articulo_id, genero_id, idioma_id, duracion, anio, sinopsis, costo_dia, cantidad_disponible, estado } = req.body;
  try {
    const pelicula_id = getOrCreatePelicula(titulo, genero_id, duracion, anio, sinopsis);
    const stmt = db.prepare(`UPDATE articulos SET pelicula_id=?, titulo=?, tipo_articulo_id=?, genero_id=?, idioma_id=?, duracion=?, anio=?, sinopsis=?, costo_dia=?, cantidad_disponible=?, estado=? WHERE id=?`);
    const info = stmt.run(pelicula_id, titulo, tipo_articulo_id, genero_id, idioma_id, duracion, anio, sinopsis, costo_dia, cantidad_disponible, estado, req.params.id);
    if (info.changes > 0) res.json({ id: req.params.id });
    else res.status(404).json({ error: 'Not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
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
  const articulo_id = req.params.id;
  const elenco_ids = req.body.elenco_ids || [];
  try {
    db.prepare(`DELETE FROM articulos_elenco WHERE articulo_id = ?`).run(articulo_id);
    const insert = db.prepare(`INSERT INTO articulos_elenco (articulo_id, elenco_id) VALUES (?, ?)`);
    const insertMany = db.transaction((ids) => {
      for (const id of ids) insert.run(articulo_id, id);
    });
    insertMany(elenco_ids);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Articulos Elenco por texto (gestionar con nombres en lugar de IDs)
app.post('/api/articulos/:id/elenco/texto', (req, res) => {
  const articulo_id = req.params.id;
  const { director, reparto } = req.body;

  try {
    const directorNames = (director || '').split(',').map(s => s.trim()).filter(Boolean);
    const repartoNames = (reparto || '').split(',').map(s => s.trim()).filter(Boolean);

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
    res.status(500).json({ error: err.message });
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
  
  if (!fecha_renta || !fecha_devolucion_prevista) {
    return res.status(400).json({ error: 'Ambas fechas son requeridas' });
  }
  const rentaDate = new Date(fecha_renta);
  const devDate = new Date(fecha_devolucion_prevista);
  if (devDate < rentaDate) {
    return res.status(400).json({ error: 'La fecha de devolución no puede ser anterior a la fecha de renta' });
  }

  try {
    db.transaction(() => {
      const articulo = db.prepare(`SELECT costo_dia, cantidad_disponible FROM articulos WHERE id = ?`).get(articulo_id);
      if (!articulo || articulo.cantidad_disponible <= 0) throw new Error('Artículo no disponible');
      
      const start = new Date(fecha_renta);
      const end = new Date(fecha_devolucion_prevista);
      const dias = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) || 1;
      const total = dias * articulo.costo_dia;

      const stmt = db.prepare(`INSERT INTO rentas (cliente_id, empleado_id, articulo_id, fecha_renta, fecha_devolucion_prevista, costo_dia, dias, total, estado, comentario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activa', ?)`);
      stmt.run(cliente_id, empleado_id, articulo_id, fecha_renta, fecha_devolucion_prevista, articulo.costo_dia, dias, total, comentario);
      
      db.prepare(`UPDATE articulos SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ?`).run(articulo_id);
    })();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Autoservicio: Rentas Cliente
app.post('/api/rentas/cliente', (req, res) => {
  const { articulo_id, fecha_renta, fecha_devolucion_prevista } = req.body;

  if (!fecha_renta || !fecha_devolucion_prevista) {
    return res.status(400).json({ error: 'Ambas fechas son requeridas' });
  }
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const rentaDate = new Date(fecha_renta);
  const devDate = new Date(fecha_devolucion_prevista);
  if (devDate < rentaDate) {
    return res.status(400).json({ error: 'La fecha de devolución no puede ser anterior a la fecha de renta' });
  }
  if (rentaDate < hoy) {
    return res.status(400).json({ error: 'La fecha de renta no puede ser anterior a hoy' });
  }

  try {
    const cliente = db.prepare('SELECT id FROM clientes WHERE email = ?').get(req.user.email);
    if (!cliente) throw new Error('Perfil de cliente no encontrado');
    
    db.transaction(() => {
      const art = db.prepare('SELECT costo_dia, cantidad_disponible FROM articulos WHERE id = ?').get(articulo_id);
      if (!art || art.cantidad_disponible < 1) throw new Error('Artículo no disponible');
      
      const start = new Date(fecha_renta);
      const end = new Date(fecha_devolucion_prevista);
      let dias = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
      if (dias < 1) dias = 1;
      const total = dias * art.costo_dia;
      
      // employee_id 1 is the Admin/System for web rentals
      const stmt = db.prepare(`INSERT INTO rentas (cliente_id, empleado_id, articulo_id, fecha_renta, fecha_devolucion_prevista, costo_dia, dias, total, estado, comentario) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Activa', ?)`);
      stmt.run(cliente.id, 1, articulo_id, fecha_renta, fecha_devolucion_prevista, art.costo_dia, dias, total, 'Autoservicio Web');
      
      db.prepare(`UPDATE articulos SET cantidad_disponible = cantidad_disponible - 1 WHERE id = ?`).run(articulo_id);
    })();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reservas
app.post('/api/reservas', (req, res) => {
  const { articulo_id } = req.body;
  try {
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
    res.status(500).json({ error: err.message });
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
    res.status(500).json({ error: err.message });
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
  const { cliente_id, fecha_desde, fecha_hasta, articulo_id, tipo_articulo_id, estado } = req.query;
  let query = `
    SELECT r.*, c.nombre as cliente_nombre, c.apellido as cliente_apellido, a.titulo as articulo_titulo, t.descripcion as tipo_articulo
    FROM rentas r
    JOIN clientes c ON r.cliente_id = c.id
    JOIN articulos a ON r.articulo_id = a.id
    JOIN tipos_articulo t ON a.tipo_articulo_id = t.id
    WHERE 1=1
  `;
  let params = [];

  if (cliente_id) { query += ` AND r.cliente_id = ?`; params.push(cliente_id); }
  if (fecha_desde) { query += ` AND date(r.fecha_renta) >= date(?)`; params.push(fecha_desde); }
  if (fecha_hasta) { query += ` AND date(r.fecha_renta) <= date(?)`; params.push(fecha_hasta); }
  if (articulo_id) { query += ` AND r.articulo_id = ?`; params.push(articulo_id); }
  if (tipo_articulo_id) { query += ` AND a.tipo_articulo_id = ?`; params.push(tipo_articulo_id); }
  if (estado && estado !== 'Todos') { query += ` AND r.estado = ?`; params.push(estado); }

  query += ` ORDER BY r.fecha_renta DESC`;

  try {
    const rows = db.prepare(query).all(...params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Reportes
app.get('/api/reportes', (req, res) => {
  const { fecha_desde, fecha_hasta, tipo_articulo_id } = req.query;
  let whereClauses = [];
  let params = [];

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
