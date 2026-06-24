/** Use Secure cookies only over HTTPS (or when explicitly enabled). */
function shouldUseSecureCookies(): boolean {
  if (process.env.COOKIE_SECURE === 'true') return true;
  if (process.env.COOKIE_SECURE === 'false') return false;

  const appUrl =
    process.env.APP_URL || process.env.NEXT_PUBLIC_APP_URL || '';
  return appUrl.startsWith('https://');
}

/** Shared httpOnly session cookie options for admin and dealer auth. */
export function sessionCookieOptions(expires: Date) {
  return {
    expires,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    ...(shouldUseSecureCookies() ? { secure: true } : {}),
  };
}
