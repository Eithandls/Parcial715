class ValidationError extends Error {
  constructor(errors) {
    super(errors[0] || 'Datos inválidos');
    this.name = 'ValidationError';
    this.errors = errors;
    this.status = 400;
  }
}

const currentYear = new Date().getFullYear();
const STATES = ['Activo', 'Inactivo'];

function formatDominicanCedula(value) {
  const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
}

function isValidDominicanCedula(value) {
  const digits = String(value || '').replace(/\D/g, '');
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

  const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
  const sum = weights.reduce((total, weight, index) => {
    const product = Number(digits[index]) * weight;
    return total + (product >= 10 ? product - 9 : product);
  }, 0);
  const verifier = (10 - (sum % 10)) % 10;
  return verifier === Number(digits[10]);
}

const schemas = {
  tipos_articulo: {
    descripcion: { required: true, type: 'string', min: 2, max: 80, label: 'Descripción' },
    estado: { type: 'enum', values: STATES, label: 'Estado' }
  },
  generos: {
    descripcion: { required: true, type: 'string', min: 2, max: 60, label: 'Descripción' },
    estado: { type: 'enum', values: STATES, label: 'Estado' }
  },
  idiomas: {
    descripcion: { required: true, type: 'string', min: 2, max: 60, label: 'Descripción' },
    estado: { type: 'enum', values: STATES, label: 'Estado' }
  },
  elenco: {
    nombre: { required: true, type: 'string', min: 2, max: 120, label: 'Nombre' },
    tipo: { required: true, type: 'enum', values: ['Actor', 'Director', 'Productor', 'Artista'], label: 'Tipo' },
    estado: { type: 'enum', values: STATES, label: 'Estado' }
  },
  clientes: {
    nombre: { required: true, type: 'string', min: 2, max: 80, label: 'Nombre' },
    apellido: { required: true, type: 'string', min: 2, max: 80, label: 'Apellido' },
    cedula: { type: 'dominicanCedula', nullable: true, label: 'Cédula' },
    telefono: { type: 'pattern', pattern: /^\d{3}-\d{3}-\d{4}$/, max: 12, nullable: true, label: 'Teléfono', hint: 'debe usar el formato 809-000-0000' },
    email: { type: 'email', max: 160, nullable: true, label: 'Correo' },
    direccion: { type: 'string', max: 240, nullable: true, label: 'Dirección' },
    tipo_persona: { type: 'enum', values: ['Fisica', 'Juridica'], label: 'Tipo de persona' },
    estado: { type: 'enum', values: STATES, label: 'Estado' }
  },
  empleados: {
    nombre: { required: true, type: 'string', min: 2, max: 80, label: 'Nombre' },
    apellido: { required: true, type: 'string', min: 2, max: 80, label: 'Apellido' },
    cedula: { type: 'dominicanCedula', nullable: true, label: 'Cédula' },
    cargo: { type: 'string', min: 2, max: 80, nullable: true, label: 'Cargo' },
    tanda: { type: 'enum', values: ['Matutina', 'Vespertina', 'Nocturna'], nullable: true, label: 'Tanda' },
    porciento_comision: { type: 'number', min: 0, max: 100, label: 'Comisión' },
    fecha_ingreso: { type: 'date', nullable: true, label: 'Fecha de ingreso' },
    estado: { type: 'enum', values: STATES, label: 'Estado' }
  },
  peliculas: {
    titulo: { required: true, type: 'string', min: 1, max: 160, label: 'Título' },
    genero_id: { required: true, type: 'integer', min: 1, label: 'Género' },
    duracion: { type: 'integer', min: 1, max: 1000, nullable: true, label: 'Duración' },
    anio: { type: 'integer', min: 1888, max: currentYear + 5, nullable: true, label: 'Año' },
    sinopsis: { type: 'string', max: 2000, nullable: true, label: 'Sinopsis' },
    estado: { type: 'enum', values: STATES, label: 'Estado' }
  },
  articulos: {
    titulo: { required: true, type: 'string', min: 1, max: 160, label: 'Título' },
    tipo_articulo_id: { required: true, type: 'integer', min: 1, label: 'Tipo de artículo' },
    genero_id: { required: true, type: 'integer', min: 1, label: 'Género' },
    idioma_id: { required: true, type: 'integer', min: 1, label: 'Idioma' },
    duracion: { type: 'integer', min: 1, max: 1000, nullable: true, label: 'Duración' },
    anio: { type: 'integer', min: 1888, max: currentYear + 5, nullable: true, label: 'Año' },
    sinopsis: { type: 'string', max: 2000, nullable: true, label: 'Sinopsis' },
    costo_dia: { required: true, type: 'number', min: 0.01, max: 1000000, label: 'Costo por día' },
    cantidad_disponible: { required: true, type: 'integer', min: 0, max: 100000, label: 'Cantidad disponible' },
    estado: { type: 'enum', values: STATES, label: 'Estado' }
  }
};

function isBlank(value) {
  return value === undefined || value === null || (typeof value === 'string' && value.trim() === '');
}

function validateField(key, value, rule, errors) {
  const label = rule.label || key;
  if (isBlank(value)) {
    if (rule.required) errors.push(`${label} es obligatorio`);
    return rule.nullable ? null : value;
  }

  if (typeof value === 'string') value = value.trim();

  if (rule.type === 'string') {
    if (typeof value !== 'string') errors.push(`${label} debe ser texto`);
    else {
      if (/[<>]/.test(value)) errors.push(`${label} contiene caracteres no permitidos`);
      if (rule.min && value.length < rule.min) errors.push(`${label} debe tener al menos ${rule.min} caracteres`);
      if (rule.max && value.length > rule.max) errors.push(`${label} no puede superar ${rule.max} caracteres`);
    }
  } else if (rule.type === 'integer' || rule.type === 'number') {
    const number = Number(value);
    if (!Number.isFinite(number) || (rule.type === 'integer' && !Number.isInteger(number))) {
      errors.push(`${label} debe ser ${rule.type === 'integer' ? 'un número entero' : 'un número válido'}`);
    } else {
      value = number;
      if (rule.min !== undefined && number < rule.min) errors.push(`${label} debe ser mayor o igual a ${rule.min}`);
      if (rule.max !== undefined && number > rule.max) errors.push(`${label} debe ser menor o igual a ${rule.max}`);
    }
  } else if (rule.type === 'enum') {
    if (!rule.values.includes(value)) errors.push(`${label} debe ser uno de: ${rule.values.join(', ')}`);
  } else if (rule.type === 'email') {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.push(`${label} no tiene un formato válido`);
    if (rule.max && value.length > rule.max) errors.push(`${label} no puede superar ${rule.max} caracteres`);
    value = value.toLowerCase();
  } else if (rule.type === 'pattern') {
    if (!rule.pattern.test(value)) errors.push(`${label} ${rule.hint || 'no tiene un formato válido'}`);
  } else if (rule.type === 'dominicanCedula') {
    value = formatDominicanCedula(value);
    if (!isValidDominicanCedula(value)) errors.push(`${label} dominicana no es válida; revisa el número y su dígito verificador`);
  } else if (rule.type === 'date') {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || Number.isNaN(Date.parse(`${value}T00:00:00`))) {
      errors.push(`${label} no es una fecha válida`);
    }
  }

  return value;
}

function validateBody(schemaName, body, options = {}) {
  const schema = schemas[schemaName];
  if (!schema) throw new Error(`Esquema desconocido: ${schemaName}`);
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new ValidationError(['El cuerpo de la solicitud debe ser un objeto']);

  const errors = [];
  const cleaned = {};
  const unknown = Object.keys(body).filter(key => !schema[key]);
  if (unknown.length) errors.push(`Campos no permitidos: ${unknown.join(', ')}`);

  for (const [key, rule] of Object.entries(schema)) {
    if (options.partial && body[key] === undefined) continue;
    const value = validateField(key, body[key], rule, errors);
    if (body[key] !== undefined || (!options.partial && rule.required)) cleaned[key] = value;
  }

  if (!Object.keys(cleaned).length && options.partial) errors.push('Debe enviar al menos un campo válido');
  if (errors.length) throw new ValidationError(errors);
  return cleaned;
}

function validateDateRange(from, to) {
  if (from && (!/^\d{4}-\d{2}-\d{2}$/.test(from) || Number.isNaN(Date.parse(`${from}T00:00:00`)))) {
    throw new ValidationError(['Fecha desde no es válida']);
  }
  if (to && (!/^\d{4}-\d{2}-\d{2}$/.test(to) || Number.isNaN(Date.parse(`${to}T00:00:00`)))) {
    throw new ValidationError(['Fecha hasta no es válida']);
  }
  if (from && to && from > to) throw new ValidationError(['Fecha desde no puede ser posterior a fecha hasta']);
}

module.exports = {
  ValidationError,
  validateBody,
  validateDateRange,
  formatDominicanCedula,
  isValidDominicanCedula
};
