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

export async function POST(request: Request) {
  try {
    const { productId, quantityChange, type, notes, performedBy } = await request.json();

    if (!productId || typeof quantityChange !== 'number' || !type || !performedBy) {
      return NextResponse.json({ success: false, error: 'Missing required parameters' }, { status: 400 });
    }

    // 1. Retrieve the current stock
    const { data: product, error: fetchError } = await supabase
      .from('products')
      .select('current_stock')
      .eq('id', productId)
      .single();

    if (fetchError || !product) {
      return NextResponse.json({ success: false, error: 'Product not found in database' }, { status: 404 });
    }

    const newStock = product.current_stock + quantityChange;

    // 2. Update stock level
    const { error: updateError } = await supabase
      .from('products')
      .update({ current_stock: newStock, updated_at: new Date().toISOString() })
      .eq('id', productId);

    if (updateError) {
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
      throw logError;
    }

    return NextResponse.json({ success: true, newStock });
  } catch (e: any) {
    console.error('API products POST error:', e);
    return NextResponse.json({ success: false, error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
