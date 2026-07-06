# Cinema Club — Sistema de Renta de Películas

Sistema web para la gestión de renta de películas y música desarrollado con **Node.js + Express + SQLite**.

## Requisitos

- Node.js 18+
- Navegador web moderno

## Instalación

```bash
npm install
node seed.js   # Poblar base de datos con datos de ejemplo
node server.js # Iniciar servidor
```

El servidor corre en `http://localhost:3000`.

## Usuarios de ejemplo

| Usuario  | Contraseña | Rol      |
|----------|-----------|----------|
| admin    | 1234      | Admin    |
| empleado | empleado1 | Empleado |
| carlos   | carlos1   | Cliente  |
| maria    | maria1    | Cliente  |

## Seguridad y roles

- Las contraseñas se almacenan con `scrypt` y salt individual.
- Las sesiones usan tokens criptográficos con una duración máxima de 8 horas.
- El inicio de sesión limita los intentos fallidos para reducir ataques de fuerza bruta.
- Los permisos se validan tanto en la interfaz como en la API:
  - **Admin:** acceso completo.
  - **Empleado:** operación diaria, sin gestión de empleados ni reportes administrativos.
  - **Cliente:** catálogo, autoservicio de rentas y sus propios historiales y reservas.
- La API valida campos obligatorios, formatos, rangos, estados y relaciones antes de guardar.

## Estructura del proyecto

```
├── server.js          # API REST (Express)
├── database.js        # Esquema SQLite
├── seed.js            # Datos de demostración
├── alter.js           # Migración opcional
├── public/
│   ├── index.html     # Login + SPA shell
│   ├── css/styles.css # Estilos
│   └── js/
│       ├── api.js     # Cliente HTTP con auth
│       ├── app.js     # Router SPA
│       ├── components.js # UI (sidebar, modales, tablas)
│       └── pages/     # Módulos
└── cinema_club.db     # Base de datos SQLite
```

## Módulos

### Admin / Empleado

| Módulo         | Descripción |
|----------------|-------------|
| Dashboard      | KPIs, rentas recientes, distribución |
| Películas      | CRUD de películas con formatos (DVD/Blu-ray/CD), idiomas, precios por día y elenco |
| Artículos      | Inventario detallado con stock, idioma y formato |
| Música         | Catálogo de música (CD) |
| Clientes       | Gestión de clientes |
| Empleados      | Gestión de empleados |
| Rentas         | Registrar devoluciones y rentas |
| Reservas       | Administrar reservas |
| Consultas      | Historial filtrable de rentas |
| Reportes       | Estadísticas con filtros |

### Cliente

| Módulo         | Descripción |
|----------------|-------------|
| Películas      | Catálogo para rentar (DVD/Blu-ray) |
| Música         | Catálogo de CDs |
| Mis Rentas     | Historial personal |
| Mis Reservas   | Reservas activas |

## Funcionalidades principales

- **Películas con múltiples formatos**: Una película puede tener varias variantes (DVD, Blu-ray, CD) en diferentes idiomas, cada una con su propio precio y stock
- **Elenco por texto**: Al crear o editar una película, se escribe el director y reparto separados por coma; el sistema busca o crea automáticamente los registros
- **Pago con tarjeta**: Al rentar, el cliente ingresa datos de tarjeta (simulado) y recibe un mensaje para pasar a buscar el artículo
- **Reservas**: Si un artículo no está disponible, el cliente puede reservarlo
- **Devolución con penalidad**: Si se devuelve tarde, se aplica un recargo del 50% por día adicional
- **Filtros**: Búsqueda por título, género, formato e idioma con botón de búsqueda
- **Consultas flexibles**: Combina texto, cliente, empleado, artículo, formato, género, idioma, fechas, montos y estado; permite ordenar y exportar a CSV

## Base de datos

### Tablas principales

- **peliculas**: Títulos únicos (una fila por película/álbum)
- **articulos**: Variantes físicas (formato + idioma + precio + stock)
- **articulos_elenco**: Relación muchos a muchos entre artículos y elenco
- **elenco**: Actores, directores y artistas
- **tipos_articulo**: DVD, Blu-ray, CD
- **generos**: Drama, Comedia, etc.
- **idiomas**: Español, Inglés, etc.
- **rentas**: Transacciones de renta
- **reservas**: Reservas de artículos agotados
- **clientes**: Perfiles de clientes
- **empleados**: Perfiles de empleados
- **usuarios**: Credenciales de inicio de sesión

## API REST

La mayoría de los endpoints son CRUD genéricos generados automáticamente:

```
GET    /api/peliculas          Listar
GET    /api/peliculas/:id      Obtener una
POST   /api/peliculas          Crear
PUT    /api/peliculas/:id      Actualizar
DELETE /api/peliculas/:id      Eliminar (soft delete)
```

Endpoints personalizados:

```
GET    /api/peliculas/completo     Películas con artículos y elenco (con filtros)
POST   /api/peliculas/completo     Crear película + artículos + elenco en una transacción
GET    /api/catalogo/v2            Catálogo para clientes agrupado por película
POST   /api/rentas/cliente         Autoservicio de renta
POST   /api/articulos/:id/elenco/texto  Gestionar elenco por texto
```
