import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const secretKey = process.env.JWT_SECRET || 'secret'; // TODO: Move to .env
const key = new TextEncoder().encode(secretKey);

// Cookie names for different user types
const ADMIN_COOKIE_NAME = 'admin-session';
const DEALER_COOKIE_NAME = 'dealer-session';

// Session duration: 1 day
const SESSION_DURATION = 24 * 60 * 60 * 1000;

// Types
interface AdminData {
  id: number;
  username: string;
  role: string;
}

interface DealerData {
  id: number;
  email: string;
  dealershipName: string | null;
  role: string;
}

// =====================
// ENCRYPTION/DECRYPTION
// =====================

export async function encrypt(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1d') // Session expires in 1 day
    .sign(key);
}

export async function decrypt(input: string): Promise<any> {
  const { payload } = await jwtVerify(input, key, {
    algorithms: ['HS256'],
  });
  return payload;
}

// =====================
// ADMIN FUNCTIONS
// =====================

export async function loginAdmin(userData: AdminData) {
  // Create admin session
  const session = await encrypt({ 
    user: userData, 
    type: 'admin',
    expires: new Date(Date.now() + SESSION_DURATION) 
  });

  // Set admin cookie
  (await cookies()).set(ADMIN_COOKIE_NAME, session, { 
    expires: new Date(Date.now() + SESSION_DURATION), 
    httpOnly: true, 
    sameSite: 'lax', 
    path: '/' 
  });
}

export async function logoutAdmin() {
  (await cookies()).set(ADMIN_COOKIE_NAME, '', { expires: new Date(0), path: '/' });
}

export async function getAdminSession() {
  const session = (await cookies()).get(ADMIN_COOKIE_NAME)?.value;
  if (!session) return null;
  try {
    const decrypted = await decrypt(session);
    // Verify it's an admin session
    if (decrypted.type !== 'admin') return null;
    return decrypted;
  } catch (error) {
    return null;
  }
}

export async function updateAdminSession(request: NextRequest) {
  const session = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!session) return;

  try {
    // Refresh admin session if valid
    const parsed = await decrypt(session);
    
    // Verify it's an admin session
    if (parsed.type !== 'admin') return;
    
    parsed.expires = new Date(Date.now() + SESSION_DURATION);
    const res = NextResponse.next();
    res.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: await encrypt(parsed),
      httpOnly: true,
      expires: parsed.expires,
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch (error) {
    // If session is invalid, just ignore it (middleware will handle redirection if needed)
    return;
  }
}

// =====================
// DEALER FUNCTIONS
// =====================

/** Re-issue JWT when cookie role is missing or out of date vs the database. */
export function dealerSessionNeedsSync(
  session: { user?: Partial<DealerData> } | null,
  dealer: DealerData
): boolean {
  if (!session?.user?.role) return true;
  return session.user.role !== dealer.role;
}

export async function loginDealer(userData: DealerData) {
  // Create dealer session
  const session = await encrypt({ 
    user: userData, 
    type: 'dealer',
    expires: new Date(Date.now() + SESSION_DURATION) 
  });

  // Set dealer cookie
  (await cookies()).set(DEALER_COOKIE_NAME, session, { 
    expires: new Date(Date.now() + SESSION_DURATION), 
    httpOnly: true, 
    sameSite: 'lax', 
    path: '/' 
  });
}

export async function logoutDealer() {
  (await cookies()).set(DEALER_COOKIE_NAME, '', { expires: new Date(0), path: '/' });
}

export async function getDealerSession() {
  const session = (await cookies()).get(DEALER_COOKIE_NAME)?.value;
  if (!session) return null;
  try {
    const decrypted = await decrypt(session);
    // Verify it's a dealer session
    if (decrypted.type !== 'dealer') return null;
    return decrypted;
  } catch (error) {
    return null;
  }
}

export async function parseDealerSessionFromRequest(request: NextRequest) {
  const session = request.cookies.get(DEALER_COOKIE_NAME)?.value;
  if (!session) return null;
  try {
    const parsed = await decrypt(session);
    if (parsed.type !== "dealer") return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function updateDealerSession(request: NextRequest) {
  const session = request.cookies.get(DEALER_COOKIE_NAME)?.value;
  if (!session) return;

  try {
    // Refresh dealer session if valid
    const parsed = await decrypt(session);
    
    // Verify it's a dealer session
    if (parsed.type !== 'dealer') return;
    
    parsed.expires = new Date(Date.now() + SESSION_DURATION);
    const res = NextResponse.next();
    res.cookies.set({
      name: DEALER_COOKIE_NAME,
      value: await encrypt(parsed),
      httpOnly: true,
      expires: parsed.expires,
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch (error) {
    // If session is invalid, just ignore it (middleware will handle redirection if needed)
    return;
  }
}

// =====================
// LEGACY FUNCTIONS (for backward compatibility)
// =====================

// Keep old functions for backward compatibility - they default to admin
export async function login(userData: any) {
  return loginAdmin(userData);
}

export async function logout() {
  return logoutAdmin();
}

export async function getSession() {
  return getAdminSession();
}

export async function updateSession(request: NextRequest) {
  return updateAdminSession(request);
}