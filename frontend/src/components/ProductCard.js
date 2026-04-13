/**
 * ProductCard – renders a single product card and emits 'add-to-cart' / 'view-detail' events.
 * Usage:
 *   const card = new ProductCard(product, { onAddToCart, onViewDetail });
 *   card.mount(parentElement);
 */

import { CATEGORY_ICONS, getCategoryFor } from '../utils/categories.js';

export class ProductCard {
  constructor(product, { onAddToCart, onViewDetail }) {
    this.product      = product;
    this.onAddToCart  = onAddToCart;
    this.onViewDetail = onViewDetail;
    this._el = null;
  }

  mount(container) {
    const el = document.createElement('article');
    el.className = 'product-card';
    el.setAttribute('tabindex', '0');
    el.setAttribute('role', 'article');
    el.setAttribute('aria-label', this.product.name);
    el.innerHTML = this._html();
    container.appendChild(el);
    this._el = el;
    this._bind();
    return el;
  }

  _html() {
    const { name, description, price, stock } = this.product;
    const category = getCategoryFor(name);
    const icon     = CATEGORY_ICONS[category] || '📦';
    const inStock  = stock > 0;

    return `
      <div class="product-card-img" aria-hidden="true">
        <span>${icon}</span>
        <span class="product-stock-badge">
          ${inStock
            ? `<span class="badge badge-green">In Stock (${stock})</span>`
            : `<span class="badge badge-red">Out of Stock</span>`}
        </span>
      </div>

      <div class="product-card-body">
        <div class="product-category">${category}</div>
        <h3 class="product-name">${_esc(name)}</h3>
        <p class="product-desc">${_esc(description || 'No description available.')}</p>

        <div class="product-footer">
          <span class="product-price">$${parseFloat(price).toFixed(2)}</span>
          <span class="product-stock text-muted text-sm">${inStock ? `${stock} left` : 'Unavailable'}</span>
        </div>

        <div class="product-actions">
          <button class="btn btn-primary flex-1 add-to-cart-btn" ${inStock ? '' : 'disabled'} aria-label="Add ${_esc(name)} to cart">
            🛒 Add to Cart
          </button>
          <button class="btn btn-ghost view-detail-btn" aria-label="View details for ${_esc(name)}">
            ℹ️
          </button>
        </div>
      </div>
    `;
  }

  _bind() {
    this._el.querySelector('.add-to-cart-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this.onAddToCart(this.product);
    });

    this._el.querySelector('.view-detail-btn')?.addEventListener('click', e => {
      e.stopPropagation();
      this.onViewDetail(this.product);
    });

    this._el.addEventListener('click', () => this.onViewDetail(this.product));

    this._el.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.onViewDetail(this.product);
      }
    });
  }
}

/** HTML-escape a string. */
function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
