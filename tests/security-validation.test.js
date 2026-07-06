const assert = require('assert');
const { hashPassword, verifyPassword, createToken, canAccessRoute } = require('../security');
const {
  validateBody,
  validateDateRange,
  formatDominicanCedula,
  isValidDominicanCedula
} = require('../validation');

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
assert.equal(formatDominicanCedula('00113918213'), '001-1391821-3');
assert.equal(isValidDominicanCedula('001-1391821-3'), true);
assert.equal(isValidDominicanCedula('001-1391821-4'), false);
assert.equal(isValidDominicanCedula('000-0000000-0'), false);

const client = validateBody('clientes', {
  nombre: 'Ana',
  apellido: 'Pérez',
  cedula: '00113918213',
  email: 'ANA@MAIL.COM',
  estado: 'Activo'
});
assert.equal(client.email, 'ana@mail.com');
assert.equal(client.cedula, '001-1391821-3');

assert.throws(() => validateBody('articulos', { titulo: '', costo_dia: -1 }), /obligatorio/);
assert.throws(() => validateBody('clientes', { nombre: '<script>', apellido: 'Prueba' }), /caracteres no permitidos/);
assert.throws(() => validateBody('clientes', { nombre: 'Ana', apellido: 'Prueba', cedula: '001-1391821-4' }), /no es válida/);
assert.throws(() => validateBody('empleados', {
  nombre: 'Ana',
  apellido: 'Pérez',
  porciento_comision: 200
}), /menor o igual a 100/);
assert.throws(() => validateDateRange('2026-08-01', '2026-07-01'), /posterior/);

console.log('Security and validation tests passed');
