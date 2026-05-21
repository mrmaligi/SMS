import { NextRequest } from 'next/server';

export const SESSION_COOKIE_NAME = 'stock_session';
const SESSION_DURATION = 1000 * 60 * 60 * 24 * 7; // 7 days

async function getCryptoKey() {
  const secret = process.env.SESSION_SECRET || 'fallback-secret-for-development-only-12345';
  const encoder = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

/**
 * Creates a signed session token.
 */
export async function createSession(username: string): Promise<string> {
  const expires = Date.now() + SESSION_DURATION;
  const payload = JSON.stringify({ username, expires });
  
  const key = await getCryptoKey();
  const encoder = new TextEncoder();
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  const signatureArray = Array.from(new Uint8Array(signatureBuffer));
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  const tokenObj = { payload, signature: signatureHex };
  return Buffer.from(JSON.stringify(tokenObj)).toString('base64');
}

/**
 * Verifies if a session token is valid and unexpired.
 */
export async function verifySession(token: string): Promise<boolean> {
  try {
    const raw = Buffer.from(token, 'base64').toString('utf-8');
    const { payload, signature } = JSON.parse(raw);
    
    const key = await getCryptoKey();
    const encoder = new TextEncoder();
    
    // Convert hex signature back to array buffer
    const sigBytes = new Uint8Array(signature.match(/.{1,2}/g).map((byte: string) => parseInt(byte, 16)));
    
    const verified = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(payload)
    );
    
    if (!verified) return false;
    
    const data = JSON.parse(payload);
    if (data.expires < Date.now()) {
      return false; // Expired
    }
    
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    return data.username === adminUsername;
  } catch (e) {
    return false;
  }
}

/**
 * Extracts and verifies the session from cookies.
 */
export async function getSession(req: NextRequest): Promise<boolean> {
  const cookie = req.cookies.get(SESSION_COOKIE_NAME);
  if (!cookie) return false;
  return await verifySession(cookie.value);
}
