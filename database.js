const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'cinema_club.db');
const db = new Database(dbPath);

function initDB() {
  db.exec(`
    -- Users for login
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      nombre TEXT NOT NULL,
      email TEXT UNIQUE,
      rol TEXT DEFAULT 'empleado',
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS tipos_articulo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descripcion TEXT NOT NULL,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS elenco (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      tipo TEXT NOT NULL, -- Actor, Director, Productor
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS generos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descripcion TEXT NOT NULL,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS idiomas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      descripcion TEXT NOT NULL,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    -- Agrupa títulos de películas (un registro por película, múltiples formatos)
    CREATE TABLE IF NOT EXISTS peliculas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      titulo TEXT NOT NULL,
      genero_id INTEGER NOT NULL,
      duracion INTEGER,
      anio INTEGER,
      sinopsis TEXT,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (genero_id) REFERENCES generos(id)
    );

    CREATE TABLE IF NOT EXISTS articulos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pelicula_id INTEGER,
      titulo TEXT NOT NULL,
      tipo_articulo_id INTEGER NOT NULL,
      genero_id INTEGER NOT NULL,
      idioma_id INTEGER NOT NULL,
      duracion INTEGER,
      anio INTEGER,
      sinopsis TEXT,
      costo_dia REAL NOT NULL DEFAULT 0,
      cantidad_disponible INTEGER DEFAULT 1,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (pelicula_id) REFERENCES peliculas(id),
      FOREIGN KEY (tipo_articulo_id) REFERENCES tipos_articulo(id),
      FOREIGN KEY (genero_id) REFERENCES generos(id),
      FOREIGN KEY (idioma_id) REFERENCES idiomas(id)
    );

    CREATE TABLE IF NOT EXISTS articulos_elenco (
      articulo_id INTEGER NOT NULL,
      elenco_id INTEGER NOT NULL,
      PRIMARY KEY (articulo_id, elenco_id),
      FOREIGN KEY (articulo_id) REFERENCES articulos(id),
      FOREIGN KEY (elenco_id) REFERENCES elenco(id)
    );

    CREATE TABLE IF NOT EXISTS clientes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      cedula TEXT UNIQUE,
      telefono TEXT,
      email TEXT,
      direccion TEXT,
      tipo_persona TEXT DEFAULT 'Fisica', -- Fisica, Juridica
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS empleados (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nombre TEXT NOT NULL,
      apellido TEXT NOT NULL,
      cedula TEXT UNIQUE,
      cargo TEXT,
      tanda TEXT, -- Matutina, Vespertina, Nocturna
      porciento_comision REAL DEFAULT 0,
      fecha_ingreso DATE,
      estado TEXT DEFAULT 'Activo',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS rentas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      empleado_id INTEGER NOT NULL,
      articulo_id INTEGER NOT NULL,
      fecha_renta DATE NOT NULL,
      fecha_devolucion_prevista DATE NOT NULL,
      fecha_devolucion_real DATE,
      costo_dia REAL NOT NULL,
      dias INTEGER NOT NULL,
      total REAL NOT NULL,
      estado TEXT DEFAULT 'Activa', -- Activa, Devuelta, Vencida
      comentario TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (empleado_id) REFERENCES empleados(id),
      FOREIGN KEY (articulo_id) REFERENCES articulos(id)
    );

    -- Reservas anticipadas para cuando un formato está agotado
    CREATE TABLE IF NOT EXISTS reservas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cliente_id INTEGER NOT NULL,
      articulo_id INTEGER NOT NULL,
      fecha_reserva DATETIME DEFAULT CURRENT_TIMESTAMP,
      fecha_estimada_disponible DATE,
      estado TEXT DEFAULT 'Pendiente', -- Pendiente, Completada, Cancelada
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES clientes(id),
      FOREIGN KEY (articulo_id) REFERENCES articulos(id)
    );
  `);
  console.log('Database initialized successfully.');
}

module.exports = { db, initDB };
