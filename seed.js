const fs = require('fs');
const path = require('path');
const dbPath = path.join(__dirname, 'cinema_club.db');

// Delete existing DB to start fresh
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
}

const { db, initDB } = require('./database');
const { hashPassword } = require('./security');
initDB();

console.log('Seeding database with demo data...');

db.transaction(() => {
  // Usuarios demo para clientes registrados (deben coincidir email con tabla clientes)
  const insertUsuario = db.prepare(`INSERT INTO usuarios (username, password, nombre, email, rol) VALUES (?, ?, ?, ?, ?)`);
  insertUsuario.run('admin', hashPassword('1234'), 'Administrador', 'admin@cinemaclub.com', 'admin');
  insertUsuario.run('empleado', hashPassword('empleado1'), 'Operador Cinema Club', 'empleado@cinemaclub.com', 'empleado');
  insertUsuario.run('carlos', hashPassword('carlos1'), 'Carlos Pérez', 'carlos@email.com', 'cliente');
  insertUsuario.run('maria', hashPassword('maria1'), 'María Gómez', 'maria@email.com', 'cliente');

  // Tipos de Articulo
  const insertTipo = db.prepare(`INSERT INTO tipos_articulo (descripcion) VALUES (?)`);
  const tDvd = insertTipo.run('DVD Película').lastInsertRowid;
  const tBlu = insertTipo.run('BLU-Ray Película').lastInsertRowid;
  const tCd = insertTipo.run('CD Música').lastInsertRowid;

  // Generos
  const insertGenero = db.prepare(`INSERT INTO generos (descripcion) VALUES (?)`);
  const gDrama = insertGenero.run('Drama').lastInsertRowid;
  const gComedia = insertGenero.run('Comedia').lastInsertRowid;
  const gSciFi = insertGenero.run('Ciencia Ficción').lastInsertRowid;
  const gAccion = insertGenero.run('Acción').lastInsertRowid;
  const gRomance = insertGenero.run('Romance').lastInsertRowid;
  const gAnimacion = insertGenero.run('Animación').lastInsertRowid;
  insertGenero.run('Terror');
  insertGenero.run('Documental');
  const gMusica = insertGenero.run('Música').lastInsertRowid;

  // Idiomas
  const insertIdioma = db.prepare(`INSERT INTO idiomas (descripcion) VALUES (?)`);
  const iEsp = insertIdioma.run('Español').lastInsertRowid;
  const iIng = insertIdioma.run('Inglés').lastInsertRowid;
  const iFra = insertIdioma.run('Francés').lastInsertRowid;
  const iPor = insertIdioma.run('Portugués').lastInsertRowid;
  insertIdioma.run('Italiano');
  insertIdioma.run('Alemán');

  // Elenco
  const insertElenco = db.prepare(`INSERT INTO elenco (nombre, tipo) VALUES (?, ?)`);
  const e1 = insertElenco.run('Leonardo DiCaprio', 'Actor').lastInsertRowid;
  const e2 = insertElenco.run('Christopher Nolan', 'Director').lastInsertRowid;
  const e3 = insertElenco.run('Margot Robbie', 'Actor').lastInsertRowid;
  const e4 = insertElenco.run('Greta Gerwig', 'Director').lastInsertRowid;
  const e5 = insertElenco.run('Morgan Freeman', 'Actor').lastInsertRowid;
  const e6 = insertElenco.run('Quentin Tarantino', 'Director').lastInsertRowid;
  const e7 = insertElenco.run('Scarlett Johansson', 'Actor').lastInsertRowid;
  const e8 = insertElenco.run('Denis Villeneuve', 'Director').lastInsertRowid;
  const e9 = insertElenco.run('Ana de Armas', 'Actor').lastInsertRowid;
  const e10 = insertElenco.run('Pedro Almodóvar', 'Director').lastInsertRowid;
  const e11 = insertElenco.run('Keanu Reeves', 'Actor').lastInsertRowid;
  const e12 = insertElenco.run('Lana Wachowski', 'Director').lastInsertRowid;
  const e13 = insertElenco.run('Sam Neill', 'Actor').lastInsertRowid;
  const e14 = insertElenco.run('Steven Spielberg', 'Director').lastInsertRowid;
  const e15 = insertElenco.run('Michael J. Fox', 'Actor').lastInsertRowid;
  const e16 = insertElenco.run('Robert Zemeckis', 'Director').lastInsertRowid;
  const e17 = insertElenco.run('Russell Crowe', 'Actor').lastInsertRowid;
  const e18 = insertElenco.run('Ridley Scott', 'Director').lastInsertRowid;
  const e19 = insertElenco.run('Michael Jackson', 'Artista').lastInsertRowid;
  const e20 = insertElenco.run('The Beatles', 'Artista').lastInsertRowid;
  const e21 = insertElenco.run('Daft Punk', 'Artista').lastInsertRowid;
  const e22 = insertElenco.run('Adele', 'Artista').lastInsertRowid;

  // Peliculas (agrupador de títulos — cada una tiene múltiples formatos)
  const insertPelicula = db.prepare(`INSERT INTO peliculas (titulo, genero_id, duracion, anio, sinopsis) VALUES (?, ?, ?, ?, ?)`);
  const pInception = insertPelicula.run('Inception', gSciFi, 148, 2010, 'Un ladrón que roba secretos corporativos usando tecnología de sueños compartidos..').lastInsertRowid;
  const pBarbie = insertPelicula.run('Barbie', gComedia, 114, 2023, 'Vivir en Barbie Land es perfecto hasta que empiezas a hacer preguntas..').lastInsertRowid;
  const pDarkKnight = insertPelicula.run('The Dark Knight', gAccion, 152, 2008, 'Batman se enfrenta al Joker en una lucha por el alma de Gotham.').lastInsertRowid;
  const pPulpFiction = insertPelicula.run('Pulp Fiction', gDrama, 154, 1994, 'Las vidas de dos mafiosos, un boxeador y un par de delincuentes se entrelazan.').lastInsertRowid;
  const pDune = insertPelicula.run('Dune', gSciFi, 155, 2021, 'El viaje de un héroe mítico hacia el planeta más peligroso del universo.').lastInsertRowid;
  const pInterestelar = insertPelicula.run('Interstellar', gSciFi, 169, 2014, 'Exploradores viajan por un agujero de gusano buscando un nuevo hogar para la humanidad.').lastInsertRowid;
  const pBladeRunner = insertPelicula.run('Blade Runner 2049', gSciFi, 164, 2017, 'Un nuevo blade runner descubre un secreto que podría sumir a la sociedad en el caos.').lastInsertRowid;
  const pDolorGloria = insertPelicula.run('Dolor y Gloria', gDrama, 113, 2019, 'Un director de cine reflexiona sobre su vida y sus decisiones.').lastInsertRowid;
  const pChihiro = insertPelicula.run('El viaje de Chihiro', gAnimacion, 125, 2001, 'Una niña viaja a un mundo mágico para salvar a sus padres.').lastInsertRowid;

  // Nuevas películas con múltiples formatos (Blu-ray + DVD)
  const pMatrix = insertPelicula.run('The Matrix', gSciFi, 136, 1999, 'Un programador descubre que la realidad es una simulación creada por máquinas inteligentes.').lastInsertRowid;
  const pJurassicPark = insertPelicula.run('Jurassic Park', gAccion, 127, 1993, 'En una isla remota, un parque con dinosaurios clonados se vuelve una pesadilla.').lastInsertRowid;
  const pBackToFuture = insertPelicula.run('Back to the Future', gSciFi, 116, 1985, 'Un adolescente viaja al pasado en un DeLorean modificado por un científico excéntrico.').lastInsertRowid;
  const pGladiator = insertPelicula.run('Gladiator', gAccion, 155, 2000, 'Un general romano traicionado busca venganza como gladiador en el Coliseo.').lastInsertRowid;

  // Música (CD solamente)
  const pThriller = insertPelicula.run('Thriller', gMusica, 42, 1982, 'El álbum más vendido de la historia, con icónicos temas pop y videoclips revolucionarios.').lastInsertRowid;
  const pAbbeyRoad = insertPelicula.run('Abbey Road', gMusica, 47, 1969, 'El legendario álbum de The Beatles con su emblemática portada en el paso de cebra.').lastInsertRowid;
  const pRAM = insertPelicula.run('Random Access Memories', gMusica, 74, 2013, 'El aclamado álbum de Daft Punk que fusiona funk, disco y electrónica.').lastInsertRowid;
  const p21 = insertPelicula.run('21', gMusica, 48, 2011, 'El álbum de Adele que rompió récords con baladas de desamor y soul.').lastInsertRowid;

  // Greatest Hits 80s ahora en Música
  const pHits80s = insertPelicula.run('Greatest Hits 80s', gMusica, 60, 1985, 'Colección de los mejores éxitos musicales de los años 80.').lastInsertRowid;

  // Articulos (formato físico por película — varios por película para demo multi-formato)
  const insertArticulo = db.prepare(`INSERT INTO articulos (pelicula_id, titulo, tipo_articulo_id, genero_id, idioma_id, duracion, anio, sinopsis, costo_dia, cantidad_disponible) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  // ===== PELÍCULAS CON BLU-RAY + DVD =====

  // Inception: Blu-ray (stock 3, disponible) + DVD (stock 2, disponible)
  const a1 = insertArticulo.run(pInception, 'Inception', tBlu, gSciFi, iIng, 148, 2010, null, 150, 3).lastInsertRowid;
  const a1dvd = insertArticulo.run(pInception, 'Inception', tDvd, gSciFi, iEsp, 148, 2010, null, 100, 2).lastInsertRowid;

  // Barbie: solo DVD
  const a2 = insertArticulo.run(pBarbie, 'Barbie', tDvd, gComedia, iIng, 114, 2023, null, 100, 5).lastInsertRowid;

  // Dark Knight: Blu-ray (stock 2), DVD (stock 0 — agotado para probar reserva)
  const a3 = insertArticulo.run(pDarkKnight, 'The Dark Knight', tBlu, gAccion, iIng, 152, 2008, null, 120, 2).lastInsertRowid;
  const a3dvd = insertArticulo.run(pDarkKnight, 'The Dark Knight', tDvd, gAccion, iEsp, 152, 2008, null, 80, 0).lastInsertRowid;

  // Pulp Fiction: DVD (stock 0 — agotado), Blu-ray (stock 2, disponible)
  const a4 = insertArticulo.run(pPulpFiction, 'Pulp Fiction', tDvd, gDrama, iIng, 154, 1994, null, 80, 0).lastInsertRowid;
  const a4blu = insertArticulo.run(pPulpFiction, 'Pulp Fiction', tBlu, gDrama, iIng, 154, 1994, null, 120, 2).lastInsertRowid;

  // Dune: solo Blu-ray
  const a5 = insertArticulo.run(pDune, 'Dune', tBlu, gSciFi, iEsp, 155, 2021, null, 150, 2).lastInsertRowid;

  // Dolor y Gloria: solo DVD
  const a6 = insertArticulo.run(pDolorGloria, 'Dolor y Gloria', tDvd, gDrama, iEsp, 113, 2019, null, 90, 3).lastInsertRowid;

  // Chihiro: solo DVD
  const a7 = insertArticulo.run(pChihiro, 'El viaje de Chihiro', tDvd, gAnimacion, iEsp, 125, 2001, null, 80, 2).lastInsertRowid;

  // Blade Runner 2049: Blu-ray (stock 0 — agotado), DVD (stock 1, disponible)
  const a8 = insertArticulo.run(pBladeRunner, 'Blade Runner 2049', tBlu, gSciFi, iIng, 164, 2017, null, 120, 0).lastInsertRowid;
  const a8dvd = insertArticulo.run(pBladeRunner, 'Blade Runner 2049', tDvd, gSciFi, iEsp, 164, 2017, null, 90, 1).lastInsertRowid;

  // Interstellar: Blu-ray (stock 4), DVD (stock 0 — agotado)
  const a9 = insertArticulo.run(pInterestelar, 'Interstellar', tBlu, gSciFi, iIng, 169, 2014, null, 140, 4).lastInsertRowid;
  const a9dvd = insertArticulo.run(pInterestelar, 'Interstellar', tDvd, gSciFi, iEsp, 169, 2014, null, 100, 0).lastInsertRowid;

  // The Matrix: Blu-ray (stock 3) + DVD (stock 2)
  const aMatrixBlu = insertArticulo.run(pMatrix, 'The Matrix', tBlu, gSciFi, iIng, 136, 1999, null, 130, 3).lastInsertRowid;
  const aMatrixDvd = insertArticulo.run(pMatrix, 'The Matrix', tDvd, gSciFi, iEsp, 136, 1999, null, 90, 2).lastInsertRowid;

  // Jurassic Park: Blu-ray (stock 2) + DVD (stock 4)
  const aJurassicBlu = insertArticulo.run(pJurassicPark, 'Jurassic Park', tBlu, gAccion, iIng, 127, 1993, null, 120, 2).lastInsertRowid;
  const aJurassicDvd = insertArticulo.run(pJurassicPark, 'Jurassic Park', tDvd, gAccion, iEsp, 127, 1993, null, 80, 4).lastInsertRowid;

  // Back to the Future: Blu-ray (stock 1) + DVD (stock 3)
  const aBackBlu = insertArticulo.run(pBackToFuture, 'Back to the Future', tBlu, gSciFi, iIng, 116, 1985, null, 110, 1).lastInsertRowid;
  const aBackDvd = insertArticulo.run(pBackToFuture, 'Back to the Future', tDvd, gSciFi, iEsp, 116, 1985, null, 75, 3).lastInsertRowid;

  // Gladiator: Blu-ray (stock 0 — agotado) + DVD (stock 2, disponible)
  const aGladBlu = insertArticulo.run(pGladiator, 'Gladiator', tBlu, gAccion, iIng, 155, 2000, null, 130, 0).lastInsertRowid;
  const aGladDvd = insertArticulo.run(pGladiator, 'Gladiator', tDvd, gAccion, iEsp, 155, 2000, null, 90, 2).lastInsertRowid;

  // ===== MÚSICA (SOLO CD) =====

  // Thriller — Michael Jackson (CD)
  const aThriller = insertArticulo.run(pThriller, 'Thriller', tCd, gMusica, iIng, 42, 1982, null, 40, 5).lastInsertRowid;

  // Abbey Road — The Beatles (CD)
  const aAbbey = insertArticulo.run(pAbbeyRoad, 'Abbey Road', tCd, gMusica, iIng, 47, 1969, null, 35, 3).lastInsertRowid;

  // Random Access Memories — Daft Punk (CD)
  const aRAM = insertArticulo.run(pRAM, 'Random Access Memories', tCd, gMusica, iIng, 74, 2013, null, 45, 4).lastInsertRowid;

  // 21 — Adele (CD)
  const a21 = insertArticulo.run(p21, '21', tCd, gMusica, iEsp, 48, 2011, null, 40, 6).lastInsertRowid;

  // Greatest Hits 80s: solo CD
  const a10 = insertArticulo.run(pHits80s, 'Greatest Hits 80s', tCd, gMusica, iIng, 60, 1985, null, 50, 10).lastInsertRowid;

  // Articulos Elenco
  const insertArtEle = db.prepare(`INSERT INTO articulos_elenco (articulo_id, elenco_id) VALUES (?, ?)`);
  // Inception
  insertArtEle.run(a1, e1); insertArtEle.run(a1, e2);
  insertArtEle.run(a1dvd, e1); insertArtEle.run(a1dvd, e2);
  // Barbie
  insertArtEle.run(a2, e3); insertArtEle.run(a2, e4);
  // Dark Knight
  insertArtEle.run(a3, e2); insertArtEle.run(a3dvd, e2);
  // Pulp Fiction
  insertArtEle.run(a4, e6); insertArtEle.run(a4blu, e6);
  // Dune
  insertArtEle.run(a5, e8);
  // Dolor y Gloria
  insertArtEle.run(a6, e10);
  // Blade Runner
  insertArtEle.run(a8, e9); insertArtEle.run(a8, e8);
  insertArtEle.run(a8dvd, e9); insertArtEle.run(a8dvd, e8);
  // Interstellar
  insertArtEle.run(a9, e5); insertArtEle.run(a9, e2);
  // Matrix
  insertArtEle.run(aMatrixBlu, e11); insertArtEle.run(aMatrixBlu, e12);
  insertArtEle.run(aMatrixDvd, e11); insertArtEle.run(aMatrixDvd, e12);
  // Jurassic Park
  insertArtEle.run(aJurassicBlu, e13); insertArtEle.run(aJurassicBlu, e14);
  insertArtEle.run(aJurassicDvd, e13); insertArtEle.run(aJurassicDvd, e14);
  // Back to the Future
  insertArtEle.run(aBackBlu, e15); insertArtEle.run(aBackBlu, e16);
  insertArtEle.run(aBackDvd, e15); insertArtEle.run(aBackDvd, e16);
  // Gladiator
  insertArtEle.run(aGladBlu, e17); insertArtEle.run(aGladBlu, e18);
  insertArtEle.run(aGladDvd, e17); insertArtEle.run(aGladDvd, e18);
  // Música
  insertArtEle.run(aThriller, e19);
  insertArtEle.run(aAbbey, e20);
  insertArtEle.run(aRAM, e21);
  insertArtEle.run(a21, e22);
  insertArtEle.run(a10, e20);

  // Clientes
  const insertCliente = db.prepare(`INSERT INTO clientes (nombre, apellido, cedula, telefono, email, direccion) VALUES (?, ?, ?, ?, ?, ?)`);
  const c1 = insertCliente.run('Carlos', 'Pérez', '402-1234567-1', '809-555-0001', 'carlos@email.com', 'Ensanche Naco').lastInsertRowid;
  const c2 = insertCliente.run('María', 'Gómez', '001-9876543-2', '809-555-0002', 'maria@email.com', 'Piantini').lastInsertRowid;
  const c3 = insertCliente.run('José', 'Rodríguez', '031-4567890-3', '829-555-0003', 'jose@email.com', 'Gazcue').lastInsertRowid;
  const c4 = insertCliente.run('Ana', 'Martínez', '402-3334445-4', '849-555-0004', 'ana@email.com', 'Los Cacicazgos').lastInsertRowid;
  const c5 = insertCliente.run('Luis', 'Fernández', '001-2223334-5', '809-555-0005', 'luis@email.com', 'Bella Vista').lastInsertRowid;

  // Empleados
  const insertEmpleado = db.prepare(`INSERT INTO empleados (nombre, apellido, cedula, cargo, tanda, porciento_comision, fecha_ingreso) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  const em1 = insertEmpleado.run('Juan', 'López', '402-0001112-1', 'Cajero', 'Matutina', 5, '2023-01-15').lastInsertRowid;
  const em2 = insertEmpleado.run('Carmen', 'Sánchez', '001-1112223-2', 'Cajero', 'Vespertina', 5, '2023-03-20').lastInsertRowid;
  const em3 = insertEmpleado.run('Pedro', 'Díaz', '031-2223334-3', 'Gerente', 'Nocturna', 10, '2022-11-01').lastInsertRowid;

  // Rentas (afectan disponibilidad de algunos formatos)
  const insertRenta = db.prepare(`INSERT INTO rentas (cliente_id, empleado_id, articulo_id, fecha_renta, fecha_devolucion_prevista, fecha_devolucion_real, costo_dia, dias, total, estado) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

  // Activa — Inception Blu-ray (stock disponible: 3 → 2 después de rentar)
  insertRenta.run(c1, em1, a1, '2026-06-08', '2026-06-12', null, 150, 4, 600, 'Activa');
  // Activa — The Dark Knight DVD (stock 0, para probar reserva)
  insertRenta.run(c2, em2, a3dvd, '2026-06-05', '2026-06-15', null, 80, 10, 800, 'Activa');
  // Activa — Pulp Fiction Blu-ray
  insertRenta.run(c3, em1, a4blu, '2026-06-07', '2026-06-14', null, 120, 7, 840, 'Activa');
  // Devuelta — Barbie
  insertRenta.run(c4, em2, a2, '2026-06-01', '2026-06-03', '2026-06-03', 100, 2, 200, 'Devuelta');
  // Activa vencida — Dark Knight Blu-ray (stock: 2 → 1)
  insertRenta.run(c5, em1, a3, '2026-06-01', '2026-06-03', null, 120, 2, 240, 'Activa');
  // Activa — Dune
  insertRenta.run(c1, em2, a5, '2026-06-09', '2026-06-12', null, 150, 3, 450, 'Activa');
  // Devuelta — Greatest Hits
  insertRenta.run(c2, em3, a10, '2026-05-20', '2026-05-25', '2026-05-24', 50, 5, 250, 'Devuelta');
  // Activa — Blade Runner DVD (stock: 1 → 0)
  insertRenta.run(c3, em1, a8dvd, '2026-06-10', '2026-06-17', null, 90, 7, 630, 'Activa');
  // Activa — Interstellar (stock: 4 → 3)
  insertRenta.run(c4, em2, a9, '2026-06-09', '2026-06-11', null, 140, 2, 280, 'Activa');
  // Activa — Gladiator Blu-ray (stock: 0, agotado)
  insertRenta.run(c1, em1, aGladBlu, '2026-06-08', '2026-06-18', null, 130, 10, 1300, 'Activa');
  // Devuelta — Thriller CD
  insertRenta.run(c5, em2, aThriller, '2026-06-05', '2026-06-07', '2026-06-07', 40, 2, 80, 'Devuelta');
  // Activa — 21 CD
  insertRenta.run(c2, em3, a21, '2026-06-10', '2026-06-14', null, 40, 4, 160, 'Activa');

  // Reservas de ejemplo
  const insertReserva = db.prepare(`INSERT INTO reservas (cliente_id, articulo_id, fecha_reserva, fecha_estimada_disponible, estado) VALUES (?, ?, ?, ?, ?)`);
  // José reservó The Dark Knight DVD (stock 0, dev estimada: 2026-06-15 + 1 = 2026-06-16)
  insertReserva.run(c3, a3dvd, '2026-06-09 10:30:00', '2026-06-16', 'Pendiente');
  // Ana reservó Interstellar DVD (stock 0, sin renta activa → disponible ahora)
  insertReserva.run(c4, a9dvd, '2026-06-09 11:00:00', '2026-06-10', 'Pendiente');
  // Luis reservó Blade Runner Blu-ray (stock 0, sin renta activa → disponible ahora)
  insertReserva.run(c5, a8, '2026-06-09 14:00:00', '2026-06-10', 'Pendiente');

  // ===== VARIANTES DE IDIOMA (Blu-ray: EN/FR/ES, DVD: ES/PT) =====
  // Inception
  insertArticulo.run(pInception, 'Inception', tBlu, gSciFi, iFra, 148, 2010, null, 150, 3);
  insertArticulo.run(pInception, 'Inception', tBlu, gSciFi, iEsp, 148, 2010, null, 150, 3);
  insertArticulo.run(pInception, 'Inception', tDvd, gSciFi, iPor, 148, 2010, null, 100, 2);
  // Barbie
  insertArticulo.run(pBarbie, 'Barbie', tDvd, gComedia, iEsp, 114, 2023, null, 100, 3);
  insertArticulo.run(pBarbie, 'Barbie', tDvd, gComedia, iPor, 114, 2023, null, 100, 2);
  // Dark Knight
  insertArticulo.run(pDarkKnight, 'The Dark Knight', tBlu, gAccion, iFra, 152, 2008, null, 120, 2);
  insertArticulo.run(pDarkKnight, 'The Dark Knight', tBlu, gAccion, iEsp, 152, 2008, null, 120, 2);
  insertArticulo.run(pDarkKnight, 'The Dark Knight', tDvd, gAccion, iPor, 152, 2008, null, 80, 2);
  // Pulp Fiction
  insertArticulo.run(pPulpFiction, 'Pulp Fiction', tBlu, gDrama, iFra, 154, 1994, null, 120, 2);
  insertArticulo.run(pPulpFiction, 'Pulp Fiction', tBlu, gDrama, iEsp, 154, 1994, null, 120, 2);
  insertArticulo.run(pPulpFiction, 'Pulp Fiction', tDvd, gDrama, iEsp, 154, 1994, null, 80, 2);
  insertArticulo.run(pPulpFiction, 'Pulp Fiction', tDvd, gDrama, iPor, 154, 1994, null, 80, 2);
  // Dune
  insertArticulo.run(pDune, 'Dune', tBlu, gSciFi, iIng, 155, 2021, null, 150, 2);
  insertArticulo.run(pDune, 'Dune', tBlu, gSciFi, iFra, 155, 2021, null, 150, 2);
  // Dolor y Gloria
  insertArticulo.run(pDolorGloria, 'Dolor y Gloria', tDvd, gDrama, iPor, 113, 2019, null, 90, 2);
  // Chihiro
  insertArticulo.run(pChihiro, 'El viaje de Chihiro', tDvd, gAnimacion, iPor, 125, 2001, null, 80, 2);
  // Blade Runner 2049
  insertArticulo.run(pBladeRunner, 'Blade Runner 2049', tBlu, gSciFi, iFra, 164, 2017, null, 120, 2);
  insertArticulo.run(pBladeRunner, 'Blade Runner 2049', tBlu, gSciFi, iEsp, 164, 2017, null, 120, 2);
  insertArticulo.run(pBladeRunner, 'Blade Runner 2049', tDvd, gSciFi, iPor, 164, 2017, null, 90, 2);
  // Interstellar
  insertArticulo.run(pInterestelar, 'Interstellar', tBlu, gSciFi, iFra, 169, 2014, null, 140, 2);
  insertArticulo.run(pInterestelar, 'Interstellar', tBlu, gSciFi, iEsp, 169, 2014, null, 140, 2);
  insertArticulo.run(pInterestelar, 'Interstellar', tDvd, gSciFi, iPor, 169, 2014, null, 100, 2);
  // The Matrix
  insertArticulo.run(pMatrix, 'The Matrix', tBlu, gSciFi, iFra, 136, 1999, null, 130, 2);
  insertArticulo.run(pMatrix, 'The Matrix', tBlu, gSciFi, iEsp, 136, 1999, null, 130, 2);
  insertArticulo.run(pMatrix, 'The Matrix', tDvd, gSciFi, iPor, 136, 1999, null, 90, 2);
  // Jurassic Park
  insertArticulo.run(pJurassicPark, 'Jurassic Park', tBlu, gAccion, iFra, 127, 1993, null, 120, 2);
  insertArticulo.run(pJurassicPark, 'Jurassic Park', tBlu, gAccion, iEsp, 127, 1993, null, 120, 2);
  insertArticulo.run(pJurassicPark, 'Jurassic Park', tDvd, gAccion, iPor, 127, 1993, null, 80, 2);
  // Back to the Future
  insertArticulo.run(pBackToFuture, 'Back to the Future', tBlu, gSciFi, iFra, 116, 1985, null, 110, 2);
  insertArticulo.run(pBackToFuture, 'Back to the Future', tBlu, gSciFi, iEsp, 116, 1985, null, 110, 2);
  insertArticulo.run(pBackToFuture, 'Back to the Future', tDvd, gSciFi, iPor, 116, 1985, null, 75, 2);
  // Gladiator
  insertArticulo.run(pGladiator, 'Gladiator', tBlu, gAccion, iFra, 155, 2000, null, 130, 2);
  insertArticulo.run(pGladiator, 'Gladiator', tBlu, gAccion, iEsp, 155, 2000, null, 130, 2);
  insertArticulo.run(pGladiator, 'Gladiator', tDvd, gAccion, iPor, 155, 2000, null, 90, 2);

  // ===== FORMATOS FALTANTES (stock 0, para reserva) =====
  // Barbie — Blu-ray (no existía)
  insertArticulo.run(pBarbie, 'Barbie', tBlu, gComedia, iIng, 114, 2023, null, 150, 0);
  insertArticulo.run(pBarbie, 'Barbie', tBlu, gComedia, iFra, 114, 2023, null, 150, 0);
  insertArticulo.run(pBarbie, 'Barbie', tBlu, gComedia, iEsp, 114, 2023, null, 150, 0);
  // Dolor y Gloria — Blu-ray (no existía)
  insertArticulo.run(pDolorGloria, 'Dolor y Gloria', tBlu, gDrama, iIng, 113, 2019, null, 130, 0);
  insertArticulo.run(pDolorGloria, 'Dolor y Gloria', tBlu, gDrama, iFra, 113, 2019, null, 130, 0);
  insertArticulo.run(pDolorGloria, 'Dolor y Gloria', tBlu, gDrama, iEsp, 113, 2019, null, 130, 0);
  // Chihiro — Blu-ray (no existía)
  insertArticulo.run(pChihiro, 'El viaje de Chihiro', tBlu, gAnimacion, iIng, 125, 2001, null, 120, 0);
  insertArticulo.run(pChihiro, 'El viaje de Chihiro', tBlu, gAnimacion, iFra, 125, 2001, null, 120, 0);
  insertArticulo.run(pChihiro, 'El viaje de Chihiro', tBlu, gAnimacion, iEsp, 125, 2001, null, 120, 0);
  // Dune — DVD (no existía)
  insertArticulo.run(pDune, 'Dune', tDvd, gSciFi, iEsp, 155, 2021, null, 100, 0);
  insertArticulo.run(pDune, 'Dune', tDvd, gSciFi, iPor, 155, 2021, null, 100, 0);

})();

console.log('Seeding completed successfully!');
