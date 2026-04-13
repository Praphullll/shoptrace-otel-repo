/**
 * Orders Page – shows local order history.
 */

import { getLocalOrders, clearLocalOrders } from '../services/storage.js';
import { showToast } from '../utils/toast.js';

export class Orders {
  render(container) {
    const orders = getLocalOrders();

    container.innerHTML = `
      <div class="page-wrapper orders-page">
        <div class="flex-between mb-24" style="flex-wrap:wrap;gap:12px;">
          <h2>📦 Order History</h2>
          <div style="display:flex;gap:8px;">
            <button class="btn btn-sm" id="refresh-btn" aria-label="Refresh orders">🔄 Refresh</button>
            ${orders.length > 0 ? `<button class="btn btn-sm btn-danger" id="clear-btn" aria-label="Clear order history">🗑️ Clear History</button>` : ''}
          </div>
        </div>

        <div id="orders-list" aria-live="polite">
          ${this._renderList(orders)}
        </div>
      </div>
    `;

    container.querySelector('#refresh-btn')?.addEventListener('click', () => this.render(container));
    container.querySelector('#clear-btn')?.addEventListener('click', () => {
      if (confirm('Clear all local order history?')) {
        clearLocalOrders();
        showToast('success', 'Order history cleared.');
        this.render(container);
      }
    });
  }

  _renderList(orders) {
    if (orders.length === 0) {
      return `
        <div class="empty-state" role="status">
          <div class="empty-state-icon" aria-hidden="true">📦</div>
          <h3>No orders yet</h3>
          <p class="text-muted">Your order history will appear here after your first purchase.</p>
        </div>
      `;
    }

    return `
      <div class="data-table-wrap" role="region" aria-label="Order history">
        <table class="data-table" aria-label="Orders">
          <thead>
            <tr>
              <th scope="col">Order ID</th>
              <th scope="col">Product</th>
              <th scope="col">Qty</th>
              <th scope="col">Total</th>
              <th scope="col">Status</th>
              <th scope="col">Email</th>
              <th scope="col">Date</th>
            </tr>
          </thead>
          <tbody>
            ${orders.map(o => this._orderRow(o)).join('')}
          </tbody>
        </table>
      </div>
      <p class="text-muted text-sm mt-12" aria-live="polite">
        Showing ${orders.length} order${orders.length !== 1 ? 's' : ''} stored locally.
      </p>
    `;
  }

  _orderRow(o) {
    const date = o.created_at ? new Date(o.created_at).toLocaleString() : '—';
    const statusClass = o.status === 'confirmed' ? 'badge-green'
      : o.status === 'cancelled' ? 'badge-red'
      : 'badge-amber';

    return `
      <tr>
        <td>
          <span class="font-mono text-xs text-accent" title="${_esc(o.id)}">${o.id.slice(0, 8)}…</span>
        </td>
        <td class="fw-600">${_esc(o.product_name || '—')}</td>
        <td>${o.quantity}</td>
        <td class="text-green fw-600">$${parseFloat(o.total_amount).toFixed(2)}</td>
        <td><span class="badge ${statusClass}">${_esc(o.status)}</span></td>
        <td class="text-muted">${_esc(o.customer_email || '—')}</td>
        <td class="text-muted text-sm">${date}</td>
      </tr>
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
