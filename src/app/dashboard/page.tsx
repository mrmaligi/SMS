'use client';

import { useState, useEffect, useCallback, Fragment } from 'react';
import { Search, SlidersHorizontal, Plus, Minus, X, Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import type { Product } from '@/lib/supabase';

type AdjustType = 'add' | 'remove';

interface AdjustModal {
  product: Product;
  type: AdjustType;
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [modal, setModal] = useState<AdjustModal | null>(null);
  const [adjQty, setAdjQty] = useState(1);
  const [adjNote, setAdjNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success) setProducts(data.products || []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Derived data
  const categories = ['All', ...Array.from(new Set(products.map(p => p.category || 'Other'))).sort()];

  const filtered = products.filter(p => {
    const matchSearch = !search ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      p.name.toLowerCase().includes(search.toLowerCase());
    const matchCat = category === 'All' || p.category === category;
    const matchStock =
      stockFilter === 'All' ? true :
      stockFilter === 'Out' ? p.current_stock === 0 :
      stockFilter === 'Low' ? p.current_stock > 0 && p.current_stock <= p.min_stock_alert :
      p.current_stock > p.min_stock_alert;
    return matchSearch && matchCat && matchStock;
  });

  // Group products by category
  const groupedProducts: Record<string, Product[]> = {};
  filtered.forEach(p => {
    const cat = p.category || 'Uncategorized';
    if (!groupedProducts[cat]) {
      groupedProducts[cat] = [];
    }
    groupedProducts[cat].push(p);
  });
  const sortedFilteredCategories = Object.keys(groupedProducts).sort();

  const totalStock = products.reduce((s, p) => s + p.current_stock, 0);
  const outOfStock = products.filter(p => p.current_stock === 0).length;
  const lowStock = products.filter(p => p.current_stock > 0 && p.current_stock <= p.min_stock_alert).length;

  const openModal = (product: Product, type: AdjustType) => {
    setModal({ product, type });
    setAdjQty(1);
    setAdjNote('');
    setError('');
  };

  const handleAdjust = async () => {
    if (!modal) return;
    if (adjQty < 1) { setError('Quantity must be at least 1.'); return; }
    if (modal.type === 'remove' && adjQty > modal.product.current_stock) {
      setError(`Cannot remove more than current stock (${modal.product.current_stock}).`);
      return;
    }
    setSubmitting(true); setError('');
    try {
      const change = modal.type === 'add' ? adjQty : -adjQty;
      const res = await fetch('/api/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: modal.product.id,
          quantityChange: change,
          type: 'manual_adjustment',
          notes: adjNote || (modal.type === 'add' ? 'Manual stock add' : 'Manual stock removal'),
          performedBy: 'Admin',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setModal(null);
        await fetchProducts();
      } else {
        setError(data.error || 'Failed to update stock.');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const stockClass = (p: Product) =>
    p.current_stock === 0 ? 'stock-out' :
    p.current_stock <= p.min_stock_alert ? 'stock-low' : 'stock-ok';

  const stockBadge = (p: Product) =>
    p.current_stock === 0 ? { cls: 'badge-out', label: 'Out of Stock' } :
    p.current_stock <= p.min_stock_alert ? { cls: 'badge-low', label: 'Low Stock' } :
    { cls: 'badge-ok', label: 'In Stock' };

  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        <span className="top-bar-title">Inventory</span>
        <button onClick={fetchProducts} className="btn btn-secondary btn-sm">
          <RefreshCw size={13} />
          Refresh
        </button>
      </div>

      <div className="page-body">
        {/* Stat Cards */}
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-label">Total Products</div>
            <div className="stat-value">{products.length}</div>
            <div className="stat-sub">across all categories</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Total Units</div>
            <div className="stat-value">{totalStock.toLocaleString()}</div>
            <div className="stat-sub">in warehouse</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Low Stock</div>
            <div className="stat-value" style={{ color: '#D97706' }}>{lowStock}</div>
            <div className="stat-sub">products to reorder</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Out of Stock</div>
            <div className="stat-value" style={{ color: '#E11D48' }}>{outOfStock}</div>
            <div className="stat-sub">products unavailable</div>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <div className="table-header">
            <div className="table-header-left">
              <div className="search-wrap">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search by SKU or name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <select
                className="filter-select"
                value={category}
                onChange={e => setCategory(e.target.value)}
              >
                {categories.map(c => <option key={c}>{c}</option>)}
              </select>
              <select
                className="filter-select"
                value={stockFilter}
                onChange={e => setStockFilter(e.target.value)}
              >
                <option value="All">All Stock</option>
                <option value="In Stock">In Stock</option>
                <option value="Low">Low Stock</option>
                <option value="Out">Out of Stock</option>
              </select>
            </div>
            <span style={{ fontSize: 13, color: '#8B95A1', whiteSpace: 'nowrap' }}>
              {filtered.length} of {products.length} products
            </span>
          </div>

          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#8B95A1' }}>
              <Loader2 size={24} className="spin" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13 }}>Loading inventory...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#8B95A1' }}>
              <div style={{ fontSize: 13 }}>No products match your filters.</div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table>
                <thead>
                  <tr>
                    <th>SKU</th>
                    <th>Product Name</th>
                    <th>Category</th>
                    <th>Status</th>
                    <th style={{ textAlign: 'center' }}>Stock</th>
                    <th style={{ textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedFilteredCategories.map(catName => (
                    <Fragment key={catName}>
                      <tr className="category-row">
                        <td colSpan={6}>
                          {catName} &mdash; {groupedProducts[catName].length} {groupedProducts[catName].length === 1 ? 'Product' : 'Products'}
                        </td>
                      </tr>
                      {groupedProducts[catName].map(p => {
                        const badge = stockBadge(p);
                        return (
                          <tr key={p.id}>
                            <td><span className="td-sku">{p.sku}</span></td>
                            <td><span className="td-name">{p.name}</span></td>
                            <td>
                              <span className="badge badge-category">{p.category}</span>
                            </td>
                            <td>
                              <span className={`badge ${badge.cls}`}>{badge.label}</span>
                            </td>
                            <td style={{ textAlign: 'center' }}>
                              <span className={`stock-num ${stockClass(p)}`}>{p.current_stock}</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: '#16A34A' }}
                                  onClick={() => openModal(p, 'add')}
                                  title="Add stock"
                                >
                                  <Plus size={13} /> Add
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  style={{ color: '#D97706' }}
                                  onClick={() => openModal(p, 'remove')}
                                  disabled={p.current_stock === 0}
                                  title="Remove stock"
                                >
                                  <Minus size={13} /> Remove
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Adjustment Modal */}
      {modal && (
        <div className="modal-backdrop" onClick={e => { if (e.target === e.currentTarget) setModal(null); }}>
          <div className="modal">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
              <div>
                <div className="modal-title">
                  {modal.type === 'add' ? '+ Add Stock' : '− Remove Stock'}
                </div>
                <div className="modal-sub">{modal.product.sku} — {modal.product.name}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(null)} style={{ color: '#8B95A1', padding: 4 }}>
                <X size={16} />
              </button>
            </div>

            <div style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', background: '#FAFAFA',
              border: '1px solid #EAECF0', borderRadius: 8, marginBottom: 20
            }}>
              <span style={{ fontSize: 12, color: '#8B95A1' }}>Current Stock</span>
              <span className={`stock-num ${stockClass(modal.product)}`} style={{ marginLeft: 'auto' }}>
                {modal.product.current_stock} units
              </span>
            </div>

            {error && (
              <div className="alert alert-error" style={{ marginBottom: 16 }}>
                <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                <span>{error}</span>
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Quantity to {modal.type === 'add' ? 'Add' : 'Remove'}</label>
              <input
                className="form-input"
                type="number"
                min={1}
                max={modal.type === 'remove' ? modal.product.current_stock : undefined}
                value={adjQty}
                onChange={e => setAdjQty(Math.max(1, parseInt(e.target.value) || 1))}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label">Note <span style={{ color: '#8B95A1', fontWeight: 400 }}>(optional)</span></label>
              <input
                className="form-input"
                type="text"
                placeholder="e.g. Received from supplier, damaged goods..."
                value={adjNote}
                onChange={e => setAdjNote(e.target.value)}
              />
            </div>

            <div style={{
              padding: '10px 14px', background: modal.type === 'add' ? '#F0FDF4' : '#FFF7ED',
              border: `1px solid ${modal.type === 'add' ? '#BBF7D0' : '#FED7AA'}`,
              borderRadius: 8, fontSize: 13,
              color: modal.type === 'add' ? '#15803D' : '#D97706',
              marginBottom: 4
            }}>
              New stock will be: <strong>
                {modal.type === 'add'
                  ? modal.product.current_stock + adjQty
                  : Math.max(0, modal.product.current_stock - adjQty)
                } units
              </strong>
            </div>

            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setModal(null)}>Cancel</button>
              <button
                className="btn btn-primary"
                onClick={handleAdjust}
                disabled={submitting}
              >
                {submitting && <Loader2 size={14} className="spin" />}
                {submitting ? 'Saving...' : `Confirm ${modal.type === 'add' ? 'Addition' : 'Removal'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
