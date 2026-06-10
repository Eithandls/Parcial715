const { db, initDB } = require('./database');
initDB();

try {
  // 1. Add email column if missing
  const userCols = db.prepare('PRAGMA table_info(usuarios)').all();
  if (!userCols.some(c => c.name === 'email')) {
    db.prepare('ALTER TABLE usuarios ADD COLUMN email TEXT').run();
    db.prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_email ON usuarios(email)').run();
    console.log('Email column added safely.');
  } else {
    console.log('Email column already exists.');
  }

  // 2. Add pelicula_id to articulos if missing
  const artCols = db.prepare('PRAGMA table_info(articulos)').all();
  if (!artCols.some(c => c.name === 'pelicula_id')) {
    db.prepare('ALTER TABLE articulos ADD COLUMN pelicula_id INTEGER REFERENCES peliculas(id)').run();
    console.log('pelicula_id column added.');
  }

  // 3. Migrate existing articulos into peliculas (group by distinct titulo)
  const ungrouped = db.prepare('SELECT COUNT(*) as c FROM articulos WHERE pelicula_id IS NULL').get();
  if (ungrouped.c > 0) {
    const distinctTitles = db.prepare(`
      SELECT MIN(id) as id, titulo, genero_id, duracion, anio, sinopsis
      FROM articulos WHERE pelicula_id IS NULL
      GROUP BY titulo
    `).all();

    const insertPeli = db.prepare('INSERT INTO peliculas (titulo, genero_id, duracion, anio, sinopsis) VALUES (?, ?, ?, ?, ?)');
    const updateArt = db.prepare('UPDATE articulos SET pelicula_id = ? WHERE titulo = ? AND pelicula_id IS NULL');

    for (const a of distinctTitles) {
      const info = insertPeli.run(a.titulo, a.genero_id, a.duracion, a.anio, a.sinopsis);
      updateArt.run(info.lastInsertRowid, a.titulo);
    }
    console.log(`Migrated ${distinctTitles.length} películas from existing articles.`);
  } else {
    console.log('Articles already have pelicula_id assigned.');
  }
} catch (e) {
  console.error('Error modifying database:', e.message);
}
