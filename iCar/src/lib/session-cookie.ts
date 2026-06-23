/** Shared httpOnly session cookie options for admin and dealer auth. */
export function sessionCookieOptions(expires: Date) {
  return {
    expires,
    httpOnly: true,
    sameSite: 'lax' as const,
    path: '/',
    ...(process.env.NODE_ENV === 'production' ? { secure: true } : {}),
  };
}
