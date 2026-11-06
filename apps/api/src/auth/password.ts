import { createHash } from 'node:crypto';
import argon2 from 'argon2';

export function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, { type: argon2.argon2id });
}

export async function verifyPassword(hash: string, plain: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plain);
  } catch {
    return false;
  }
}

/** Verified against when the email is unknown, so login timing doesn't reveal which emails exist. */
export const DUMMY_PASSWORD_HASH: Promise<string> = hashPassword('folio-dummy-password');

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
