import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  try {
    // Select transaction logs and join product info (SKU, Name)
    const { data, error } = await supabase
      .from('stock_transactions')
      .select('*, products (sku, name)')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true, transactions: data });
  } catch (e: any) {
    console.error('API transactions GET error:', e);
    return NextResponse.json({ success: false, error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
