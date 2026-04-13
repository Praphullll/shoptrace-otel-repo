/**
 * Cart Drawer Component – slide-in panel listing cart items.
 * Emits events: 'checkout', 'update-qty', 'remove', 'close'
 */

import { getCart, updateCartQty, removeFromCart } from '../services/storage.js';
import { CATEGORY_ICONS, getCategoryFor } from '../utils/categories.js';

export class Cart {
  constructor({ onCheckout, onCartChange }) {
    this.onCheckout   = onCheckout;
    this.onCartChange = onCartChange;
    this._drawerEl  = null;
    this._overlayEl = null;
  }

  mount(container) {
    // Overlay
    this._overlayEl = document.createElement('div');
    this._overlayEl.className = 'cart-overlay';
    this._overlayEl.setAttribute('aria-hidden', 'true');
    this._overlayEl.addEventListener('click', () => this.close());
    container.appendChild(this._overlayEl);

    // Drawer
    this._drawerEl = document.createElement('aside');
    this._drawerEl.className = 'cart-drawer';
    this._drawerEl.setAttribute('role', 'dialog');
    this._drawerEl.setAttribute('aria-modal', 'true');
    this._drawerEl.setAttribute('aria-label', 'Shopping cart');
    container.appendChild(this._drawerEl);

    this._render();
  }

  open() {
    this._render();
    this._drawerEl.classList.add('open');
    this._overlayEl.classList.add('open');
    document.body.style.overflow = 'hidden';
    this._drawerEl.querySelector('.cart-close-btn')?.focus();
  }

  close() {
    this._drawerEl.classList.remove('open');
    this._overlayEl.classList.remove('open');
    document.body.style.overflow = '';
  }

  /** Call after any cart mutation to refresh the UI. */
  refresh() {
    this._render();
  }

  _render() {
    const cart = getCart();
    const subtotal = cart.reduce((s, i) => s + parseFloat(i.product.price) * i.quantity, 0);
    const tax      = subtotal * 0.08;
    const total    = subtotal + tax;

    this._drawerEl.innerHTML = `
      <div class="cart-header">
        <h2 class="cart-title" id="cart-drawer-title">🛒 Cart <span class="text-muted text-sm">(${cart.length} item${cart.length !== 1 ? 's' : ''})</span></h2>
        <button class="btn-icon cart-close-btn" aria-label="Close cart">✕</button>
      </div>

      <div class="cart-body" id="cart-body" role="list" aria-labelledby="cart-drawer-title">
        ${cart.length === 0 ? this._emptyHtml() : cart.map(i => this._itemHtml(i)).join('')}
      </div>

      <div class="cart-footer">
        <div class="cart-summary" aria-label="Cart totals">
          <div class="cart-summary-row">
            <span>Subtotal</span><span>$${subtotal.toFixed(2)}</span>
          </div>
          <div class="cart-summary-row">
            <span>Tax (8%)</span><span>$${tax.toFixed(2)}</span>
          </div>
          <div class="cart-summary-row total">
            <span>Total</span><span>$${total.toFixed(2)}</span>
          </div>
        </div>
        <button class="btn btn-success btn-full checkout-btn" ${cart.length === 0 ? 'disabled' : ''} aria-label="Proceed to checkout">
          Checkout →
        </button>
      </div>
    `;

    // Bind events
    this._drawerEl.querySelector('.cart-close-btn')?.addEventListener('click', () => this.close());
    this._drawerEl.querySelector('.checkout-btn')?.addEventListener('click', () => {
      this.close();
      this.onCheckout();
    });

    // Per-item controls
    this._drawerEl.querySelectorAll('.qty-inc').forEach(btn => {
      btn.addEventListener('click', () => this._changeQty(btn.dataset.id, 1));
    });
    this._drawerEl.querySelectorAll('.qty-dec').forEach(btn => {
      btn.addEventListener('click', () => this._changeQty(btn.dataset.id, -1));
    });
    this._drawerEl.querySelectorAll('.item-remove').forEach(btn => {
      btn.addEventListener('click', () => this._remove(btn.dataset.id));
    });
  }

  _emptyHtml() {
    return `
      <div class="cart-empty" role="listitem">
        <span class="cart-empty-icon" aria-hidden="true">🛒</span>
        <p class="cart-empty-text">Your cart is empty.<br/>Browse products and add some gadgets!</p>
      </div>
    `;
  }

  _itemHtml({ product, quantity }) {
    const icon     = CATEGORY_ICONS[getCategoryFor(product.name)] || '📦';
    const lineTotal = parseFloat(product.price) * quantity;
    return `
      <div class="cart-item" role="listitem" aria-label="${_esc(product.name)}, quantity ${quantity}">
        <div class="cart-item-icon" aria-hidden="true">${icon}</div>
        <div class="cart-item-info">
          <div class="cart-item-name">${_esc(product.name)}</div>
          <div class="cart-item-price">$${lineTotal.toFixed(2)}</div>
          <div class="qty-controls" role="group" aria-label="Quantity for ${_esc(product.name)}">
            <button class="qty-btn qty-dec" data-id="${product.id}" aria-label="Decrease quantity">−</button>
            <span class="qty-value" aria-live="polite">${quantity}</span>
            <button class="qty-btn qty-inc" data-id="${product.id}" aria-label="Increase quantity"
              ${quantity >= product.stock ? 'disabled' : ''}>+</button>
          </div>
        </div>
        <button class="cart-item-remove item-remove" data-id="${product.id}" aria-label="Remove ${_esc(product.name)} from cart">✕</button>
      </div>
    `;
  }

  _changeQty(productId, delta) {
    const cart  = getCart();
    const item  = cart.find(i => i.product.id === productId);
    if (!item) return;
    const newQty = item.quantity + delta;
    updateCartQty(productId, newQty);
    this.onCartChange();
    this._render();
  }

  _remove(productId) {
    removeFromCart(productId);
    this.onCartChange();
    this._render();
  }
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
