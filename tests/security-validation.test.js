const assert = require('assert');
const { hashPassword, verifyPassword, createToken, canAccessRoute } = require('../security');
const { validateBody, validateDateRange } = require('../validation');

const passwordHash = hashPassword('clave-segura');
assert.equal(verifyPassword('clave-segura', passwordHash), true);
assert.equal(verifyPassword('clave-incorrecta', passwordHash), false);
assert.match(createToken(), /^[a-f0-9]{64}$/);
assert.equal(canAccessRoute('admin', 'DELETE', '/api/empleados/1'), true);
assert.equal(canAccessRoute('empleado', 'GET', '/api/empleados'), true);
assert.equal(canAccessRoute('empleado', 'POST', '/api/empleados'), false);
assert.equal(canAccessRoute('empleado', 'GET', '/api/reportes'), false);
assert.equal(canAccessRoute('cliente', 'GET', '/api/catalogo/v2'), true);
assert.equal(canAccessRoute('cliente', 'GET', '/api/clientes'), false);
assert.equal(canAccessRoute('cliente', 'DELETE', '/api/reservas/12'), true);

const client = validateBody('clientes', {
  nombre: 'Ana',
  apellido: 'Pérez',
  email: 'ANA@MAIL.COM',
  estado: 'Activo'
});
assert.equal(client.email, 'ana@mail.com');

assert.throws(() => validateBody('articulos', { titulo: '', costo_dia: -1 }), /obligatorio/);
assert.throws(() => validateBody('clientes', { nombre: '<script>', apellido: 'Prueba' }), /caracteres no permitidos/);
assert.throws(() => validateBody('empleados', {
  nombre: 'Ana',
  apellido: 'Pérez',
  porciento_comision: 200
}), /menor o igual a 100/);
assert.throws(() => validateDateRange('2026-08-01', '2026-07-01'), /posterior/);

console.log('Security and validation tests passed');
