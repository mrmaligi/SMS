'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Upload, FileText, RefreshCw, CheckCircle, X, Search, ChevronDown, Check, AlertCircle, Loader2 } from 'lucide-react';
import type { Product } from '@/lib/supabase';

interface ParsedItem {
  id: string;
  invoice_description: string;
  matched_sku: string | null;
  confidence: number;
  quantity: number;
}

export default function UploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [isParsing, setIsParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [invoiceLogId, setInvoiceLogId] = useState<string | null>(null);
  const [invoiceType, setInvoiceType] = useState<'purchase' | 'sale'>('sale');
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [reconciling, setReconciling] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<number | null>(null);
  const [dropSearch, setDropSearch] = useState('');

  useEffect(() => {
    fetch('/api/products').then(r => r.json()).then(d => {
      if (d.success) setCatalog(d.products || []);
    });
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(e.type === 'dragenter' || e.type === 'dragover');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files[0]) validateAndSet(e.dataTransfer.files[0]);
  };

  const validateAndSet = (f: File) => {
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowed.includes(f.type)) { setParseError('Unsupported file. Please use PDF, PNG or JPEG.'); return; }
    setFile(f); setParseError(''); setParsedItems([]); setInvoiceLogId(null);
  };

  const handleParse = async () => {
    if (!file) return;
    setIsParsing(true); setParseError(''); setParsedItems([]);
    const form = new FormData();
    form.append('file', file);
    try {
      const res = await fetch('/api/invoice/parse', { method: 'POST', body: form });
      const data = await res.json();
      if (res.ok && data.success) {
        setInvoiceLogId(data.invoiceLogId);
        setInvoiceType(data.invoiceType);
        setParsedItems((data.items || []).map((item: any, i: number) => ({ ...item, id: `${i}-${Date.now()}` })));
      } else {
        setParseError(data.error || 'Failed to parse invoice. Check your Gemini API key.');
      }
    } catch (e: any) {
      setParseError(e.message || 'Upload error occurred.');
    } finally {
      setIsParsing(false);
    }
  };

  const handleReconcile = async () => {
    if (!parsedItems.length) return;
    setReconciling(true);
    try {
      const res = await fetch('/api/invoice/reconcile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceLogId,
          invoiceType,
          items: parsedItems.map(i => ({ sku: i.matched_sku, quantity: i.quantity, invoice_description: i.invoice_description })),
          performedBy: 'Admin',
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        router.push('/dashboard');
        router.refresh();
      } else {
        alert(data.error || 'Reconciliation failed.');
      }
    } catch { alert('Network error.'); }
    finally { setReconciling(false); }
  };

  const updateItem = (id: string, updates: Partial<ParsedItem>) =>
    setParsedItems(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));

  const confColor = (c: number) =>
    c < 0.5 ? '#E11D48' : c < 0.8 ? '#D97706' : '#16A34A';

  return (
    <>
      {/* Top Bar */}
      <div className="top-bar">
        <span className="top-bar-title">Parse Invoice</span>
      </div>

      <div className="page-body">
        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20, alignItems: 'start' }}>

          {/* Left: Upload */}
          <div>
            <div className="card" style={{ padding: 20 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1A1D23', marginBottom: 16 }}>
                Upload Invoice
              </h2>

              <div
                className={`drop-zone${dragActive ? ' active' : ''}`}
                onDragEnter={handleDrag} onDragOver={handleDrag}
                onDragLeave={handleDrag} onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef} type="file"
                  accept=".pdf,image/png,image/jpeg"
                  style={{ display: 'none' }}
                  onChange={e => e.target.files?.[0] && validateAndSet(e.target.files[0])}
                />
                <FileText size={28} color={file ? '#4F6EF7' : '#8B95A1'} style={{ margin: '0 auto 12px' }} />
                {file ? (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1D23', marginBottom: 3 }}>{file.name}</div>
                    <div style={{ fontSize: 12, color: '#8B95A1' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 3 }}>
                      Drop file here or click to browse
                    </div>
                    <div style={{ fontSize: 12, color: '#8B95A1' }}>PDF, PNG or JPEG</div>
                  </>
                )}
              </div>

              {parseError && (
                <div className="alert alert-error" style={{ marginTop: 12 }}>
                  <AlertCircle size={14} style={{ flexShrink: 0, marginTop: 1 }} />
                  <span>{parseError}</span>
                </div>
              )}

              {file && (
                <button
                  id="parse-invoice-btn"
                  className="btn btn-primary"
                  onClick={handleParse}
                  disabled={isParsing}
                  style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
                >
                  {isParsing ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
                  {isParsing ? 'Analysing...' : 'Extract & Match SKUs'}
                </button>
              )}

              {/* Legend */}
              <div style={{ marginTop: 20, padding: '14px', background: '#FAFAFA', borderRadius: 8, border: '1px solid #EAECF0' }}>
                <div style={{ fontSize: 11.5, fontWeight: 600, color: '#8B95A1', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Confidence Guide
                </div>
                {[
                  { color: '#16A34A', label: '≥80% — High match' },
                  { color: '#D97706', label: '50–79% — Review recommended' },
                  { color: '#E11D48', label: '<50% — Manually verify' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#5C6370' }}>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Reconciliation Board */}
          <div className="card" style={{ padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: '#1A1D23' }}>
                Reconciliation Board
              </h2>
              {parsedItems.length > 0 && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: '#8B95A1' }}>Invoice type:</span>
                  <select
                    className="filter-select"
                    style={{ minWidth: 0, fontSize: 12 }}
                    value={invoiceType}
                    onChange={e => setInvoiceType(e.target.value as 'purchase' | 'sale')}
                  >
                    <option value="sale">Sale (Stock Out)</option>
                    <option value="purchase">Purchase (Stock In)</option>
                  </select>
                </div>
              )}
            </div>

            {isParsing && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8B95A1' }}>
                <Loader2 size={28} className="spin" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: 13, fontWeight: 500, color: '#374151' }}>
                  Gemini is reading your invoice...
                </div>
                <div style={{ fontSize: 12, marginTop: 4 }}>OCR + SKU matching in progress</div>
              </div>
            )}

            {!isParsing && parsedItems.length === 0 && (
              <div style={{ padding: '60px 20px', textAlign: 'center', color: '#8B95A1' }}>
                <Upload size={32} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
                <div style={{ fontSize: 13 }}>Upload and parse an invoice to see matched line items here.</div>
              </div>
            )}

            {parsedItems.length > 0 && !isParsing && (
              <>
                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th style={{ width: '35%' }}>Invoice Line Description</th>
                        <th>Matched SKU</th>
                        <th style={{ textAlign: 'center', width: 80 }}>Conf.</th>
                        <th style={{ textAlign: 'center', width: 80 }}>Qty</th>
                      </tr>
                    </thead>
                    <tbody>
                      {parsedItems.map((item, idx) => {
                        const matched = catalog.find(p => p.sku === item.matched_sku);
                        const filtered = catalog.filter(p =>
                          p.sku.toLowerCase().includes(dropSearch.toLowerCase()) ||
                          p.name.toLowerCase().includes(dropSearch.toLowerCase())
                        );
                        return (
                          <tr key={item.id}>
                            {/* Raw description */}
                            <td>
                              <span style={{ fontSize: 12.5, color: '#374151' }} title={item.invoice_description}>
                                {item.invoice_description}
                              </span>
                            </td>

                            {/* SKU Dropdown */}
                            <td style={{ position: 'relative' }}>
                              <button
                                onClick={() => { setActiveDropdown(activeDropdown === idx ? null : idx); setDropSearch(''); }}
                                style={{
                                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '6px 10px', border: '1px solid #EAECF0', borderRadius: 6,
                                  background: '#FAFAFA', cursor: 'pointer', fontSize: 12.5, color: '#1A1D23',
                                  gap: 6
                                }}
                              >
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', textAlign: 'left' }}>
                                  {matched
                                    ? <><span style={{ color: '#4F6EF7', fontFamily: 'monospace', fontWeight: 600 }}>{matched.sku}</span> {matched.name}</>
                                    : <span style={{ color: '#8B95A1', fontStyle: 'italic' }}>Exclude from update</span>
                                  }
                                </span>
                                <ChevronDown size={12} style={{ flexShrink: 0, color: '#8B95A1' }} />
                              </button>

                              {activeDropdown === idx && (
                                <div style={{
                                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
                                  background: '#fff', border: '1px solid #EAECF0', borderRadius: 8,
                                  boxShadow: '0 8px 24px rgba(0,0,0,0.1)', padding: 8,
                                  maxHeight: 240, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginTop: 2
                                }}>
                                  <div style={{ position: 'relative', marginBottom: 6 }}>
                                    <Search size={12} style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: '#8B95A1' }} />
                                    <input
                                      autoFocus
                                      value={dropSearch}
                                      onChange={e => setDropSearch(e.target.value)}
                                      placeholder="Search..."
                                      style={{ width: '100%', paddingLeft: 26, padding: '5px 8px 5px 26px', border: '1px solid #EAECF0', borderRadius: 6, fontSize: 12, outline: 'none' }}
                                    />
                                  </div>
                                  <div style={{ overflowY: 'auto' }}>
                                    <button
                                      onClick={() => { updateItem(item.id, { matched_sku: null }); setActiveDropdown(null); }}
                                      style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: 'none', background: 'none', color: '#8B95A1', display: 'flex', justifyContent: 'space-between' }}
                                    >
                                      <span style={{ fontStyle: 'italic' }}>Exclude this line</span>
                                      {!item.matched_sku && <Check size={12} style={{ color: '#4F6EF7' }} />}
                                    </button>
                                    {filtered.map(p => (
                                      <button
                                        key={p.id}
                                        onClick={() => { updateItem(item.id, { matched_sku: p.sku, confidence: 1 }); setActiveDropdown(null); }}
                                        style={{ width: '100%', textAlign: 'left', padding: '6px 8px', fontSize: 12, borderRadius: 6, cursor: 'pointer', border: 'none', background: 'none', color: '#1A1D23', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                                        onMouseEnter={e => (e.currentTarget.style.background = '#F5F6FA')}
                                        onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                                      >
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                          <span style={{ color: '#4F6EF7', fontFamily: 'monospace', fontWeight: 600 }}>{p.sku}</span> — {p.name}
                                        </span>
                                        {item.matched_sku === p.sku && <Check size={12} style={{ color: '#4F6EF7', flexShrink: 0 }} />}
                                      </button>
                                    ))}
                                    {filtered.length === 0 && (
                                      <div style={{ textAlign: 'center', padding: '12px 0', fontSize: 12, color: '#8B95A1' }}>No results</div>
                                    )}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* Confidence */}
                            <td style={{ textAlign: 'center' }}>
                              <span style={{
                                fontSize: 12, fontWeight: 700,
                                color: confColor(item.confidence),
                                background: `${confColor(item.confidence)}18`,
                                padding: '2px 7px', borderRadius: 20
                              }}>
                                {Math.round(item.confidence * 100)}%
                              </span>
                            </td>

                            {/* Qty */}
                            <td style={{ textAlign: 'center' }}>
                              <input
                                type="number"
                                min={1}
                                value={item.quantity}
                                onChange={e => updateItem(item.id, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                style={{
                                  width: 60, textAlign: 'center', padding: '5px 6px',
                                  border: '1px solid #EAECF0', borderRadius: 6, fontSize: 13,
                                  fontWeight: 600, outline: 'none'
                                }}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20, paddingTop: 16, borderTop: '1px solid #EAECF0' }}>
                  <button
                    className="btn btn-secondary"
                    onClick={() => { setParsedItems([]); setFile(null); }}
                  >
                    Clear
                  </button>
                  <button
                    id="submit-reconciliation-btn"
                    className="btn btn-primary"
                    onClick={handleReconcile}
                    disabled={reconciling}
                  >
                    {reconciling ? <Loader2 size={14} className="spin" /> : <CheckCircle size={14} />}
                    {reconciling ? 'Applying...' : `Apply ${invoiceType === 'purchase' ? 'Stock In' : 'Stock Out'}`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
