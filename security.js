const crypto = require('crypto');

const HASH_PREFIX = 'scrypt';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `${HASH_PREFIX}$${salt}$${hash}`;
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword) return false;

  const parts = String(storedPassword).split('$');
  if (parts.length !== 3 || parts[0] !== HASH_PREFIX) {
    return String(password) === String(storedPassword);
  }

  const [, salt, storedHash] = parts;
  const candidate = crypto.scryptSync(String(password), salt, 64);
  const expected = Buffer.from(storedHash, 'hex');
  return candidate.length === expected.length && crypto.timingSafeEqual(candidate, expected);
}

function createToken() {
  return crypto.randomBytes(32).toString('hex');
}

const employeeDenied = [
  { method: 'POST', pattern: /^\/api\/empleados(?:\/|$)/ },
  { method: 'PUT', pattern: /^\/api\/empleados(?:\/|$)/ },
  { method: 'DELETE', pattern: /^\/api\/empleados(?:\/|$)/ },
  { method: 'DELETE', pattern: /^\/api\/clientes\/\d+\/permanente$/ },
  { method: '*', pattern: /^\/api\/reportes(?:\/|$)/ }
];

const clientAllowed = [
  { method: 'GET', pattern: /^\/api\/catalogo(?:\/|$)/ },
  { method: 'GET', pattern: /^\/api\/mis-rentas(?:\/|$)/ },
  { method: 'GET', pattern: /^\/api\/mis-reservas(?:\/|$)/ },
  { method: 'POST', pattern: /^\/api\/rentas\/cliente$/ },
  { method: 'POST', pattern: /^\/api\/reservas$/ },
  { method: 'DELETE', pattern: /^\/api\/reservas\/\d+$/ }
];

function canAccessRoute(role, method, path) {
  if (role === 'admin') return true;
  if (role === 'empleado') {
    return !employeeDenied.some(rule => (rule.method === '*' || rule.method === method) && rule.pattern.test(path));
  }
  if (role === 'cliente') {
    return clientAllowed.some(rule => rule.method === method && rule.pattern.test(path));
  }
  return false;
}

module.exports = { hashPassword, verifyPassword, createToken, canAccessRoute };
