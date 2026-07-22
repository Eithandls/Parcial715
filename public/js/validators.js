const Validators = {
  formatCedula(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 3) return digits;
    if (digits.length <= 10) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 10)}-${digits.slice(10)}`;
  },

  isValidCedula(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;

    const weights = [1, 2, 1, 2, 1, 2, 1, 2, 1, 2];
    const sum = weights.reduce((total, weight, index) => {
      const product = Number(digits[index]) * weight;
      return total + (product >= 10 ? product - 9 : product);
    }, 0);
    return ((10 - (sum % 10)) % 10) === Number(digits[10]);
  },

  attachCedulaMask(input) {
    if (!input || input.dataset.cedulaReady === 'true') return;
    input.dataset.cedulaReady = 'true';
    input.value = this.formatCedula(input.value);

    const validate = () => {
      const value = input.value.trim();
      input.setCustomValidity(value && !this.isValidCedula(value)
        ? 'Ingresa una cédula dominicana válida con su dígito verificador.'
        : '');
    };

    input.addEventListener('input', () => {
      input.value = this.formatCedula(input.value);
      validate();
    });
    input.addEventListener('blur', validate);
    validate();
  },

  attachCedulaMasks(root = document) {
    root.querySelectorAll('[data-cedula]').forEach(input => this.attachCedulaMask(input));
    this.attachCardMasks(root);
  },

  formatCardNumber(value) {
    const digits = String(value || '').replace(/\D/g, '').slice(0, 16);
    return digits.replace(/(.{4})/g, '$1 ').trim();
  },

  isValidCardNumber(value) {
    const digits = String(value || '').replace(/\D/g, '');
    if (digits.length < 13 || digits.length > 16) return false;
    
    // Luhn Algorithm Checksum
    let sum = 0;
    let shouldDouble = false;
    for (let i = digits.length - 1; i >= 0; i--) {
      let digit = parseInt(digits.charAt(i), 10);
      if (shouldDouble) {
        digit *= 2;
        if (digit > 9) digit -= 9;
      }
      sum += digit;
      shouldDouble = !shouldDouble;
    }
    return (sum % 10) === 0;
  },

  formatCVV(value) {
    return String(value || '').replace(/\D/g, '').slice(0, 3);
  },

  formatExpiry(value) {
    // Keeps only digits, max 4, auto-inserts '/' after first 2
    const digits = String(value || '').replace(/\D/g, '').slice(0, 4);
    if (digits.length <= 2) return digits;
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  },

  isValidExpiry(value) {
    const str = String(value || '').trim();
    if (!/^\d{2}\/\d{2}$/.test(str)) return false;
    const [mm, yy] = str.split('/');
    const month = parseInt(mm, 10);
    if (month < 1 || month > 12) return false;
    const now = new Date();
    const currentYear = now.getFullYear() % 100; // 2-digit
    const currentMonth = now.getMonth() + 1;
    const cardYear = parseInt(yy, 10);
    if (cardYear < currentYear) return false;
    if (cardYear === currentYear && month < currentMonth) return false;
    return true;
  },

  attachCardMasks(root = document) {
    // Card Number Masking
    root.querySelectorAll('[data-card-number]').forEach(input => {
      if (input.dataset.cardReady === 'true') return;
      input.dataset.cardReady = 'true';
      
      const validate = () => {
        const value = input.value.trim();
        if (value && !this.isValidCardNumber(value)) {
          input.setCustomValidity('Número de tarjeta inválido.');
        } else {
          input.setCustomValidity('');
        }
      };

      input.addEventListener('input', () => {
        input.value = this.formatCardNumber(input.value);
        validate();
      });
      input.addEventListener('blur', validate);
      validate();
    });

    // Expiry MM/AA auto-format
    root.querySelectorAll('[data-card-expiry]').forEach(input => {
      if (input.dataset.expiryReady === 'true') return;
      input.dataset.expiryReady = 'true';

      const validate = () => {
        const value = input.value.trim();
        if (value && !this.isValidExpiry(value)) {
          input.setCustomValidity('Fecha de expiración inválida o vencida (MM/AA).');
        } else {
          input.setCustomValidity('');
        }
      };

      input.addEventListener('input', (e) => {
        const prev = input.dataset.prevVal || '';
        const raw = input.value;
        // Allow deleting the slash naturally
        if (prev.length > raw.length) {
          input.dataset.prevVal = raw;
          validate();
          return;
        }
        input.value = this.formatExpiry(raw);
        input.dataset.prevVal = input.value;
        validate();
      });
      input.addEventListener('blur', validate);
      validate();
    });

    // CVV Cap to 3 Digits
    root.querySelectorAll('[data-card-cvv]').forEach(input => {
      if (input.dataset.cvvReady === 'true') return;
      input.dataset.cvvReady = 'true';
      
      input.addEventListener('input', () => {
        input.value = this.formatCVV(input.value);
      });
    });
  },

  renderCardFields(prefix = 'cat') {
    return `
      <div class="grid-2 mb-sm">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px; font-weight:600;">Nombre del Titular</label>
          <input type="text" id="${prefix}-card-name" class="form-control" placeholder="Titular de la tarjeta" minlength="3">
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px; font-weight:600;">Número de Tarjeta</label>
          <input type="text" id="${prefix}-card-number" class="form-control" placeholder="0000 0000 0000 0000" maxlength="19" data-card-number inputmode="numeric">
        </div>
      </div>
      <div class="grid-2" style="gap:8px; margin-top:8px;">
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px; font-weight:600;">Fecha de Expiración (MM/AA)</label>
          <input type="text" id="${prefix}-card-expiry" class="form-control" placeholder="MM/AA" maxlength="5" data-card-expiry inputmode="numeric">
        </div>
        <div class="form-group" style="margin:0;">
          <label style="font-size:12px; font-weight:600;">CVV / CVC (3 dígitos)</label>
          <input type="password" id="${prefix}-card-cvv" class="form-control" placeholder="123" maxlength="3" data-card-cvv inputmode="numeric">
        </div>
      </div>
    `;
  }
};

window.Validators = Validators;
document.addEventListener('DOMContentLoaded', () => Validators.attachCedulaMasks());
