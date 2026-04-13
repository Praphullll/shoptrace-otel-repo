/**
 * Toast notification utility.
 * Usage: showToast('success', '✅ Message here', 4000)
 */

let _container = null;

function _getContainer() {
  if (!_container) {
    _container = document.getElementById('toast-container');
    if (!_container) {
      _container = document.createElement('div');
      _container.id = 'toast-container';
      document.body.appendChild(_container);
    }
  }
  return _container;
}

/**
 * Display a toast notification.
 * @param {'success'|'error'|'warning'|'info'} type
 * @param {string} message
 * @param {number} duration  ms before auto-dismiss
 */
export function showToast(type = 'info', message = '', duration = 4000) {
  const container = _getContainer();

  const icons = { success: '✅', error: '❌', warning: '⚠️', info: 'ℹ️' };
  const icon  = icons[type] || 'ℹ️';

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');
  toast.innerHTML = `
    <span class="toast-icon" aria-hidden="true">${icon}</span>
    <span class="toast-msg">${_esc(message)}</span>
    <button class="toast-close" aria-label="Dismiss notification">✕</button>
  `;

  container.appendChild(toast);

  const dismiss = () => {
    toast.classList.add('leaving');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
    clearTimeout(timer);
  };

  toast.querySelector('.toast-close')?.addEventListener('click', dismiss);

  const timer = setTimeout(dismiss, duration);
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
