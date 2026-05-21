'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import {
  Search,
  Filter,
  Plus,
  Minus,
  AlertTriangle,
  History,
  TrendingUp,
  Package,
  Layers,
  ArrowUpDown,
  CheckCircle2,
  XCircle,
  X,
  PlusCircle,
  MinusCircle,
  Edit2
} from 'lucide-react';
import { Product, StockTransaction } from '@/lib/supabase';

export default function DashboardPage() {
  // State variables
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<StockTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Search and filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  
  // Manual adjustment modal states
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [adjustQuantity, setAdjustQuantity] = useState<number>(1);
  const [adjustType, setAdjustType] = useState<'purchase' | 'sale' | 'manual_adjustment'>('manual_adjustment');
  const [adjustNotes, setAdjustNotes] = useState('');
  const [isSubmittingAdjustment, setIsSubmittingAdjustment] = useState(false);

  // Success alerts
  const [successMessage, setSuccessMessage] = useState('');

  // Fetch initial data
  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch products
      const productsRes = await fetch('/api/products');
      const productsData = await productsRes.json();
      if (productsRes.ok && productsData.success) {
        setProducts(productsData.products || []);
      } else {
        throw new Error(productsData.error || 'Failed to load products');
      }

      // Fetch transactions
      const transactionsRes = await fetch('/api/transactions');
      const transactionsData = await transactionsRes.json();
      if (transactionsRes.ok && transactionsData.success) {
        setTransactions(transactionsData.transactions || []);
      } else {
        throw new Error(transactionsData.error || 'Failed to load transactions');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred while fetching data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filter products based on search and category
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory =
      selectedCategory === 'All' || product.category === selectedCategory;
      
    return matchesSearch && matchesCategory;
  });

  // Extract unique categories for filter
  const categories = ['All', ...Array.from(new Set(products.map((p) => p.category).filter(Boolean)))];

  // Calculation helpers
  const totalCatalogSize = products.length;
  const totalStockCount = products.reduce((acc, p) => acc + p.current_stock, 0);
  const outOfStockCount = products.filter((p) => p.current_stock === 0).length;
  const lowStockCount = products.filter((p) => p.current_stock > 0 && p.current_stock <= p.min_stock_alert).length;

  // Handle open adjustment modal
  const openAdjustModal = (product: Product) => {
    setSelectedProduct(product);
    setAdjustQuantity(1);
    setAdjustType('manual_adjustment');
    setAdjustNotes('');
    setIsAdjustModalOpen(true);
  };

  // Submit manual stock adjustment
  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    setIsSubmittingAdjustment(true);
    try {
      // A positive change adds stock, negative subtracts.
      // But we let the user enter positive integers, and we adjust sign based on type.
      let finalQuantity = adjustQuantity;
      if (adjustType === 'sale') {
        finalQuantity = -Math.abs(adjustQuantity);
      } else if (adjustType === 'purchase') {
        finalQuantity = Math.abs(adjustQuantity);
      } else {
        // If manual adjustment, we let user pick positive or negative. Let's make it positive/negative based on selection or input.
        // We will stick to the literal input value
        finalQuantity = adjustQuantity;
      }

      const response = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantityChange: finalQuantity,
          type: adjustType,
          notes: adjustNotes,
          performedBy: 'Admin User'
        }),
      });

      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage(`Stock for ${selectedProduct.sku} updated successfully!`);
        setIsAdjustModalOpen(false);
        fetchData();
        // Clear message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        alert(data.error || 'Failed to update stock');
      }
    } catch (err) {
      console.error(err);
      alert('Error updating stock');
    } finally {
      setIsSubmittingAdjustment(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Stock Control Dashboard</h1>
          <p className="text-zinc-400 text-sm mt-1">
            Monitor levels, view transaction history, and record manual stock adjustments.
          </p>
        </div>
        <button
          onClick={() => window.location.href = '/dashboard/upload'}
          className="px-5 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium rounded-xl text-sm flex items-center gap-2 cursor-pointer shadow-[0_4px_20px_rgba(37,99,235,0.25)] transition-all"
        >
          <Plus className="h-4 w-4" />
          <span>Upload & Parse Invoice</span>
        </button>
      </div>

      {/* Success banner */}
      {successMessage && (
        <div className="flex items-center gap-3 p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-2xl text-sm animate-fade-in">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Error banner */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl text-sm animate-fade-in">
          <XCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Analytics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total SKUs */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Catalog SKUs</span>
            <Layers className="h-5 w-5 text-zinc-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{loading ? '...' : totalCatalogSize}</span>
            <span className="text-xs text-zinc-500">active products</span>
          </div>
        </div>

        {/* Total Stock Count */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Stock Volume</span>
            <Package className="h-5 w-5 text-blue-500" />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className="text-3xl font-bold text-white">{loading ? '...' : totalStockCount}</span>
            <span className="text-xs text-zinc-500">units total</span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm border-amber-500/10">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Low Stock Alerts</span>
            <AlertTriangle className={`h-5 w-5 ${lowStockCount > 0 ? 'text-amber-500' : 'text-zinc-500'}`} />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${lowStockCount > 0 ? 'text-amber-400' : 'text-white'}`}>
              {loading ? '...' : lowStockCount}
            </span>
            <span className="text-xs text-zinc-500">near threshold</span>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="glass-panel rounded-2xl p-5 shadow-sm border-red-500/10">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Out of Stock</span>
            <XCircle className={`h-5 w-5 ${outOfStockCount > 0 ? 'text-red-500' : 'text-zinc-500'}`} />
          </div>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`text-3xl font-bold ${outOfStockCount > 0 ? 'text-red-400' : 'text-white'}`}>
              {loading ? '...' : outOfStockCount}
            </span>
            <span className="text-xs text-zinc-500">0 units remaining</span>
          </div>
        </div>
      </div>

      {/* Main content grids */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Column: Product Catalog List (2 cols wide on xl) */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-zinc-400" />
              <span>Products Stock List</span>
            </h2>

            {/* Catalog Filters */}
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Search */}
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search SKU or name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full sm:w-60 pl-9 pr-3 py-2 bg-zinc-900/60 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-white placeholder-zinc-500 outline-none transition-all"
                />
              </div>

              {/* Category selector */}
              <div className="relative">
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="appearance-none pl-3 pr-8 py-2 bg-zinc-900/60 border border-zinc-800 focus:border-blue-500 rounded-xl text-xs text-white outline-none cursor-pointer transition-all"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <Filter className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Product Table Panel */}
          <div className="glass-panel rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800/80 bg-zinc-900/40 text-[10px] uppercase tracking-wider font-semibold text-zinc-400">
                    <th className="px-5 py-4">SKU</th>
                    <th className="px-5 py-4">Description</th>
                    <th className="px-5 py-4">Category</th>
                    <th className="px-5 py-4 text-center">Stock Level</th>
                    <th className="px-5 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-850/80 text-xs">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-zinc-500">
                        <span className="inline-block animate-pulse">Loading catalog products...</span>
                      </td>
                    </tr>
                  ) : filteredProducts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-12 text-zinc-500">
                        No products match filters.
                      </td>
                    </tr>
                  ) : (
                    filteredProducts.map((p) => {
                      // Compute stock badge colors
                      let stockColor = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400';
                      if (p.current_stock === 0) {
                        stockColor = 'bg-red-500/10 border-red-500/20 text-red-400';
                      } else if (p.current_stock <= p.min_stock_alert) {
                        stockColor = 'bg-amber-500/10 border-amber-500/20 text-amber-400';
                      }

                      return (
                        <tr key={p.id} className="hover:bg-zinc-900/30 transition-colors group">
                          <td className="px-5 py-3.5 font-mono text-blue-400 font-semibold">{p.sku}</td>
                          <td className="px-5 py-3.5 text-zinc-200">
                            <div>{p.name}</div>
                          </td>
                          <td className="px-5 py-3.5 text-zinc-400">
                            <span className="px-2 py-0.5 bg-zinc-900 border border-zinc-800 rounded-md text-[10px]">
                              {p.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-center">
                            <span className={`inline-flex items-center justify-center px-3 py-1 border rounded-full text-xs font-semibold ${stockColor}`}>
                              {p.current_stock}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() => openAdjustModal(p)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-[11px] font-semibold text-zinc-300 hover:text-white cursor-pointer transition-all opacity-80 group-hover:opacity-100"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Adjust</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Recent Transactions Audit Log (1 col wide on xl) */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <History className="h-5 w-5 text-zinc-400" />
            <span>Audit History</span>
          </h2>

          <div className="glass-panel rounded-2xl p-5 shadow-sm space-y-4">
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold pb-2 border-b border-zinc-800/80">
              Latest Activity Log
            </div>

            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-1">
              {loading ? (
                <div className="text-center py-8 text-zinc-500 animate-pulse">
                  Loading history logs...
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-8 text-zinc-500">
                  No stock transactions recorded yet.
                </div>
              ) : (
                transactions.slice(0, 10).map((t) => {
                  const isPositive = t.quantity_change > 0;
                  
                  return (
                    <div key={t.id} className="text-xs flex flex-col gap-1.5 p-3 bg-zinc-900/40 border border-zinc-850 rounded-xl">
                      <div className="flex justify-between items-center">
                        <span className="font-mono text-blue-400 font-semibold">{t.products?.sku || 'UNKNOWN'}</span>
                        <span className={`font-semibold flex items-center gap-0.5 px-1.5 py-0.5 rounded-md ${
                          isPositive ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                        }`}>
                          {isPositive ? '+' : ''}{t.quantity_change}
                        </span>
                      </div>
                      <div className="text-zinc-300 text-[11px] truncate" title={t.products?.name}>
                        {t.products?.name}
                      </div>
                      {t.notes && (
                        <div className="text-zinc-500 italic text-[11px] leading-relaxed">
                          "{t.notes}"
                        </div>
                      )}
                      <div className="flex justify-between items-center text-[10px] text-zinc-500 mt-1 border-t border-zinc-850 pt-1.5">
                        <span className="capitalize">{t.type.replace('_', ' ')}</span>
                        <span>{new Date(t.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Manual Stock Adjustment Dialog Modal */}
      {isAdjustModalOpen && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Overlay backdrop */}
          <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={() => setIsAdjustModalOpen(false)} />
          
          {/* Modal Content */}
          <div className="glass-panel w-full max-w-md rounded-3xl p-6 shadow-2xl relative z-10 border border-zinc-850 animate-slide-up">
            
            {/* Close Button */}
            <button
              onClick={() => setIsAdjustModalOpen(false)}
              className="absolute right-4 top-4 p-1.5 text-zinc-500 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Title */}
            <div className="mb-5 pr-8">
              <h3 className="text-lg font-bold text-white">Manual Stock Adjustment</h3>
              <p className="text-xs text-zinc-400 mt-1 font-mono">{selectedProduct.sku}</p>
              <p className="text-xs text-zinc-500 mt-0.5">{selectedProduct.name}</p>
            </div>

            <form onSubmit={handleAdjustSubmit} className="space-y-4">
              
              {/* Type Select */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Adjustment Type</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { val: 'purchase', label: 'Stock-In (+)', icon: PlusCircle, color: 'text-emerald-400 bg-emerald-500/5 border-emerald-500/10' },
                    { val: 'sale', label: 'Stock-Out (-)', icon: MinusCircle, color: 'text-red-400 bg-red-500/5 border-red-500/10' },
                    { val: 'manual_adjustment', label: 'Override', icon: Edit2, color: 'text-blue-400 bg-blue-500/5 border-blue-500/10' },
                  ].map((btn) => {
                    const isSelected = adjustType === btn.val;
                    return (
                      <button
                        key={btn.val}
                        type="button"
                        onClick={() => setAdjustType(btn.val as any)}
                        className={`flex flex-col items-center justify-center p-3 rounded-xl border text-[10px] font-bold cursor-pointer transition-all ${
                          isSelected 
                            ? 'bg-blue-600/15 border-blue-500/40 text-blue-400 ring-1 ring-blue-500/30' 
                            : 'bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        <btn.icon className="h-4 w-4 mb-1.5" />
                        {btn.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quantity input */}
              <div className="space-y-1.5">
                <label htmlFor="qty-input" className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Quantity Amount</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustQuantity((prev) => Math.max(1, prev - 1))}
                    className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl hover:bg-zinc-800 text-white cursor-pointer active:scale-95 transition-all"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <input
                    id="qty-input"
                    type="number"
                    min={1}
                    required
                    value={adjustQuantity}
                    onChange={(e) => setAdjustQuantity(Math.max(1, parseInt(e.target.value) || 0))}
                    className="flex-1 text-center py-3 bg-zinc-900/50 border border-zinc-800 rounded-xl text-lg font-bold text-white outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustQuantity((prev) => prev + 1)}
                    className="p-3 bg-zinc-900 border border-zinc-850 rounded-xl hover:bg-zinc-800 text-white cursor-pointer active:scale-95 transition-all"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Notes Input */}
              <div className="space-y-1.5">
                <label htmlFor="notes-input" className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Transaction Notes / Reason</label>
                <textarea
                  id="notes-input"
                  required
                  placeholder="Provide a reason for the adjustment (e.g. Received shipment, Customer sale, Correcting inventory error)"
                  value={adjustNotes}
                  onChange={(e) => setAdjustNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2.5 bg-zinc-900/50 border border-zinc-800 rounded-xl text-xs text-white placeholder-zinc-500 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-all resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="flex gap-3 pt-3 border-t border-zinc-850">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="flex-1 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-semibold border border-zinc-800 cursor-pointer transition-all"
                >
                  Cancel
                </button>
                <button
                  id="submit-adjustment-btn"
                  type="submit"
                  disabled={isSubmittingAdjustment}
                  className="flex-1 py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-xs font-semibold cursor-pointer shadow-[0_4px_20px_rgba(37,99,235,0.2)] disabled:opacity-50 transition-all flex items-center justify-center gap-1.5"
                >
                  {isSubmittingAdjustment ? 'Saving...' : 'Apply Stock Change'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
