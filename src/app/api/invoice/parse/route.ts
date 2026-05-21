import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Data = buffer.toString('base64');
    const mimeType = file.type || 'application/pdf';

    // 1. Fetch the master product catalog from Supabase
    const { data: catalog, error: catalogError } = await supabase
      .from('products')
      .select('id, sku, name, category, current_stock');

    if (catalogError || !catalog) {
      console.error('Failed to retrieve catalog:', catalogError);
      return NextResponse.json({ success: false, error: 'Failed to retrieve master product catalog' }, { status: 500 });
    }

    // 2. Call the Google Gemini API directly using fetch
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey || apiKey === 'your-gemini-api-key') {
      return NextResponse.json({ success: false, error: 'Gemini API key is not configured' }, { status: 500 });
    }

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `
You are an expert AI stock clerk for the LabKey Access Control System.
Your job is to parse the attached invoice and match the parsed items to our master SKU catalog.

Here is our master SKU catalog of products we track:
${JSON.stringify(catalog, null, 2)}

Instructions:
1. Identify all line items in the invoice, extracting:
   - The item description or name on the invoice.
   - The quantity purchased or sold.
2. For each invoice item, find the best matching SKU in the master catalog.
   - Look for the SKU code in brackets (e.g. "[LK-NX-TN]") or matching text (e.g. "Next Keypad + NFC").
   - Match by category, name, and description.
   - If the item is NOT a LabKey product or is an accessory/boom gate/pedestal that is NOT in the master catalog, set "matched_sku" to null.
   - Calculate a confidence score (from 0.0 to 1.0) for the SKU match.
3. Determine the invoice type:
   - If we are receiving goods (e.g. purchase invoice from a supplier), set "invoice_type" to "purchase" (increases stock).
   - If we are billing a customer for a sale, set "invoice_type" to "sale" (decreases stock).
   - Note: Automotion Plus is the primary vendor. Invoices where Automotion Plus sells to external clients (e.g. Hutchinson Builders, Daniel, Bo Feng) are sales, so set "invoice_type" to "sale".

Return the result strictly as a JSON object matching the requested schema.
`;

    const requestPayload = {
      contents: [
        {
          parts: [
            {
              inlineData: {
                mimeType: mimeType,
                data: base64Data,
              },
            },
            {
              text: prompt,
            },
          ],
        },
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            invoice_type: {
              type: 'STRING',
              enum: ['purchase', 'sale'],
            },
            items: {
              type: 'ARRAY',
              items: {
                type: 'OBJECT',
                properties: {
                  invoice_description: { type: 'STRING' },
                  matched_sku: { type: 'STRING', nullable: true },
                  confidence: { type: 'NUMBER' },
                  quantity: { type: 'INTEGER' },
                },
                required: ['invoice_description', 'matched_sku', 'confidence', 'quantity'],
              },
            },
          },
          required: ['invoice_type', 'items'],
        },
      },
    };

    console.log(`Sending invoice '${file.name}' to Gemini API for parsing...`);
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestPayload),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Gemini API response error:', errText);
      return NextResponse.json({ success: false, error: `Gemini API Error: ${response.statusText}` }, { status: 502 });
    }

    const rawResult = await response.json();
    const candidateText = rawResult.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!candidateText) {
      console.error('Gemini API structure mismatch:', rawResult);
      return NextResponse.json({ success: false, error: 'Invalid response structure from Gemini API' }, { status: 502 });
    }

    const parsedResult = JSON.parse(candidateText);

    // 3. Log this invoice in invoice_logs database
    const { data: invoiceLog, error: logError } = await supabase
      .from('invoice_logs')
      .insert({
        file_name: file.name,
        status: 'pending_approval',
        raw_response: parsedResult,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select('id')
      .single();

    if (logError) {
      console.error('Failed to log invoice in DB:', logError);
      // Continue even if logging fails, but log the error
    }

    return NextResponse.json({
      success: true,
      invoiceLogId: invoiceLog?.id || null,
      fileName: file.name,
      invoiceType: parsedResult.invoice_type,
      items: parsedResult.items,
    });
  } catch (e: any) {
    console.error('API invoice parse error:', e);
    return NextResponse.json({ success: false, error: e.message || 'Internal Server Error' }, { status: 500 });
  }
}
