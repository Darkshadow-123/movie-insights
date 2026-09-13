import { cookies } from 'next/headers';
import crypto from 'crypto';

const COOKIE_NAME = 'mi_anon_id';

export async function getOrCreateAnonId(): Promise<string> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(COOKIE_NAME);

  if (existingCookie && existingCookie.value) {
    return existingCookie.value;
  }

  // Generate a new anonymous ID
  const newId = crypto.randomUUID();
  
  // Set the cookie
  cookieStore.set(COOKIE_NAME, newId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: '/',
  });

  return newId;
}

export async function getAnonId(): Promise<string | null> {
  const cookieStore = await cookies();
  const existingCookie = cookieStore.get(COOKIE_NAME);
  return existingCookie?.value || null;
}
