import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .order('sku', { ascending: true });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, products: data });
  } catch (e: any) {
    console.error('API products GET error:', e);
    return NextResponse.json({ success: false, error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * Shared handler to adjust stock for a product and log the transaction.
 * Supports both `id` and `productId` keys in the request body.
 *
 * @param request - Next.js incoming Request object
 * @returns NextResponse with status and JSON payload
 */
async function handleStockAdjustment(request: Request) {
  try {
    const body = await request.json();
    const productId = body.productId || body.id;
    const { quantityChange, type, notes, performedBy } = body;

    console.log(`Processing stock adjustment for product ID: ${productId}, change: ${quantityChange}, type: ${type}`);

    if (!productId || typeof quantityChange !== 'number' || !type || !performedBy) {
      console.warn('Stock adjustment rejected due to missing parameters:', { productId, quantityChange, type, performedBy });
      return NextResponse.json({ success: false, error: 'Missing required parameters (id/productId, quantityChange, type, performedBy)' }, { status: 400 });
    }

    // 1. Retrieve the current stock
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('current_stock')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      console.error(`Fetch error or product not found for ID ${productId}:`, fetchError);
      return NextResponse.json({ success: false, error: 'Product not found in database' }, { status: 404 });
    }

    const newStock = product.current_stock + quantityChange;

    // 2. Update stock level
    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (updateError) {
      console.error(`Database update error for product ${productId}:`, updateError);
      throw updateError;
    }

    // 3. Log the transaction
    const { error: logError } = await supabase
      .from('stock_transactions')
      .insert({
        product_id: productId,
        quantity_change: quantityChange,
        type,
        notes: notes || null,
        performed_by: performedBy,
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error(`Database log transaction error for product ${productId}:`, logError);
      throw logError;
    }

    console.log(`Stock updated successfully for product ${productId}. New stock: ${newStock}`);
    return NextResponse.json({ success: true, newStock });
  } catch (e: any) {
    console.error('API products adjustment error:', e);
    return NextResponse.json({ success: false, error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return handleStockAdjustment(request);
}

export async function PATCH(request: Request) {
  return handleStockAdjustment(request);
}
