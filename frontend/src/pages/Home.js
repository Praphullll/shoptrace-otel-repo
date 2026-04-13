/**
 * Home Page – landing page with hero section and highlights.
 */

import { checkHealth } from '../services/api.js';
import { getLocalOrders } from '../services/storage.js';

export class Home {
  constructor({ onNavigate }) {
    this.onNavigate = onNavigate;
  }

  async render(container) {
    container.innerHTML = `
      <section class="hero" aria-labelledby="hero-heading">
        <div class="hero-eyebrow" aria-label="New arrivals">✨ New Arrivals</div>
        <h1 id="hero-heading">
          Your Gateway to<br/><span>Premium Gadgets</span>
        </h1>
        <p>Discover the latest tech: phones, laptops, accessories and more — all in one place. Backed by real-time order tracking with OpenTelemetry.</p>
        <div class="hero-actions">
          <button class="btn btn-primary btn-lg" id="shop-now-btn" aria-label="Browse all products">
            🛍️ Shop Now
          </button>
          <button class="btn btn-lg" id="view-orders-btn" aria-label="View your orders">
            📦 My Orders
          </button>
        </div>

        <div class="hero-stats" aria-label="Store statistics">
          <div class="hero-stat">
            <div class="hero-stat-value" id="stat-products">—</div>
            <div class="hero-stat-label">Products Available</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value" id="stat-orders">—</div>
            <div class="hero-stat-label">Orders Placed</div>
          </div>
          <div class="hero-stat">
            <div class="hero-stat-value" id="stat-status">
              <span class="spinner spinner-sm" aria-label="Checking service status"></span>
            </div>
            <div class="hero-stat-label">Service Status</div>
          </div>
        </div>
      </section>

      <div class="page-wrapper">
        <div class="section-title">Why ShopTrace?</div>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:16px;">
          ${FEATURES.map(f => `
            <div class="card" role="article">
              <div style="font-size:32px;margin-bottom:12px;" aria-hidden="true">${f.icon}</div>
              <h3 style="margin-bottom:8px;">${f.title}</h3>
              <p class="text-muted text-sm">${f.desc}</p>
            </div>
          `).join('')}
        </div>
      </div>
    `;

    // Wire CTAs
    container.querySelector('#shop-now-btn')?.addEventListener('click', () => this.onNavigate('products'));
    container.querySelector('#view-orders-btn')?.addEventListener('click', () => this.onNavigate('orders'));

    // Populate stats
    this._loadStats(container);
  }

  async _loadStats(container) {
    // Local order count
    const orders = getLocalOrders();
    const orderEl = container.querySelector('#stat-orders');
    if (orderEl) orderEl.textContent = orders.length;

    // Health check + product count (count loaded elsewhere; just show status)
    try {
      const health = await checkHealth();
      const statusEl = container.querySelector('#stat-status');
      if (statusEl) {
        statusEl.innerHTML = health.status === 'ok'
          ? `<span class="text-green">🟢 Online</span>`
          : `<span class="text-red">🔴 Degraded</span>`;
      }
    } catch {
      const statusEl = container.querySelector('#stat-status');
      if (statusEl) statusEl.innerHTML = `<span class="text-red">🔴 Offline</span>`;
    }
  }
}

const FEATURES = [
  { icon: '🛡️', title: 'Secure Checkout',      desc: 'All transactions are validated server-side with stock checks and atomic database operations.' },
  { icon: '📡', title: 'Real-Time Tracing',     desc: 'Every order creates an OpenTelemetry trace — inspect latency and errors in your observability platform.' },
  { icon: '⚡', title: 'Instant Delivery',      desc: 'Persistent cart with localStorage keeps your items safe across page reloads.' },
  { icon: '🔍', title: 'Smart Search',           desc: 'Filter and search across the full product catalogue by name, category, or keyword.' },
];
