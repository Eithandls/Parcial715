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
  }
};

window.Validators = Validators;
document.addEventListener('DOMContentLoaded', () => Validators.attachCedulaMasks());
