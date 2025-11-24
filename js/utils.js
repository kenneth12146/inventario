// js/utils.js - Utilidades compartidas

console.log("🛠️ utils.js cargado");

window.Utils = {
  // Hash seguro de contraseñas usando SHA-256
  async hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  },

  // Validar formato de email
  isValidEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  },

  // Validar fortaleza de contraseña
  isStrongPassword(password) {
    return password && password.length >= 8;
  },

  // Mostrar mensaje de error en UI
  showError(message, elementId = 'errorMsg') {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
      setTimeout(() => el.style.display = 'none', 5000);
    }
    console.error('❌', message);
  },

  // Mostrar mensaje de éxito
  showSuccess(message, elementId = 'successMsg') {
    const el = document.getElementById(elementId);
    if (el) {
      el.textContent = message;
      el.style.display = 'block';
      setTimeout(() => el.style.display = 'none', 3000);
    }
    console.log('✅', message);
  },

  // Formatear moneda
  formatMoney(amount) {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(amount);
  },

  // Formatear fecha
  formatDate(timestamp) {
    return new Date(timestamp).toLocaleString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
};
