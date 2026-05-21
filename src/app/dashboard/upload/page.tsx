'use strict';
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Upload,
  FileText,
  CheckCircle,
  XCircle,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Search,
  Check,
  ChevronDown,
  Info,
  Calendar,
  Layers
} from 'lucide-react';
import { Product } from '@/lib/supabase';

interface ParsedItem {
  id: string; // client-side unique id
  invoice_description: string;
  matched_sku: string | null;
  confidence: number;
  quantity: number;
}

export default function UploadPage() {
  const router = useRouter();
  
  // Files and loading
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');

  // Loaded catalog for manual mapping
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(true);

  // Parsed invoice results
  const [invoiceLogId, setInvoiceLogId] = useState<string | null>(null);
  const [invoiceType, setInvoiceType] = useState<'purchase' | 'sale'>('sale');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [reconciling, setReconciling] = useState(false);

  // Active dropdown index for mapping overrides
  const [activeDropdownIndex, setActiveDropdownIndex] = useState<number | null>(null);
  const [dropdownSearch, setDropdownSearch] = useState('');
  
  // File input ref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch catalog products
  useEffect(() => {
    async function loadCatalog() {
      try {
        const res = await fetch('/api/products');
        const data = await res.json();
        if (res.ok && data.success) {
          setCatalog(data.products || []);
        }
      } catch (err) {
        console.error('Failed to load products catalog', err);
      } finally {
        setLoadingCatalog(false);
      }
    }
    loadCatalog();
  }, []);

  // Handle drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // Handle drop event
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      validateAndSetFile(droppedFile);
    }
  };

  // Handle file select
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (selectedFile: File) => {
    const fileType = selectedFile.type;
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    
    if (!allowedTypes.includes(fileType)) {
      setParseError('Unsupported file type. Please upload a PDF, PNG, or JPEG invoice.');
      setFile(null);
      return;
    }

    setFile(selectedFile);
    setParseError('');
    // Clear any previous results
    setParsedItems([]);
    setInvoiceLogId(null);
  };

  // Upload and parse using Gemini API
  const handleParse = async () => {
    if (!file) return;

    setIsParsing(true);
    setParseError('');
    setParsedItems([]);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('/api/invoice/parse', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        setInvoiceLogId(data.invoiceLogId);
        setInvoiceType(data.invoiceType);
        
        // Add unique client-side ID for list keys
        const itemsWithId = (data.items || []).map((item: any, index: number) => ({
          ...item,
          id: `${index}-${Date.now()}`
        }));
        setParsedItems(itemsWithId);
      } else {
        setParseError(data.error || 'Failed to parse the invoice. Please check the API configuration.');
      }
    } catch (err: any) {
      setParseError(err.message || 'An error occurred during invoice upload.');
    } finally {
      setIsParsing(false);
    }
  };

  // Apply final reconciliation changes to database
  const handleReconcile = async () => {
    if (parsedItems.length === 0) return;
    
    setReconciling(true);
    try {
      const itemsToSubmit = parsedItems.map(item => ({
        sku: item.matched_sku,
        quantity: item.quantity,
        invoice_description: item.invoice_description
      }));

      const res = await fetch('/api/invoice/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceLogId,
          invoiceType,
          items: itemsToSubmit,
          performedBy: 'Admin User'
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        alert(data.error || 'Failed to reconcile invoice stock changes');
      }
    } catch (err) {
      console.error(err);
      alert('Error reconciling invoice');
    } finally {
      setReconciling(false);
    }
  };

  // Helper: update item in state list
  const updateParsedItem = (id: string, updates: Partial<ParsedItem>) => {
    setParsedItems(prev => prev.map(item => item.id === id ? { ...item, ...updates } : item));
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">AI Invoice Ingestion</h1>
        <p className="text-zinc-400 text-sm mt-1">
          Scan and reconcile stock adjustments directly from purchase or sales invoices.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* Left Section: File Upload Zone (Takes 1 Col) */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Upload className="h-5 w-5 text-zinc-400" />
            <span>Select Invoice Document</span>
          </h2>

          <div className="glass-panel rounded-3xl p-6 space-y-6">
            
            {/* Drag & Drop Card */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
                dragActive
                  ? 'border-blue-500 bg-blue-500/5'
                  : file
                    ? 'border-zinc-700 bg-zinc-900/30'
                    : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900/10'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,image/png,image/jpeg,image/jpg"
                onChange={handleFileChange}
              />
              
              <div className="p-4 bg-zinc-900 border border-zinc-850 rounded-2xl mb-4 text-zinc-400">
                <FileText className={`h-8 w-8 ${file ? 'text-blue-400' : 'text-zinc-500'}`} />
              </div>

              {file ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-white truncate max-w-[200px]">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-300">Drag & drop your invoice file here</p>
                  <p className="text-xs text-zinc-500">Supports PDF, PNG, and JPEG formats</p>
                </div>
              )}
            </div>

            {/* Error alerts */}
            {parseError && (
              <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs flex items-start gap-2.5">
                <XCircle className="h-4.5 w-4.5 shrink-0 mt-0.5" />
                <span>{parseError}</span>
              </div>
            )}

            {/* Parse buttons */}
            {file && (
              <button
                id="parse-invoice-btn"
                onClick={handleParse}
                disabled={isParsing}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-semibold rounded-xl text-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 transition-all shadow-[0_4px_20px_rgba(37,99,235,0.2)]"
              >
                {isParsing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    <span>Analyzing Invoices (OCR + Match)...</span>
                  </>
                ) : (
                  <>
                    <span>Extract & Match SKUs</span>
                  </>
                )}
              </button>
            )}

          </div>
        </div>

        {/* Right Section: Parsed Items Reconciliation Grid (Takes 2 Cols) */}
        <div className="xl:col-span-2 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Layers className="h-5 w-5 text-zinc-400" />
            <span>Reconciliation & Match verification</span>
          </h2>

          <div className="glass-panel rounded-3xl p-6 min-h-[400px] flex flex-col justify-between shadow-md">
            
            {/* Empty state */}
            {parsedItems.length === 0 && !isParsing && (
              <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 p-8 text-center my-auto">
                <FileText className="h-12 w-12 text-zinc-700 mb-3" />
                <p className="text-sm font-semibold text-zinc-400">Reconciliation Board is empty</p>
                <p className="text-xs text-zinc-500 max-w-sm mt-1">
                  Upload an invoice and click "Extract & Match SKUs" to see side-by-side parsing verification.
                </p>
              </div>
            )}

            {/* Loading skeleton state */}
            {isParsing && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center my-auto space-y-4">
                <RefreshCw className="h-8 w-8 text-blue-500 animate-spin" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-zinc-300">Gemini AI is reading the invoice...</p>
                  <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                    Processing layout structure, reading lines, and matching names to the SKU database.
                  </p>
                </div>
              </div>
            )}

            {/* Results Review Dashboard */}
            {parsedItems.length > 0 && !isParsing && (
              <div className="space-y-6 flex-1 flex flex-col justify-between">
                
                {/* Header configuration */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 bg-zinc-900/40 border border-zinc-850 rounded-2xl gap-3">
                  <div>
                    <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Invoice Category Type</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-bold text-white uppercase tracking-tight">
                        {invoiceType === 'purchase' ? 'Stock-In / Purchase (Increases Stock)' : 'Stock-Out / Sale (Decreases Stock)'}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInvoiceType(prev => prev === 'purchase' ? 'sale' : 'purchase')}
                    className="px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Change to {invoiceType === 'purchase' ? 'Sale' : 'Purchase'}
                  </button>
                </div>

                {/* Grid Item mapping table */}
                <div className="space-y-4 flex-1">
                  <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Line Items Mapping</div>
                  
                  <div className="space-y-3">
                    {parsedItems.map((item, idx) => {
                      const matchedProduct = catalog.find(p => p.sku === item.matched_sku);
                      
                      // Confidence colors
                      let confColor = 'bg-emerald-500/10 text-emerald-400 border-emerald-500/10';
                      if (item.confidence < 0.5) {
                        confColor = 'bg-red-500/10 text-red-400 border-red-500/10';
                      } else if (item.confidence < 0.8) {
                        confColor = 'bg-amber-500/10 text-amber-400 border-amber-500/10';
                      }

                      // Handle overrides dropdown search
                      const filteredCatalog = catalog.filter(p => 
                        p.sku.toLowerCase().includes(dropdownSearch.toLowerCase()) ||
                        p.name.toLowerCase().includes(dropdownSearch.toLowerCase())
                      );

                      return (
                        <div key={item.id} className="grid grid-cols-1 md:grid-cols-12 items-center gap-4 p-4 bg-zinc-900/35 border border-zinc-850 hover:border-zinc-800 rounded-2xl transition-all relative">
                          
                          {/* Invoice Raw Item Info */}
                          <div className="md:col-span-4 space-y-1">
                            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Raw Description</div>
                            <div className="text-xs font-semibold text-white leading-snug line-clamp-2" title={item.invoice_description}>
                              {item.invoice_description}
                            </div>
                          </div>

                          {/* Matching SKU Catalog dropdown */}
                          <div className="md:col-span-5 space-y-1 relative">
                            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Mapped Catalog SKU</div>
                            
                            {/* Dropdown toggle */}
                            <button
                              type="button"
                              onClick={() => {
                                if (activeDropdownIndex === idx) {
                                  setActiveDropdownIndex(null);
                                } else {
                                  setActiveDropdownIndex(idx);
                                  setDropdownSearch('');
                                }
                              }}
                              className="w-full flex items-center justify-between px-3 py-2 bg-zinc-950 border border-zinc-800 hover:border-zinc-700 rounded-xl text-xs text-white outline-none cursor-pointer transition-all"
                            >
                              <span className="truncate font-medium text-left">
                                {matchedProduct ? (
                                  <span className="text-blue-400 font-mono font-semibold">[{matchedProduct.sku}] <span className="text-zinc-300 font-sans font-medium">{matchedProduct.name}</span></span>
                                ) : (
                                  <span className="text-zinc-500 italic">Excluded from stock (No Match)</span>
                                )}
                              </span>
                              <ChevronDown className="h-4 w-4 text-zinc-500 ml-1.5 shrink-0" />
                            </button>

                            {/* Dropdown Menu overlay */}
                            {activeDropdownIndex === idx && (
                              <div className="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl z-50 p-2 max-h-60 overflow-hidden flex flex-col">
                                <div className="relative mb-2">
                                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                                  <input
                                    type="text"
                                    placeholder="Search catalog SKU..."
                                    value={dropdownSearch}
                                    onChange={(e) => setDropdownSearch(e.target.value)}
                                    className="w-full pl-8 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-lg text-xs text-white outline-none"
                                  />
                                </div>
                                
                                <div className="flex-1 overflow-y-auto space-y-0.5">
                                  {/* None/Exclude option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      updateParsedItem(item.id, { matched_sku: null, confidence: 1.0 });
                                      setActiveDropdownIndex(null);
                                    }}
                                    className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-left text-xs hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 cursor-pointer"
                                  >
                                    <span className="italic">Exclude this item from stock update</span>
                                    {item.matched_sku === null && <Check className="h-3.5 w-3.5 text-blue-500" />}
                                  </button>

                                  {filteredCatalog.map(p => (
                                    <button
                                      key={p.id}
                                      type="button"
                                      onClick={() => {
                                        updateParsedItem(item.id, { matched_sku: p.sku, confidence: 1.0 });
                                        setActiveDropdownIndex(null);
                                      }}
                                      className="w-full flex items-center justify-between px-2 py-2 rounded-lg text-left text-xs hover:bg-zinc-800 text-white cursor-pointer"
                                    >
                                      <span className="truncate font-mono"><span className="text-blue-400 font-semibold">{p.sku}</span> - <span className="text-zinc-300 font-sans font-medium">{p.name}</span></span>
                                      {item.matched_sku === p.sku && <Check className="h-3.5 w-3.5 text-blue-500 shrink-0 ml-1" />}
                                    </button>
                                  ))}
                                  {filteredCatalog.length === 0 && (
                                    <div className="text-center py-4 text-xs text-zinc-600">No SKU matched search.</div>
                                  )}
                                </div>
                              </div>
                            )}

                          </div>

                          {/* Confidence score */}
                          <div className="md:col-span-1.5 space-y-1">
                            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Confidence</div>
                            <div>
                              <span className={`inline-flex px-2 py-0.5 border rounded-md text-[10px] font-bold ${confColor}`}>
                                {(item.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>

                          {/* Quantity */}
                          <div className="md:col-span-1.5 space-y-1">
                            <div className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">Quantity</div>
                            <input
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) => updateParsedItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                              className="w-full text-center px-2 py-1.5 bg-zinc-950 border border-zinc-800 rounded-xl text-xs text-white outline-none focus:border-blue-500"
                            />
                          </div>

                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Action triggers */}
                <div className="flex gap-4 pt-6 border-t border-zinc-850 mt-6">
                  <button
                    type="button"
                    onClick={() => {
                      setParsedItems([]);
                      setFile(null);
                    }}
                    className="px-6 py-3.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white rounded-xl text-sm font-semibold border border-zinc-850 cursor-pointer transition-all"
                  >
                    Clear Results
                  </button>
                  <button
                    id="submit-reconciliation-btn"
                    onClick={handleReconcile}
                    disabled={reconciling}
                    className="flex-1 py-3.5 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-xl text-sm font-semibold cursor-pointer shadow-[0_4px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_20px_rgba(37,99,235,0.45)] transition-all flex items-center justify-center gap-2"
                  >
                    {reconciling ? (
                      <>
                        <RefreshCw className="h-4.5 w-4.5 animate-spin" />
                        <span>Reconciling & Writing stock adjustments...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4.5 w-4.5" />
                        <span>Approve and Apply Stock Changes</span>
                      </>
                    )}
                  </button>
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

    </div>
  );
}
