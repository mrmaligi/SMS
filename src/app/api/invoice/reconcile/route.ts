import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const { invoiceLogId, invoiceType, items, performedBy } = await request.json();

    if (!items || !Array.isArray(items) || !invoiceType || !performedBy) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    const errors: string[] = [];
    const successfulUpdates: any[] = [];

    for (const item of items) {
      const { sku, quantity, invoice_description } = item;
      
      if (!sku) {
        continue; // Skip items that aren't matched to any catalog SKU
      }

      // 1. Retrieve current stock level
      const { data: product, error: fetchError } = await supabase
        .from('products')
        .select('id, current_stock')
        .eq('sku', sku)
        .single();

      if (fetchError || !product) {
        errors.push(`SKU ${sku} not found in catalog database.`);
        continue;
      }

      // 2. Calculate quantity change (purchase = +, sale = -)
      const change = invoiceType === 'purchase' ? quantity : -quantity;
      const newStock = product.current_stock + change;

      // 3. Update current stock
      const { error: updateError } = await supabase
        .from('products')
        .update({ current_stock: newStock, updated_at: new Date().toISOString() })
        .eq('id', product.id);

      if (updateError) {
        errors.push(`Failed to update stock level for SKU ${sku}: ${updateError.message}`);
        continue;
      }

      // 4. Log the stock transaction
      const { error: logError } = await supabase
        .from('stock_transactions')
        .insert({
          product_id: product.id,
          quantity_change: change,
          type: invoiceType,
          invoice_ref: invoiceLogId || null,
          notes: `Auto-reconciled from invoice item: "${invoice_description}"`,
          performed_by: performedBy,
          created_at: new Date().toISOString()
        });

      if (logError) {
        errors.push(`Failed to log transaction for SKU ${sku}: ${logError.message}`);
      } else {
        successfulUpdates.push({ sku, newStock });
      }
    }

    // 5. Update invoice log status in DB
    if (invoiceLogId) {
      const finalStatus = errors.length > 0 && successfulUpdates.length === 0 ? 'failed' : 'reconciled';
      await supabase
        .from('invoice_logs')
        .update({ status: finalStatus, updated_at: new Date().toISOString() })
        .eq('id', invoiceLogId);
    }

    if (errors.length > 0 && successfulUpdates.length === 0) {
      return NextResponse.json({ success: false, error: 'Reconciliation failed', errors }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Reconciliation process completed',
      updates: successfulUpdates,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (e: any) {
    console.error('API invoice reconcile error:', e);
    return NextResponse.json({ success: false, error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
