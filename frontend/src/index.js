/**
 * ShopTrace Frontend – entry point.
 * Hash-based SPA router: #home | #products | #orders | #checkout | #monitor
 */

import './styles/app.css';

import { Header }   from './components/Header.js';
import { Footer }   from './components/Footer.js';
import { Cart }     from './components/Cart.js';
import { Checkout } from './components/Checkout.js';

import { Home }     from './pages/Home.js';
import { Products } from './pages/Products.js';
import { Orders }   from './pages/Orders.js';
import { Monitor }  from './pages/Monitor.js';

import { showToast } from './utils/toast.js';
import { CATEGORY_ICONS, getCategoryFor } from './utils/categories.js';
import { addToCart }  from './services/storage.js';

// ── App State ────────────────────────────────────────────────────
const state = {
  currentPage: 'home',
  currentMonitor: null, // holds Monitor instance for cleanup
};

// ── DOM Roots ────────────────────────────────────────────────────
const appEl     = document.getElementById('app');
const toastEl   = document.getElementById('toast-container');

// ── Instantiate Shared Components ────────────────────────────────
const header = new Header({
  onNavigate:    navigateTo,
  onCartToggle:  () => cart.open(),
  onSearch:      query => {
    if (state.currentPage !== 'products') navigateTo('products');
    productsPage.setSearch(query);
  },
});

const footer = new Footer();
const cart   = new Cart({
  onCheckout:   () => navigateTo('checkout'),
  onCartChange: () => header.updateCartBadge(),
});

const productsPage = new Products({
  onCartChange: () => { header.updateCartBadge(); cart.refresh(); },
  onViewDetail: showProductDetail,
});

// ── Build Shell ──────────────────────────────────────────────────
function buildShell() {
  appEl.innerHTML = ''; // Clear loading screen

  // Header
  header.mount(appEl);

  // Main content area
  const mainEl = document.createElement('main');
  mainEl.id = 'main-content';
  mainEl.setAttribute('role', 'main');
  mainEl.setAttribute('aria-label', 'Page content');
  mainEl.setAttribute('tabindex', '-1');
  appEl.appendChild(mainEl);

  // Footer
  footer.mount(appEl);

  // Cart drawer
  cart.mount(appEl);
}

// ── Router ───────────────────────────────────────────────────────
function getHashPage() {
  const hash = window.location.hash.replace('#', '') || 'home';
  return ['home', 'products', 'orders', 'checkout', 'monitor'].includes(hash) ? hash : 'home';
}

async function navigateTo(page) {
  // Cleanup previous monitor if active
  if (state.currentMonitor) {
    state.currentMonitor.destroy();
    state.currentMonitor = null;
  }

  state.currentPage = page;
  window.location.hash = page;

  header.setActivePage(page);

  const mainEl = document.getElementById('main-content');
  mainEl.innerHTML = '';

  // Accessibility – move focus to main on navigation
  mainEl.focus();

  switch (page) {
    case 'home': {
      const home = new Home({ onNavigate: navigateTo });
      await home.render(mainEl);
      break;
    }
    case 'products': {
      await productsPage.render(mainEl);
      break;
    }
    case 'orders': {
      const orders = new Orders();
      orders.render(mainEl);
      break;
    }
    case 'checkout': {
      const checkout = new Checkout({
        onSuccess: (orders) => renderOrderSuccess(mainEl, orders),
        onBack:    () => navigateTo('products'),
      });
      checkout.render(mainEl);
      break;
    }
    case 'monitor': {
      const monitor = new Monitor();
      state.currentMonitor = monitor;
      await monitor.render(mainEl);
      break;
    }
    default:
      navigateTo('home');
  }
}

// ── Order Success Screen ──────────────────────────────────────────
function renderOrderSuccess(container, orders) {
  header.updateCartBadge();

  const orderIds = orders.map(o => o.id).join(', ');
  const total    = orders.reduce((s, o) => s + parseFloat(o.total_amount), 0);

  container.innerHTML = `
    <div class="page-wrapper">
      <div class="card order-success" role="status" aria-live="polite">
        <div class="success-icon" aria-hidden="true">✅</div>
        <h2>Order Confirmed!</h2>
        <p>
          Thank you! Your order${orders.length > 1 ? 's have' : ' has'} been placed successfully.
          You'll receive a confirmation at <strong>${_esc(orders[0]?.customer_email || '')}</strong>.
        </p>

        <div>
          <p class="text-muted text-sm mb-8">Order ID${orders.length > 1 ? 's' : ''}</p>
          <div class="trace-id-box font-mono" aria-label="Order IDs">${_esc(orderIds)}</div>
        </div>

        <p class="text-green fw-700" style="font-size:1.2rem;">Total: $${total.toFixed(2)}</p>

        <div style="display:flex;gap:12px;flex-wrap:wrap;justify-content:center;margin-top:8px;">
          <button class="btn btn-primary" id="cont-shopping-btn">🛍️ Continue Shopping</button>
          <button class="btn"             id="view-orders-btn">📦 View Orders</button>
        </div>
      </div>
    </div>
  `;

  container.querySelector('#cont-shopping-btn')?.addEventListener('click', () => navigateTo('products'));
  container.querySelector('#view-orders-btn')?.addEventListener('click',   () => navigateTo('orders'));

  showToast('success', `🎉 Order${orders.length > 1 ? 's' : ''} confirmed!`);
}

// ── Product Detail Modal ──────────────────────────────────────────
function showProductDetail(product) {
  const icon     = CATEGORY_ICONS[getCategoryFor(product.name)] || '📦';
  const inStock  = product.stock > 0;

  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'detail-modal-title');

  overlay.innerHTML = `
    <div class="modal" role="document">
      <div class="modal-header">
        <h2 class="modal-title" id="detail-modal-title">${icon} ${_esc(product.name)}</h2>
        <button class="modal-close" aria-label="Close product detail">✕</button>
      </div>
      <div class="modal-body">
        <div style="font-size:72px;text-align:center;padding:24px;background:var(--surface2);border-radius:var(--radius-lg);margin-bottom:20px;" aria-hidden="true">${icon}</div>

        <dl style="display:grid;grid-template-columns:auto 1fr;gap:8px 16px;font-size:14px;">
          <dt class="text-muted">Category</dt>
          <dd><span class="badge badge-blue">${getCategoryFor(product.name)}</span></dd>

          <dt class="text-muted">Price</dt>
          <dd class="text-green fw-700" style="font-size:1.25rem;">$${parseFloat(product.price).toFixed(2)}</dd>

          <dt class="text-muted">Stock</dt>
          <dd>${inStock
            ? `<span class="badge badge-green">In Stock – ${product.stock} units</span>`
            : `<span class="badge badge-red">Out of Stock</span>`}</dd>

          <dt class="text-muted">Description</dt>
          <dd>${_esc(product.description || 'No description available.')}</dd>

          <dt class="text-muted">Product ID</dt>
          <dd class="font-mono text-xs text-muted">${_esc(product.id)}</dd>
        </dl>
      </div>
      <div class="modal-footer">
        <button class="btn"             id="modal-cancel-btn">Cancel</button>
        <button class="btn btn-primary" id="modal-add-btn" ${inStock ? '' : 'disabled'}>
          🛒 Add to Cart
        </button>
      </div>
    </div>
  `;

  const close = () => overlay.remove();

  overlay.querySelector('.modal-close')?.addEventListener('click', close);
  overlay.querySelector('#modal-cancel-btn')?.addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  overlay.querySelector('#modal-add-btn')?.addEventListener('click', () => {
    addToCart(product, 1);
    header.updateCartBadge();
    cart.refresh();
    showToast('success', `✅ "${product.name}" added to cart`);
    close();
  });

  // Trap focus
  overlay.addEventListener('keydown', e => {
    if (e.key === 'Escape') close();
  });

  document.body.appendChild(overlay);

  // Focus the close button
  setTimeout(() => overlay.querySelector('.modal-close')?.focus(), 50);
}

// ── Init ─────────────────────────────────────────────────────────
function init() {
  buildShell();
  // Listen for back/forward
  window.addEventListener('hashchange', () => {
    const page = getHashPage();
    if (page !== state.currentPage) navigateTo(page);
  });
  navigateTo(getHashPage());
}

init();

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
