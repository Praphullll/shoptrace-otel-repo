/**
 * Products Page – filterable, searchable product catalogue.
 */

import { fetchProducts } from '../services/api.js';
import { addToCart } from '../services/storage.js';
import { ProductCard } from '../components/ProductCard.js';
import { showToast } from '../utils/toast.js';
import { CATEGORIES, getCategoryFor } from '../utils/categories.js';

export class Products {
  constructor({ onCartChange, onViewDetail }) {
    this.onCartChange = onCartChange;
    this.onViewDetail = onViewDetail;
    this._products = [];
    this._filter   = 'All';
    this._search   = '';
  }

  /** Called by the app when the header search changes. */
  setSearch(query) {
    this._search = query;
    this._renderGrid();
  }

  async render(container) {
    container.innerHTML = `
      <div class="page-wrapper">
        <div class="products-toolbar">
          <h2>Products</h2>
          <div class="toolbar-sep" role="none"></div>
          <div class="filter-chips" role="group" aria-label="Filter by category" id="category-chips"></div>
          <div class="search-bar" role="search">
            <span class="search-icon-sm" aria-hidden="true">🔍</span>
            <input
              type="search"
              id="product-search"
              placeholder="Search products…"
              aria-label="Search products"
              value="${_esc(this._search)}"
            />
          </div>
        </div>

        <div id="products-container" aria-live="polite" aria-label="Product list">
          <div class="loading-overlay" role="status" aria-label="Loading products">
            <div class="spinner spinner-lg" aria-hidden="true"></div>
            <span>Loading products…</span>
          </div>
        </div>
      </div>
    `;

    // Category chips
    this._renderChips(container);

    // Search input
    let searchTimeout;
    container.querySelector('#product-search')?.addEventListener('input', e => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        this._search = e.target.value.trim();
        this._renderGrid();
      }, 250);
    });

    // Load products
    try {
      this._products = await fetchProducts();
    } catch (err) {
      container.querySelector('#products-container').innerHTML = `
        <div class="empty-state" role="alert">
          <div class="empty-state-icon" aria-hidden="true">⚠️</div>
          <h3>Could not load products</h3>
          <p class="text-muted">${_esc(err.message)}</p>
          <button class="btn btn-primary mt-16" id="retry-btn">Retry</button>
        </div>
      `;
      container.querySelector('#retry-btn')?.addEventListener('click', () => this.render(container));
      return;
    }

    this._container = container;
    this._renderGrid();
  }

  _renderChips(container) {
    const wrap = container.querySelector('#category-chips');
    if (!wrap) return;
    wrap.innerHTML = CATEGORIES.map(cat => `
      <button
        class="chip ${cat === this._filter ? 'active' : ''}"
        data-cat="${cat}"
        aria-pressed="${cat === this._filter}"
        aria-label="Filter by ${cat}"
      >${cat}</button>
    `).join('');

    wrap.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        this._filter = chip.dataset.cat;
        // Update chips
        wrap.querySelectorAll('.chip').forEach(c => {
          c.classList.toggle('active', c.dataset.cat === this._filter);
          c.setAttribute('aria-pressed', c.dataset.cat === this._filter);
        });
        this._renderGrid();
      });
    });
  }

  _renderGrid() {
    const gridContainer = this._container?.querySelector('#products-container');
    if (!gridContainer) return;

    const filtered = this._products.filter(p => {
      const catMatch = this._filter === 'All' || getCategoryFor(p.name) === this._filter;
      const q = this._search.toLowerCase();
      const searchMatch = !q ||
        p.name.toLowerCase().includes(q) ||
        (p.description || '').toLowerCase().includes(q);
      return catMatch && searchMatch;
    });

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div class="empty-state" role="status">
          <div class="empty-state-icon" aria-hidden="true">🔍</div>
          <h3>No products found</h3>
          <p class="text-muted">Try adjusting your search or filter.</p>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = `
      <p class="text-muted text-sm mb-16" aria-live="polite">${filtered.length} product${filtered.length !== 1 ? 's' : ''} found</p>
      <div class="product-grid" id="product-grid"></div>
    `;

    const grid = gridContainer.querySelector('#product-grid');
    filtered.forEach(product => {
      new ProductCard(product, {
        onAddToCart:  (p) => this._handleAddToCart(p),
        onViewDetail: (p) => this.onViewDetail(p),
      }).mount(grid);
    });
  }

  _handleAddToCart(product) {
    addToCart(product, 1);
    this.onCartChange();
    showToast('success', `✅ "${product.name}" added to cart`);
  }
}

function _esc(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
