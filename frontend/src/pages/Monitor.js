/**
 * Monitor Page – backend health and recent activity.
 */

import { checkHealth } from '../services/api.js';
import { getLocalOrders } from '../services/storage.js';

export class Monitor {
  async render(container) {
    container.innerHTML = `
      <div class="page-wrapper">
        <h2 class="mb-24">📡 Service Monitor</h2>

        <div class="monitor-grid" id="monitor-grid" aria-label="Service metrics">
          <div class="monitor-card">
            <div class="monitor-label">Service Status</div>
            <div class="monitor-value" id="mon-status">
              <span class="spinner" aria-label="Checking…"></span>
            </div>
            <div class="monitor-sub" id="mon-db">—</div>
          </div>
          <div class="monitor-card">
            <div class="monitor-label">Total Orders (Local)</div>
            <div class="monitor-value" id="mon-orders">—</div>
            <div class="monitor-sub">stored in this browser</div>
          </div>
          <div class="monitor-card">
            <div class="monitor-label">Backend URL</div>
            <div class="monitor-value" style="font-size:14px;font-family:monospace;" id="mon-url">—</div>
            <div class="monitor-sub">configured via .env</div>
          </div>
          <div class="monitor-card">
            <div class="monitor-label">Last Checked</div>
            <div class="monitor-value" style="font-size:16px;" id="mon-time">—</div>
            <div class="monitor-sub neutral">auto-refresh every 30s</div>
          </div>
        </div>

        <div class="section-title">Recent Orders</div>
        <div id="recent-orders" aria-live="polite"></div>
      </div>
    `;

    this._container = container;
    await this._refresh();
    this._timer = setInterval(() => this._refresh(), 30_000);
  }

  destroy() {
    clearInterval(this._timer);
  }

  async _refresh() {
    const container = this._container;
    if (!container) return;

    // Update timestamp
    const timeEl = container.querySelector('#mon-time');
    if (timeEl) timeEl.textContent = new Date().toLocaleTimeString();

    // Backend URL
    const urlEl = container.querySelector('#mon-url');
    if (urlEl) urlEl.textContent = process.env.BACKEND_URL || 'http://localhost:3000';

    // Health check
    try {
      const health = await checkHealth();
      const statusEl = container.querySelector('#mon-status');
      const dbEl     = container.querySelector('#mon-db');
      if (statusEl) statusEl.innerHTML = `<span class="text-green">🟢 Online</span>`;
      if (dbEl) {
        dbEl.innerHTML = `DB: <span class="text-green">${health.db || 'ok'}</span>`;
        dbEl.className = 'monitor-sub up';
      }
    } catch (err) {
      const statusEl = container.querySelector('#mon-status');
      const dbEl     = container.querySelector('#mon-db');
      if (statusEl) statusEl.innerHTML = `<span class="text-red">🔴 Offline</span>`;
      if (dbEl) {
        dbEl.textContent = err.message;
        dbEl.className = 'monitor-sub down';
      }
    }

    // Orders
    const orders = getLocalOrders();
    const ordersEl = container.querySelector('#mon-orders');
    if (ordersEl) ordersEl.textContent = orders.length;

    // Recent orders table
    this._renderRecentOrders(orders.slice(0, 10));
  }

  _renderRecentOrders(orders) {
    const el = this._container?.querySelector('#recent-orders');
    if (!el) return;

    if (orders.length === 0) {
      el.innerHTML = `<div class="empty-state"><div class="empty-state-icon" aria-hidden="true">📭</div><h3>No recent orders</h3></div>`;
      return;
    }

    el.innerHTML = `
      <div class="data-table-wrap" role="region" aria-label="Recent orders">
        <table class="data-table">
          <thead>
            <tr>
              <th scope="col">Order ID</th>
              <th scope="col">Product</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => {
              const date = o.created_at ? new Date(o.created_at).toLocaleString() : '—';
              const statusClass = o.status === 'confirmed' ? 'badge-green' : 'badge-amber';
              return `
                <tr>
                  <td><span class="font-mono text-xs text-accent" title="${_esc(o.id)}">${o.id.slice(0, 8)}…</span></td>
                  <td>${_esc(o.product_name || '—')}</td>
                  <td class="text-green fw-600">$${parseFloat(o.total_amount).toFixed(2)}</td>
                  <td><span class="badge ${statusClass}">${_esc(o.status)}</span></td>
                  <td class="text-muted text-sm">${date}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
